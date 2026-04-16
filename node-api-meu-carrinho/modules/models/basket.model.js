const { getDb } = require("../../db/conn");

const BasketModel = {
  addItem: (uuid, product, quantity, unit_price, product_image, cb) => {
    const db = getDb();
    db.run(
      `INSERT INTO itens_cesta (uuid_usuario, produto, quantidade, valor_unitario, produto_imagem) VALUES (?, ?, ?, ?, ?)`,
      [uuid, product, quantity, unit_price, product_image],
      function (err) {
        cb(err, this?.lastID);
      },
    );
  },

  listItems: (uuid, cb) => {
    const db = getDb();
    db.all(`SELECT * FROM itens_cesta WHERE uuid_usuario = ?`, [uuid], cb);
  },

  updateItem: (uuid, id, product, quantity, unit_price, cb) => {
    const db = getDb();
    db.run(
      `UPDATE itens_cesta SET produto = ?, quantidade = ?, valor_unitario = ? WHERE id = ? AND uuid_usuario = ?`,
      [product, quantity, unit_price, id, uuid],
      cb,
    );
  },

  removeItem: (uuid, id, cb) => {
    const db = getDb();
    db.run(
      `DELETE FROM itens_cesta WHERE id = ? AND uuid_usuario = ?`,
      [id, uuid],
      cb,
    );
  },

  clearBasket: (uuid, cb) => {
    const db = getDb();
    db.run(`DELETE FROM itens_cesta WHERE uuid_usuario = ?`, [uuid], cb);
  },
};

module.exports = BasketModel;
