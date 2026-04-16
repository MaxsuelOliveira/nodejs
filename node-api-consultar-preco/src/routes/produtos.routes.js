import { Router } from 'express';
import { getSugestao, getProdutoPorGtin } from '../controllers/produtos.controller.js';

const router = Router();

// GET /produtos/sugestao/ABACAXI
router.get('/sugestao/:item', getSugestao);

// GET /produtos/gtin/:gtin/:latitude/:longitude/:horas?/:raio?/:precomax?/:precomin?/:ordenar?/:pagina?
router.get('/produtos/gtin/:gtin/:latitude/:longitude', getProdutoPorGtin);

export default router;
