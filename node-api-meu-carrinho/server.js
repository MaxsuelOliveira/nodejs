const express = require("express");
const basketRoutes = require("./modules/routes/routes");

const { swaggerUi, specs } = require("./swagger");

const app = express();
app.use(express.json());

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

app.get("/", (req, res) => {
  res.json({
    message: "API da Cesta está funcionando!",
    version: "1.0.0",
  });
});

app.use("/cesta", basketRoutes);

const PORT = 3020 || 3021;

app.listen(PORT, () => {
  console.log(`ONLINE -> http://localhost:${PORT}`);
});
