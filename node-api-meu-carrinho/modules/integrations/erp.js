const axios = require("axios");

/**
 * Função para buscar produtos por ID em um ou mais endpoints de ERP.
 * @param {Array<string>} productIds - Lista de IDs dos produtos.
 * @param {Array<string>} erpUrls - Lista de URLs dos ERPs a serem consultados.
 * @returns {Promise<Array>} Lista de produtos encontrados.
 */
async function fetchProductsById(productIds, erpUrls) {
  const results = [];
  for (const url of erpUrls) {
    try {
      // Exemplo: GET {url}/produtos?ids=1,2,3
      const response = await axios.get(`${url}/produtos`, {
        params: { ids: productIds.join(",") },
      });
      if (Array.isArray(response.data)) {
        results.push(...response.data);
      }
    } catch (err) {
      // Loga erro mas continua tentando outros ERPs
      console.error(
        `[ERP Integration] Erro ao buscar produtos em ${url}:`,
        err.message,
      );
    }
  }
  // Remove duplicados por id
  const unique = {};
  for (const prod of results) {
    unique[prod.id] = prod;
  }
  return Object.values(unique);
}

module.exports = { fetchProductsById };
