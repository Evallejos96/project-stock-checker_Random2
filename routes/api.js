/*
*
*
*       Complete the API routing below
*
*
*/

'use strict';

const mongoose = require('mongoose');
const request = require('request-promise-native');

const stockSchema = new mongoose.Schema({
  code: String,
  likes: { type: [String], default: [] }
});

const Stock = mongoose.model('stock', stockSchema);

// Guardar stock y likes
function saveStock(code, like, ip) {
  return Stock.findOne({ code: code })
    .then(stock => {
      if (!stock) {
        const newStock = new Stock({ code: code, likes: like ? [ip] : [] });
        return newStock.save();
      } else {
        if (like && !stock.likes.includes(ip)) {
          stock.likes.push(ip);
        }
        return stock.save();
      }
    });
}

// Parsear resultados
function parseData(data) {
  const stockData = [];
  const likesArr = [];

  for (let i = 0; i < data.length; i += 2) {
    const stock = { stock: data[i].code, price: parseFloat(data[i + 1]) };
    likesArr.push(data[i].likes.length);
    stockData.push(stock);
  }

  if (likesArr.length > 1) {
    stockData[0].rel_likes = likesArr[0] - likesArr[1];
    stockData[1].rel_likes = likesArr[1] - likesArr[0];
  } else {
    stockData[0].likes = likesArr[0];
    return stockData[0];
  }

  return stockData;
}

module.exports = function(app) {

  app.route('/api/stock-prices')
    .get(async function(req, res) {
      try {
        let codes = req.query.stock || '';
        if (!Array.isArray(codes)) codes = [codes];

        const ip = req.ip;
        const like = req.query.like === 'true' || req.query.like === true;

        const promises = [];

        for (let code of codes) {
          const upperCode = code.toUpperCase();
          // Guardar likes en DB
          promises.push(saveStock(upperCode, like, ip));
          // Obtener precio del proxy FCC
          const url = `https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${upperCode}/quote`;
          promises.push(request({ uri: url, json: true }).then(res => res.latestPrice));
        }

        const results = await Promise.all(promises);
        const stockData = parseData(results);

        res.json({ stockData });

      } catch (err) {
        console.error(err);
        res.json({ error: 'external source error' });
      }
    });

};
