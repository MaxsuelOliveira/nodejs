// npm init -y
// npm install axios <outras-dependencias-de-traducao>

const axios = require('axios');

async function buscarNoChatGPT(mensagem) {
  const apiKey = 'sua-chave-de-api-do-chatgpt'; // Substituir com sua chave de API do ChatGPT
  const model = 'gpt-3.5-turbo'; // Versão do modelo do ChatGPT a ser usada
  const tradutorApiKey = 'sua-chave-de-api-de-traducao'; // Substituir com sua chave de API da API de tradução
  const tradutorEndpoint = 'https://api.exemplo.com/traducao'; // Substituir com o endpoint da API de tradução que você escolheu
  
  try {
    // Faz a solicitação para a API do ChatGPT
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      messages: [{ role: 'system', content: 'Você: ' + mensagem }],
      model,
      api_key: apiKey
    });
    
    const resposta = response.data.choices[0].message.content;
    
    // Faz a solicitação para a API de tradução
    const traducao = await axios.post(tradutorEndpoint, {
      texto: resposta,
      api_key: tradutorApiKey,
      de: 'en', // Idioma de origem (inglês)
      para: 'pt' // Idioma de destino (português)
    });
    
    const respostaTraduzida = traducao.data.textoTraduzido;
    
    console.log('Resposta traduzida:', respostaTraduzida);
  } catch (error) {
    console.error('Erro na solicitação:', error);
  }
}

// Exemplo de uso da função
buscarNoChatGPT('Qual é o clima de hoje?');