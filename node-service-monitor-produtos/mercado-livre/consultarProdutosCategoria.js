const request = require('request');
const cheerio = require('cheerio');

const category = 'technology'; // Categoria desejada na AliExpress
const url = `https://www.aliexpress.com/wholesale?SearchText=${category}`;

request(url, (error, response, body) => {
  if (!error && response.statusCode === 200) {
    const $ = cheerio.load(body);
    
    const products = [];
    
    $('div.item').each((index, element) => {
      if (index < 10) { // Limita a 10 produtos
        const title = $(element).find('a.product-title').text().trim();
        const price = $(element).find('span.value').text().trim();
        const currency = $(element).find('span.currency-symbol').text().trim();
        const image = $(element).find('img.product-image').attr('src').trim();
        
        const product = {
          title,
          price: `${price} ${currency}`,
          image
        };
        
        products.push(product);
      }
    });
    
    console.log('Top 10 produtos de Tecnologia na AliExpress:');
    console.log(products);
  } else {
    console.error('Erro na solicitação:', error);
  }
});