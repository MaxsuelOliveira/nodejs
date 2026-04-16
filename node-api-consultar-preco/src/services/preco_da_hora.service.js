import PrecoDaHora from 'precodahora-api';
const client = new PrecoDaHora();

export default {
  sugestao: (item) => client.sugestao({ item }),
  produto: (params) => client.produto(params),
};
