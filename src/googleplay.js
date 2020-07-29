import axios from 'axios';
import cheerio from 'cheerio';
import moment from 'moment-timezone';

const getAppInfo = async (id) => {
  const app = {};
  app.appId = id;
  app.marketType = 'GP';

  const html = await axios({
    method: 'get',
    url: `https://play.google.com/store/apps/details?id=${id}&hl=ko`,
  });
  const $ = cheerio.load(html.data);

  const objArray = $('script');
  for (let i in objArray) {
    try {
      let obj = objArray[i].children[0].data;

      if (!obj.startsWith('AF_initDataCallback({key'))
        continue;

      obj = obj.replace('AF_initDataCallback(', '');
      obj = obj.substring(0, obj.length - 2);
      obj = eval(`(${obj})`);

      if (!obj)
        continue;

      switch (obj.key) {
        case 'ds:3':
          // eslint-disable-next-line no-case-declarations
          const ds3 = obj.data[0];
          // eslint-disable-next-line no-case-declarations
          const priceString = ds3[2][0]
            ? (ds3[2][0][0][0][1][0][2] === ''
              ? '0' : ds3[2][0][0][0][1][0][2])
            : null;
          app.price = priceString ? parseInt(priceString.match(/\d/g).join('')) : null;
          // app.priceCurrency = app.price > 0 ? ds3[2][0][0][0][1][0][1] : null;
          break;

        case 'ds:5':
          // eslint-disable-next-line no-case-declarations
          const ds5 = obj.data[0];
          app.name = ds5[0][0];
          app.description = ds5[10][0][1];
          app.summary = ds5[10][1][1];
          app.screenshots = ds5[12][0].map((v) => v[3][2]);
          app.logo = ds5[12][1][3][2];
          app.youtube = ds5[12][3] ? `https://www.youtube.com/watch?v=${ds5[12][3][0][2]}` : null;
          app.contentRating = ds5[12][4][0];
          app.company = ds5[12][5][1] || null;
          app.email = ds5[12][5][2] ? ds5[12][5][2][0] : null;
          app.website = ds5[12][5][3] ? ds5[12][5][3][5][2] : null;
          app.address = ds5[12][5][4] ? ds5[12][5][4][0] : null;
          app.updateNote = ds5[12][6] ? ds5[12][6][1] : null;
          app.appUpdatedAt = moment(new Date(ds5[12][8][0] * 1000)).tz('Asia/Seoul').format('YYYY-MM-DD');
          app.installs = ds5[12][9][1] ? ds5[12][9][2] : null;
          app.category = ds5[12][13][0][2].startsWith('GAME_') ? '게임' : ds5[12][13][0][0];
          app.appCreatedAt = ds5[12][36] ? moment(new Date(ds5[12][36])).tz('Asia/Seoul').format('YYYY-MM-DD') : null;
          break;

        case 'ds:6':
          // eslint-disable-next-line no-case-declarations
          const ds6 = obj.data[0];
          app.rating = ds6[6] ? ds6[6][0][1] : null;
          app.ratingCount = ds6[6] ? ds6[6][2][1] : null;
          app.reviews = (ds6[6] && ds6[6][3]) ? ds6[6][3][1] : null;
          break;

        case 'ds:8':
          // eslint-disable-next-line no-case-declarations
          const ds8 = obj.data;
          app.size = ds8[0] || null;
          app.version = ds8[1] || null;
          app.requiredDevice = ds8[2] || null;
          break;
      }
    } catch {
      // console.log('data is not json format');
    }
  }
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
