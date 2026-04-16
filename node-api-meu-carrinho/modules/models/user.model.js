const { getDb } = require("../../db/conn");

const UserModel = {
  createIfNotExists: (uuid, cb) => {
    const db = getDb();
    db.get(`SELECT * FROM usuarios WHERE uuid = ?`, [uuid], (err, row) => {
      if (err) return cb(err);
      if (row) return cb(null); // já existe

      db.run(`INSERT INTO usuarios (uuid) VALUES (?)`, [uuid], cb);
    });
  },
};

module.exports = UserModel;
