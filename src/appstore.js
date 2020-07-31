import axios from 'axios';
import cheerio from 'cheerio';
import moment from 'moment-timezone';

const getAppInfo = async (id) => {
  const app = {};
  app.appId = id;
  app.marketType = 'AS';

  const html = await axios({
    method: 'get',
    url: `https://apps.apple.com/kr/app/id${id}`,
  });

  const $ = cheerio.load(html.data);

  const obj = $('script')[0].children[0].data;
  const objJson = eval(`(${obj})`);
  app.name = objJson.name || null;
  app.description = objJson.description || null;
  app.screenshots = objJson.screenshot || null;
  app.logo = objJson.image.replace('1200x630wa.png', '230x0w.png') || null;
  app.category = objJson.applicationCategory || null;
  app.appPublishedAt = moment(new Date(objJson.datePublished.replace('년','').replace('월','').replace('일','')))
    .tz('Asia/Seoul').format('YYYY-MM-DD') || null;
  app.company = objJson.author.name || null;
  app.rating = objJson.aggregateRating.ratingValue || null;
  app.ratingCount = objJson.aggregateRating.reviewCount || null;
  app.price = objJson.offers.price;

  const mainDom = $(`.animation-wrapper`).children().eq(1);
  const updateDom = mainDom.children('section').eq(3);
  const informationDom = mainDom.children('section').eq(5);
  const websiteDom = mainDom.children('section').eq(6);

  let appUpdatedAt = updateDom.find('.whats-new__content > div:nth-child(1) > div > time').attr('datetime') || null;
  app.appUpdatedAt = (appUpdatedAt) ? appUpdatedAt.substring(0, appUpdatedAt.indexOf('T')) : null;
  app.version = updateDom.find('.whats-new__content > div:nth-child(1) > div > p').text()
    .replace('버전 ', '') || null;
  app.updateNote = updateDom.find('.whats-new__content > div:nth-child(2) > div > p').text() || null;

  app.size = informationDom.find('.information-list--app').children('div').eq(1).find('dd').text() || null;
  app.requiredDevice = informationDom.find('.information-list--app').children('div').eq(3).find('dd > p').text().split(' 버전')[0] || null;
  app.contentRating = parseInt(informationDom.find('.information-list--app').children('div').eq(5).find('dd').text()
    .replace('+', ''), 10) || null;

  app.website = websiteDom.find('ul > li:nth-child(1) > a').attr('href') || null;

  return app;
};

export const handler = async (event) => {
  const { id } = event.queryStringParameters;
  const result = await getAppInfo(id);

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: JSON.stringify({ result }),
  };
};
