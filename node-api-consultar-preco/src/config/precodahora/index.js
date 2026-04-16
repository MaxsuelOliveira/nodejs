const { Cookie } = require('tough-cookie');
const userAgentWithoutSeed = require('useragent-from-seed');
const axios = require('axios');
const HTMLParser = require('node-html-parser');
const querystring = require('querystring');

const config = require('./config');
const isRequired = parameter => {
  throw new Error(`Missing ${parameter} required attribute`);
};

class PrecoDaHora {
  constructor() {
    const userAgent = userAgentWithoutSeed();

    const requestOptions = {};

    requestOptions.baseURL = config.baseUrl;
    requestOptions.headers = {
      Accept: '*/*',
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      Connection: 'keep-alive',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      Origin: config.baseUrl,
      Referer: config.baseUrl,
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
      'User-Agent': userAgent,
      'X-CSRFToken': '',
      'X-Requested-With': 'XMLHttpRequest',
    };
    requestOptions.xsrfCookieName = 'X-CSRFToken';

    this.requestOptions = requestOptions;
    this.request = axios.create(requestOptions);
  }

  async _getCookiesAndCsrfToken({ page }) {
    const response = await this.request.get(page);

    const responseDataParsed = HTMLParser.parse(response.data);

    const cookies = response.headers['set-cookie']
      .map(cookie => Cookie.parse(cookie))
      .map(cookie => `${cookie.key}=${cookie.value}; `);

    return {
      csrfToken: responseDataParsed.querySelector('#validate').getAttribute('data-id'),
      cookies: cookies.join(''),
    };
  }

  async _setCookiesAndCsrfToken({ csrfToken, cookies }) {
    this.request.defaults.headers['X-CSRFToken'] = csrfToken;
    this.request.defaults.headers.Cookie = cookies;
  }

  async _retryRequest(fn, args, retries = 5, delayMs = 1500) {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        return await fn.apply(this, args);
      } catch (error) {
        if (error.response && error.response.status === 401) {
          if (attempt < retries - 1) {
            // Re-obtem cookies e token antes de tentar novamente
            await this._setCookiesAndCsrfToken(
              await this._getCookiesAndCsrfToken({ page: '/' })
            );
            await new Promise(resolve => setTimeout(resolve, delayMs));
            continue;
          }
          // Se estourar as tentativas, lança o erro
          throw new Error('Acesso não autorizado após múltiplas tentativas (401)');
        }
        throw error; // Outros erros, lança direto
      }
    }
  }

  async sugestao({ item = isRequired('item') }) {
    await this._setCookiesAndCsrfToken(await this._getCookiesAndCsrfToken({ page: '/' }));

    // Usamos _retryRequest para o post, passamos a função e os parâmetros
    return this._retryRequest(this.request.post, ['/sugestao/', `item=${item}`]);
  }

  async produto({
    termo = '',
    gtin = isRequired('gtin'),
    cnpj = '',
    horas = 72,
    anp = '',
    codmun = '',
    latitude = isRequired('latitude'),
    longitude = isRequired('longitude'),
    raio = 15,
    precomax = 0,
    precomin = 0,
    pagina = 1,
    ordenar = 'preco.asc',
    categorias = '',
    processo = 'carregar',
    totalCategorias = '',
    totalRegistros = 0,
    totalPaginas = 0,
    pageview = 'lista',
  }) {
    await this._setCookiesAndCsrfToken(await this._getCookiesAndCsrfToken({ page: '/produtos/' }));

    const parameters = querystring.stringify({
      termo,
      gtin,
      cnpj,
      horas,
      anp,
      codmun,
      latitude,
      longitude,
      raio,
      precomax,
      precomin,
      pagina,
      ordenar,
      categorias,
      processo,
      totalCategorias,
      totalRegistros,
      totalPaginas,
      pageview,
    });

    return this._retryRequest(this.request.post, ['/produtos/', parameters]);
  }
}

module.exports = PrecoDaHora;
