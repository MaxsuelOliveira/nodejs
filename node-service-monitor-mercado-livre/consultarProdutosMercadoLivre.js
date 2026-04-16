const axios = require('axios');

async function monitorarProdutos() {
  const categoriaId = 'MLB1051'; // Substituir com o ID da categoria de tecnologia do Mercado Livre
  const limit = 10; // Número máximo de produtos para monitorar
  
  try {
    const response = await axios.get(`https://api.mercadolibre.com/sites/MLB/search?category=${categoriaId}&limit=${limit}`);
    
    const produtos = response.data.results;
    
    console.log('Lista de produtos:');
    
    produtos.forEach((produto, index) => {
      console.log(`Produto #${index + 1}:`);
      console.log('Título:', produto.title);
      console.log('Preço:', produto.price, produto.currency_id);
      console.log('Link:', produto.permalink);
      console.log('---');
    });
  } catch (error) {
    console.error('Erro na solicitação:', error);
  }
}

monitorarProdutos();