const express = require("express");
const router = express.Router();
const BasketController = require("../controllers/basket.controller");

/**
 * @swagger
 * tags:
 *   name: Cesta
 *   description: Operações de cesta de produtos
 */

/**
 * @swagger
 * /cesta/{uuid}/adicionar:
 *   post:
 *     summary: Adiciona item à cesta
 *     tags: [Cesta]
 *     parameters:
 *       - in: path
 *         name: uuid
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID do usuário
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               produto:
 *                 type: string
 *               quantidade:
 *                 type: integer
 *               valor_unitario:
 *                 type: number
 *               produto_imagem:
 *                 type: string
 *     responses:
 *       200:
 *         description: Item adicionado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 mensagem:
 *                   type: string
 */
router.post("/:uuid/adicionar", BasketController.add);

/**
 * @swagger
 * /cesta/{uuid}:
 *   get:
 *     summary: Lista itens da cesta
 *     tags: [Cesta]
 *     parameters:
 *       - in: path
 *         name: uuid
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID do usuário
 *     responses:
 *       200:
 *         description: Lista de itens
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
router.get("/:uuid", BasketController.list);

/**
 * @swagger
 * /cesta/{uuid}/{id}:
 *   put:
 *     summary: Atualiza item da cesta
 *     tags: [Cesta]
 *     parameters:
 *       - in: path
 *         name: uuid
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID do usuário
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do item
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               produto:
 *                 type: string
 *               quantidade:
 *                 type: integer
 *               valor_unitario:
 *                 type: number
 *     responses:
 *       200:
 *         description: Item atualizado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensagem:
 *                   type: string
 */
router.put("/:uuid/:id", BasketController.update);

/**
 * @swagger
 * /cesta/{uuid}/{id}:
 *   delete:
 *     summary: Remove item específico da cesta
 *     tags: [Cesta]
 *     parameters:
 *       - in: path
 *         name: uuid
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID do usuário
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do item
 *     responses:
 *       200:
 *         description: Item removido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensagem:
 *                   type: string
 */
router.delete("/:uuid/:id", BasketController.remove);

/**
 * @swagger
 * /cesta/{uuid}:
 *   delete:
 *     summary: Esvazia toda a cesta
 *     tags: [Cesta]
 *     parameters:
 *       - in: path
 *         name: uuid
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID do usuário
 *     responses:
 *       200:
 *         description: Cesta esvaziada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensagem:
 *                   type: string
 */
router.delete("/:uuid", BasketController.clear);

module.exports = router;
