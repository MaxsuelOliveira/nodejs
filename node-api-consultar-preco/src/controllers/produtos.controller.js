import precoService from "../services/preco_da_hora.service.js";

export async function getSugestao(req, res) {
  try {
    const { item } = req.params;
    if (!item) return res.status(400).json({ error: "Item é obrigatório" });

    const response = await precoService.sugestao(item);

    if (response?.data?.codigo === 80) {
      res.json(response.data.resultado);
    } else {
      res.status(500).json({ error: "Erro ao buscar sugestão" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getProdutoPorGtin(req, res) {
  try {
    const { gtin, latitude, longitude } = req.params;

    const {
      horas = 72,
      raio = 15,
      precomax = 0,
      precomin = 0,
      ordenar = "preco.asc",
      pagina = 1,
    } = req.query;

    if (!gtin || !latitude || !longitude) {
      return res
        .status(400)
        .json({ error: "GTIN, latitude e longitude são obrigatórios" });
    }

    const response = await precoService.produto({
      gtin,
      latitude,
      longitude,
      horas,
      raio,
      precomax,
      precomin,
      ordenar,
      pagina,
    });

    if (response?.data?.codigo === 80) {
      console.log("Dados do produto:", response.data);

      res.json(response.data.resultado);
    } else {
      console.warn(
        "⚠️ Dados inválidos ou vazios no retorno de produto:",
        response.data
      );
      console.error("Erro ao buscar produto:", response.data);
      res.status(500).json({ error: "Erro ao buscar produto" });
    }
  } catch (error) {
    console.error("Erro ao buscar produto:", error);
    res.status(500).json({ error: error.message });
  }
}
