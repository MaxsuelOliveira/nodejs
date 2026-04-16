const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Meu Carrinho API",
      version: "1.0.0",
      description: "Documentação da API de Carrinho Universal com Node.js e SQLite",
    },
    servers: [
      {
        url: "http://localhost:3020",
      },
    ],
  },
  apis: ["./routes/carrinho.routes.js"],
};

const specs = swaggerJsdoc(options);

module.exports = { swaggerUi, specs };
