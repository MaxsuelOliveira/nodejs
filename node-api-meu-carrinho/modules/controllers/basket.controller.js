
const User = require("../models/user.model");
const Basket = require("../models/basket.model");


// Controller da Cesta (Basket Controller)
module.exports = {
  add: (req, res) => {
    const { uuid } = req.params;
    const { product, quantity, unit_price, product_image } = req.body;

    User.createIfNotExists(uuid, (err) => {
      if (err) return res.status(500).json({ erro: err.message });

      Basket.addItem(uuid, product, quantity, unit_price, product_image, (err, id) => {
        if (err) return res.status(500).json({ erro: err.message });
        res.json({ id, mensagem: "Item adicionado à cesta." });
      });
    });
  },

  list: (req, res) => {
    const { uuid } = req.params;
    Basket.listItems(uuid, (err, rows) => {
      if (err) return res.status(500).json({ erro: err.message });
      res.json(rows);
    });
  },

  update: (req, res) => {
    const { uuid, id } = req.params;
    const { product, quantity, unit_price } = req.body;

    Basket.updateItem(uuid, id, product, quantity, unit_price, (err) => {
      if (err) return res.status(500).json({ erro: err.message });
      res.json({ mensagem: "Item atualizado." });
    });
  },

  remove: (req, res) => {
    const { uuid, id } = req.params;
    Basket.removeItem(uuid, id, (err) => {
      if (err) return res.status(500).json({ erro: err.message });
      res.json({ mensagem: "Item removido." });
    });
  },

  clear: (req, res) => {
    const { uuid } = req.params;
    Basket.clearBasket(uuid, (err) => {
      if (err) return res.status(500).json({ erro: err.message });
      res.json({ mensagem: "Cesta esvaziada." });
    });
  }
};
