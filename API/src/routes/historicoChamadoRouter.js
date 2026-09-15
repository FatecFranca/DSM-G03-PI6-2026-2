// src/routes/historicoChamadoRouter.js
const express = require('express');
const historicoChamadoController = require('../controllers/historicoChamadoController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Todas as rotas de atividade exigem autenticação
router.use(authMiddleware);

/**
 * @openapi
 * /historicochamado/chamado/{chamadoId}:
 *   get:
 *     summary: Lista histórico de ações de um chamado
 *     description: Retorna todas as ações registradas em um chamado específico. Requer autenticação.
 *     tags:
 *       - Historico
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chamadoId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do chamado
 *       - in: query
 *         name: ordem
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Ordem das ações por data (ascendente ou descendente)
 *     responses:
 *       200:
 *         description: Sucesso ao listar ações
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/HistoricoChamado'
 *                 total:
 *                   type: integer
 *                 chamado:
 *                   type: object
 *                   properties:
 *                     ChamadoId:
 *                       type: string
 *                     ChamadoTitulo:
 *                       type: string
 *                     ChamadoStatus:
 *                       type: string
 *       403:
 *         description: Você não tem permissão para visualizar as atividades deste chamado
 *       404:
 *         description: Chamado não encontrado
 */
router.get('/chamado/:chamadoId', historicoChamadoController.historicoPorChamado);

module.exports = router;