const sqlite3 = require("sqlite3").verbose();
let db = null;

/**
 * Abre uma nova conexão com o banco de dados.
 * @param {string} [dbPath] Caminho do arquivo do banco de dados.
 */
function openConnection(dbPath = "./db/basketV1.db") {
  if (db) return db;
  db = new sqlite3.Database(dbPath);
  return db;
}

/**
 * Fecha a conexão atual com o banco de dados.
 */
function closeConnection() {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Reabre a conexão com o banco de dados.
 * @param {string} [dbPath] Caminho do arquivo do banco de dados.
 */
function reopenConnection(dbPath = "./db/basketV1.db") {
  closeConnection();
  return openConnection(dbPath);
}

/**
 * Retorna a instância atual do banco de dados (abre se necessário).
 */
function getDb(dbPath = "./db/basketV1.db") {
  if (!db) openConnection(dbPath);
  return db;
}

module.exports = {
  openConnection,
  closeConnection,
  reopenConnection,
  getDb,
};
