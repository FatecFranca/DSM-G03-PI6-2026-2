// src/routes/atividadeSolicitacaoRouter.js
const express = require('express');
const atividadeSolicitacaoController = require('../controllers/atividadeSolicitacaoController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Todas as rotas exigem autenticação
router.use(authMiddleware);

/**
 * @openapi
 * /solicitacao/{id}/atividades:
 *   post:
 *     summary: Adiciona uma atividade a uma solicitação
 *     description: Adiciona uma nova atividade ao histórico da solicitação.
 *     tags:
 *       - AtividadesSolicitacao
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da solicitação
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - AtividadeSolicitacaoDescricao
 *             properties:
 *               AtividadeSolicitacaoDescricao:
 *                 type: string
 *                 description: Descrição da atividade
 *     responses:
 *       201:
 *         description: Atividade adicionada com sucesso
 *       400:
 *         description: Dados inválidos ou solicitação finalizada
 *       403:
 *         description: Sem permissão
 *       404:
 *         description: Solicitação não encontrada
 */
router.post('/solicitacao/:id', atividadeSolicitacaoController.adicionarAtividade);

/**
 * @openapi
 * /solicitacao/{id}/atividades:
 *   get:
 *     summary: Lista atividades de uma solicitação
 *     description: Retorna todas as atividades de uma solicitação específica.
 *     tags:
 *       - AtividadesSolicitacao
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da solicitação
 *       - in: query
 *         name: pagina
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limite
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Lista de atividades
 *       403:
 *         description: Sem permissão
 *       404:
 *         description: Solicitação não encontrada
 */
router.get('/solicitacao/:id/atividades', atividadeSolicitacaoController.listarAtividadesPorSolicitacao);

/**
 * @openapi
 * /atividades/{id}:
 *   get:
 *     summary: Busca atividade por ID
 *     description: Retorna os detalhes de uma atividade específica.
 *     tags:
 *       - AtividadesSolicitacao
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da atividade
 *     responses:
 *       200:
 *         description: Detalhes da atividade
 *       404:
 *         description: Atividade não encontrada
 */
router.get('/:id', atividadeSolicitacaoController.buscarAtividadePorId);

/**
 * @openapi
 * /atividades/{id}:
 *   put:
 *     summary: Altera uma atividade
 *     description: Altera a descrição de uma atividade existente.
 *     tags:
 *       - AtividadesSolicitacao
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da atividade
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - AtividadeSolicitacaoDescricao
 *             properties:
 *               AtividadeSolicitacaoDescricao:
 *                 type: string
 *                 description: Nova descrição da atividade
 *     responses:
 *       200:
 *         description: Atividade atualizada com sucesso
 *       400:
 *         description: Dados inválidos
 *       403:
 *         description: Sem permissão
 *       404:
 *         description: Atividade não encontrada
 */
router.put('/:id', atividadeSolicitacaoController.alterarAtividade);

/**
 * @openapi
 * /atividades/{id}:
 *   delete:
 *     summary: Exclui uma atividade
 *     description: Exclui uma atividade do histórico da solicitação (apenas admin/gestor).
 *     tags:
 *       - AtividadesSolicitacao
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da atividade
 *     responses:
 *       200:
 *         description: Atividade excluída com sucesso
 *       403:
 *         description: Sem permissão
 *       404:
 *         description: Atividade não encontrada
 */
router.delete('/:id', atividadeSolicitacaoController.excluirAtividade);

module.exports = router;