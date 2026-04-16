const request = require('request');
const cheerio = require('cheerio');

const productId = 'XXXXXXXXX'; // Substituir com o ID do produto do AliExpress

const url = `https://www.aliexpress.com/item/${productId}`;

request(url, (error, response, body) => {
  if (!error && response.statusCode === 200) {
    const $ = cheerio.load(body);
    
    const title = $('h1.product-title-text').text().trim();
    const price = $('span.product-price-value').text().trim();
    const currency = $('span.product-price-symbol').text().trim();
    const description = $('div.product-description').text().trim();
    
    console.log('Título:', title);
    console.log('Preço:', price, currency);
    console.log('Descrição:', description);
  } else {
    console.error('Erro na solicitação:', error);
  }
});