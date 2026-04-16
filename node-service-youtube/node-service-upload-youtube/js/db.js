const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./videos.db');

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS videos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hash TEXT UNIQUE,
        titulo TEXT,
        descricao TEXT,
        setor TEXT,
        categoria TEXT,
        data_upload TEXT
    )`);
});

module.exports = db;
