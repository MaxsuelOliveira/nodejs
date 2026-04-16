import axios from "axios";
import { Router } from "express";
const router = Router();

const LATITUDE = -12.973;
const LONGITUDE = -38.502;

const cesta = [
  { produto: "Arroz 5kg", gtin: "7896004000649", quantidade: 1 },
  { produto: "Feijão 1kg", gtin: "7896004701317", quantidade: 1 },
  { produto: "Açúcar 1kg", gtin: "7891000055129", quantidade: 1 },
  { produto: "Café 500g", gtin: "7894900720013", quantidade: 1 },
  { produto: "Leite 1L", gtin: "7891025111113", quantidade: 2 },
  { produto: "Óleo de soja 900ml", gtin: "7894900011517", quantidade: 1 },
  { produto: "Farinha de trigo 1kg", gtin: "7891095000250", quantidade: 1 },
  { produto: "Sal 1kg", gtin: "7891910000197", quantidade: 1 },
  { produto: "Macarrão 500g", gtin: "7896004003459", quantidade: 1 },
  { produto: "Extrato de tomate", gtin: "7891000249931", quantidade: 1 },
  { produto: "Sabão em barra (5 un)", gtin: "7891026000157", quantidade: 1 },
];

// Cache em memória para GTINs já consultados
const cacheGTIN = new Map();

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function buscarGTINComRetry(produto, tentativas = 3, delayMs = 1500) {
  for (let i = 0; i < tentativas; i++) {
    try {
      const url = `http://localhost:3000/sugestao/${produto}`;
      console.log(`🔍 Tentando buscar GTIN para produto "${produto}" - tentativa ${i + 1}`);
      const res = await axios.get(url);
      console.log(`✅ Resposta para "${produto}":`, res.data);

      if (Array.isArray(res.data) && res.data.length > 0) {
        return res.data[0].gtin || null;
      }
      return null;
    } catch (err) {
      if (err.response && err.response.status === 404) {
        console.warn(`⚠️ Produto "${produto}" não encontrado (404) - tentativa ${i + 1}`);
        if (i < tentativas - 1) {
          await delay(delayMs);
          continue;
        }
        return null;
      } else {
        console.error(`❌ Erro inesperado ao buscar GTIN para "${produto}":`, err.message);
        return null;
      }
    }
  }
  return null;
}

async function buscarGTINCache(produto) {
  if (cacheGTIN.has(produto)) {
    console.log(`📦 GTIN cacheado para "${produto}":`, cacheGTIN.get(produto));
    return cacheGTIN.get(produto);
  }
  const gtin = await buscarGTINComRetry(produto);
  cacheGTIN.set(produto, gtin);
  return gtin;
}

async function consultarPrecoPorGTIN(gtin) {
  if (!gtin) return 0;
  try {
    const url = `http://localhost:3000/produtos/gtin/${gtin}/${LATITUDE}/${LONGITUDE}`;
    console.log(`📡 Consultando preço para GTIN ${gtin} na URL: ${url}`);
    const res = await axios.get(url);
    console.log('Resposta do endpoint:', res.data);
    console.log(`📥 Resposta preço para GTIN ${gtin}:`, JSON.stringify(res.data, null, 2));

    if (res.data && Array.isArray(res.data) && res.data.length > 0) {
      return Math.min(
        ...res.data.map((p) =>
          parseFloat(p.produto.precoUnitario || p.produto.precoLiquido || 0)
        )
      );
    } else {
      console.warn('⚠️ Dados inválidos ou vazios no retorno de preços:', res.data);
      return 0;
    }
  } catch (error) {
    console.error(`❌ Erro ao buscar preço para GTIN ${gtin}:`, error.message);
    return 0;
  }
}

async function montarCesta() {
  let total = 0;
  const detalhes = [];

  for (const item of cesta) {
    const gtin = await buscarGTINCache(item.produto);

    if (!gtin) {
      console.warn(`⚠️ GTIN não encontrado para produto: ${item.produto}, pulando...`);
      continue;
    }

    const preco = await consultarPrecoPorGTIN(gtin);
    const subtotal = preco * item.quantidade;

    detalhes.push({
      produto: item.produto,
      gtin,
      quantidade: item.quantidade,
      preco_unitario: preco.toFixed(2),
      subtotal: subtotal.toFixed(2),
    });

    total += subtotal;
  }

  return {
    success: true,
    mensagem: "Cesta consultada com sucesso",
    detalhes,
    total: total.toFixed(2),
  };
}

router.get("/cesta", async (req, res) => {
  try {
    const resultado = await montarCesta();
    res.json(resultado);
  } catch (error) {
    console.error("❌ Erro ao montar cesta:", error.message);
    res.status(500).json({
      success: false,
      mensagem: "Erro ao consultar cesta",
      detalhes: [],
      total: 0,
    });
  }
});

// Montar a minha cesta no sqlite

export default router;
