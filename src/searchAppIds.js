import axios from 'axios';
import cheerio from 'cheerio';

const urlDecoder = (url) => {
  return decodeURIComponent((url + '')
    .replace(/%(?![\da-f]{2})/gi, function() {
      return '%25';
    })
    .replace(/\+/g, '%20'));
};

const getAppStoreAppIdsFromHtml = (html) => {
  const $ = cheerio.load(html.data);
  const allHrefs = $('a').toArray().map((v) => urlDecoder(v.attribs.href));
  const filteredHrefs = allHrefs.filter((v) => v.includes('https://apps.apple.com'));
  const urls = filteredHrefs.map((v) => v.substr(v.indexOf('https://')));
  const filteredUrls = urls.filter((v) => {
    // except mac os app, developer page
    return !v.includes('mt=12') && !v.includes('/developer');
  });
  const ids = filteredUrls.map((v) => v.substr(v.indexOf('/id')).match(/\d+/)[0]);
  const uniqueUrls = ids.filter((v, i, array) => array.indexOf(v) == i);
  return uniqueUrls;
};

const getGooglePlayAppIdsFromHtml = (html) => {
  const $ = cheerio.load(html.data);
  const allHrefs = $('a').toArray().map((v) => urlDecoder(v.attribs.href));
  const filteredHrefs = allHrefs.filter((v) => v.includes('https://play.google.com/store/apps/details?id='));
  const urls = filteredHrefs.map((v) => v.substr(v.indexOf('https://play.google.com/store/apps/details?id=')));
  const ids = urls.map((v) => {
    const url = new URL(v);
    return url.searchParams.get('id');
  });
  const uniqueIds = ids.filter((v, i, array) => array.indexOf(v) == i);
  return uniqueIds;
};

const searchAppIdsByKeyword = async (keyword) => {
  const urlSearchForGP = `https://www.google.com/search?q=${encodeURIComponent(keyword)}+google+play`;
  const urlSearchForAS = `https://www.google.com/search?q=${encodeURIComponent(keyword)}+app+store`;

  const resHtmlGP = await axios({
    method: 'get',
    url: urlSearchForGP,
  });
  const resHtmlAS = await axios({
    method: 'get',
    url: urlSearchForAS,
  });

  const idsGP = getGooglePlayAppIdsFromHtml(resHtmlGP);
  const idsAS = getAppStoreAppIdsFromHtml(resHtmlAS);

  return {
    googlePlay: [
      ...idsGP,
    ],
    appStore: [
      ...idsAS,
    ]
  };
};

export const handler = async (event) => {
  const { keyword } = event.queryStringParameters;
  const result = await searchAppIdsByKeyword(keyword);

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: JSON.stringify(result),
  };
};
