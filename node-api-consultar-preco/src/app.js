import express from "express";
import produtosRoutes from "./routes/produtos.routes.js";
// import cestaRoutes from "src/scripts/consultarCesta.js";

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "API Preço da Hora v1.2",
    status: "ONLINE",
  });
});

app.use("/", produtosRoutes);

// Desabilitar rota de cesta por enquanto
// app.use("/", cestaRoutes);

export default app;
