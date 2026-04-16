const oracledb = require('oracledb');
require('dotenv').config();

try {
  oracledb.initOracleClient({ libDir: '/opt/oracle/instantclient_21_11' });
  console.log('[OracleDB] Modo Thick ativado no Docker');
} catch (err) {
  console.error('[OracleDB] Erro ao iniciar modo Thick:', err);
}

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

const getConnection = async () => {
  try {
    const connection = await oracledb.getConnection({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectString: `${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
    });
    console.log('[OracleDB] Conexão estabelecida.');
    return connection;
  } catch (err) {
    console.error('[OracleDB] Erro ao conectar:', err);
    throw err;
  }
};

module.exports = getConnection;