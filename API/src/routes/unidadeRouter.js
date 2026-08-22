// src/routes/unidadeRouter.js
const express = require('express');
const unidadeController = require('../controllers/unidadeController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

/**
 * @openapi
 * /unidades/{id}:
 *   get:
 *     summary: Busca unidade por ID
 *     description: Retorna os detalhes completos de uma unidade específica. Rota pública (não exige autenticação).
 *     tags:
 *       - Unidades
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da unidade
 *     responses:
 *       200:
 *         description: Sucesso ao buscar unidade
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/UnidadeDetalhada'
 *       400:
 *         description: ID da unidade inválido
 *       404:
 *         description: Unidade não encontrada
 */
router.get('/:id', unidadeController.buscarUnidadePorId);

// Todas as rotas abaixo exigem autenticação
router.use(authMiddleware);

/**
 * @openapi
 * /unidades:
 *   get:
 *     summary: Lista unidades
 *     description: Retorna lista de unidades com filtros e paginação. Apenas administradores. Requer autenticação.
 *     tags:
 *       - Unidades
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ATIVA, INATIVA, BLOQUEADA]
 *         description: Filtra por status
 *       - in: query
 *         name: pagina
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número da página
 *       - in: query
 *         name: limite
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Itens por página
 *     responses:
 *       200:
 *         description: Sucesso ao listar unidades
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UnidadeResumo'
 *                 paginacao:
 *                   $ref: '#/components/schemas/Paginacao'
 *       403:
 *         description: Apenas administradores podem acessar esta rota
 */
router.get('/', unidadeController.listarUnidades);

/**
 * @openapi
 * /unidades:
 *   post:
 *     summary: Cadastra nova unidade
 *     description: Cadastra uma nova unidade. Apenas administradores. Requer autenticação.
 *     tags:
 *       - Unidades
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - UnidadeNome
 *             properties:
 *               UnidadeNome:
 *                 type: string
 *                 description: Nome da unidade
 *               UnidadeStatus:
 *                 type: string
 *                 enum: [ATIVA, INATIVA, BLOQUEADA]
 *                 default: ATIVA
 *                 description: Status da unidade (opcional)
 *     responses:
 *       201:
 *         description: Unidade cadastrada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Unidade'
 *       400:
 *         description: Dados inválidos ou faltando
 *       403:
 *         description: Apenas administradores podem cadastrar unidades
 *       409:
 *         description: Já existe uma unidade com este nome
 */
router.post('/', unidadeController.cadastrarUnidade);

/**
 * @openapi
 * /unidades/{id}:
 *   put:
 *     summary: Altera unidade
 *     description: Altera os dados de uma unidade. Apenas administradores. Requer autenticação.
 *     tags:
 *       - Unidades
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da unidade
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               UnidadeNome:
 *                 type: string
 *                 description: Nome da unidade
 *               UnidadeStatus:
 *                 type: string
 *                 enum: [ATIVA, INATIVA, BLOQUEADA]
 *                 description: Status da unidade
 *     responses:
 *       200:
 *         description: Unidade atualizada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Unidade'
 *       400:
 *         description: Dados inválidos ou ID inválido
 *       403:
 *         description: Apenas administradores podem alterar unidades
 *       404:
 *         description: Unidade não encontrada
 *       409:
 *         description: Já existe outra unidade com este nome
 */
router.put('/:id', unidadeController.alterarUnidade);

/**
 * @openapi
 * /unidades/{id}/status:
 *   patch:
 *     summary: Altera status da unidade
 *     description: Altera apenas o status da unidade (ATIVA, INATIVA, BLOQUEADA). Apenas administradores. Requer autenticação.
 *     tags:
 *       - Unidades
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da unidade
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - UnidadeStatus
 *             properties:
 *               UnidadeStatus:
 *                 type: string
 *                 enum: [ATIVA, INATIVA, BLOQUEADA]
 *                 description: Novo status da unidade
 *     responses:
 *       200:
 *         description: Status da unidade atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Unidade'
 *       400:
 *         description: Status inválido ou ID inválido
 *       403:
 *         description: Apenas administradores podem alterar status de unidades
 *       404:
 *         description: Unidade não encontrada
 */
router.patch('/:id/status', unidadeController.alterarStatusUnidade);

module.exports = router;