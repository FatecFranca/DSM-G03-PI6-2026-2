// src/routes/tipoSuporteRoutes.js
const express = require('express');
const tipoSuporteController = require('../controllers/tipoSuporteController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Todas as rotas abaixo exigem autenticação
router.use(authMiddleware);

/**
 * @openapi
 * /tiposuporte:
 *   get:
 *     summary: Lista tipos de suporte
 *     description: Retorna lista de tipos de suporte com filtros. Requer autenticação.
 *     tags:
 *       - Tipos de Suporte
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: unidadeId
 *         schema:
 *           type: integer
 *         description: Filtra por ID da unidade (apenas administrador)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ATIVO, INATIVO]
 *         description: Filtra por status (apenas administrador/gestor)
 *       - in: query
 *         name: nome
 *         schema:
 *           type: string
 *         description: Filtra por nome (busca parcial)
 *     responses:
 *       200:
 *         description: Sucesso ao listar tipos de suporte
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/TipoSuporteResumo'
 *       403:
 *         description: Sem permissão para listar tipos de suporte
 */
router.get('/', tipoSuporteController.listarTiposSuporte);

/**
 * @openapi
 * /tiposuporte/{id}:
 *   get:
 *     summary: Busca tipo de suporte por ID
 *     description: Retorna os detalhes completos de um tipo de suporte específico. Requer autenticação.
 *     tags:
 *       - Tipos de Suporte
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do tipo de suporte
 *     responses:
 *       200:
 *         description: Sucesso ao buscar tipo de suporte
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/TipoSuporteDetalhado'
 *       403:
 *         description: Sem permissão para visualizar este tipo de suporte
 *       404:
 *         description: Tipo de suporte não encontrado
 */
router.get('/:id', tipoSuporteController.buscarTipoSuportePorId);

/**
 * @openapi
 * /tiposuporte/unidade/{unidadeId}:
 *   get:
 *     summary: Lista tipos de suporte por unidade
 *     description: Retorna lista resumida de tipos de suporte de uma unidade específica. Útil para selects. Requer autenticação.
 *     tags:
 *       - Tipos de Suporte
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: unidadeId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da unidade
 *       - in: query
 *         name: apenasAtivos
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Se true, retorna apenas tipos com status ATIVO
 *     responses:
 *       200:
 *         description: Sucesso ao listar tipos de suporte da unidade
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/TipoSuporteUnidadeResumo'
 *       403:
 *         description: Sem permissão para visualizar tipos de suporte desta unidade
 *       404:
 *         description: Unidade não encontrada
 */
router.get('/unidade/:unidadeId', tipoSuporteController.listarTiposPorUnidade);

/**
 * @openapi
 * /tiposuporte:
 *   post:
 *     summary: Cadastra novo tipo de suporte
 *     description: Cadastra um novo tipo de suporte na unidade. Apenas gestores da unidade podem cadastrar. Requer autenticação.
 *     tags:
 *       - Tipos de Suporte
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - UnidadeId
 *               - TipSupNom
 *             properties:
 *               UnidadeId:
 *                 type: integer
 *                 description: ID da unidade
 *               TipSupNom:
 *                 type: string
 *                 description: Nome do tipo de suporte
 *               TipSupStatus:
 *                 type: string
 *                 enum: [ATIVO, INATIVO]
 *                 default: ATIVO
 *                 description: Status do tipo de suporte (opcional)
 *     responses:
 *       201:
 *         description: Tipo de suporte cadastrado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/TipoSuporte'
 *       400:
 *         description: Dados inválidos ou faltando
 *       403:
 *         description: Apenas gestores podem cadastrar tipos de suporte
 *       409:
 *         description: Já existe um tipo de suporte com este nome nesta unidade
 */
router.post('/', tipoSuporteController.cadastrarTipoSuporte);

/**
 * @openapi
 * /tiposuporte/{id}:
 *   put:
 *     summary: Altera tipo de suporte
 *     description: Altera os dados de um tipo de suporte. Apenas gestores da unidade podem alterar. Requer autenticação.
 *     tags:
 *       - Tipos de Suporte
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do tipo de suporte
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               TipSupNom:
 *                 type: string
 *                 description: Nome do tipo de suporte
 *               TipSupStatus:
 *                 type: string
 *                 enum: [ATIVO, INATIVO]
 *                 description: Status do tipo de suporte
 *     responses:
 *       200:
 *         description: Tipo de suporte atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/TipoSuporte'
 *       400:
 *         description: Dados inválidos ou tipo possui chamados em andamento
 *       403:
 *         description: Sem permissão para alterar este tipo de suporte
 *       404:
 *         description: Tipo de suporte não encontrado
 *       409:
 *         description: Já existe outro tipo de suporte com este nome nesta unidade
 */
router.put('/:id', tipoSuporteController.alterarTipoSuporte);

/**
 * @openapi
 * /tiposuporte/{id}/status:
 *   patch:
 *     summary: Altera status do tipo de suporte
 *     description: Altera apenas o status do tipo de suporte (ATIVO, INATIVO). Apenas gestores da unidade. Requer autenticação.
 *     tags:
 *       - Tipos de Suporte
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do tipo de suporte
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - TipSupStatus
 *             properties:
 *               TipSupStatus:
 *                 type: string
 *                 enum: [ATIVO, INATIVO]
 *                 description: Novo status do tipo de suporte
 *     responses:
 *       200:
 *         description: Status do tipo de suporte atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/TipoSuporte'
 *       400:
 *         description: Status inválido ou tipo possui chamados em andamento
 *       403:
 *         description: Apenas gestores podem alterar status
 *       404:
 *         description: Tipo de suporte não encontrado
 */
router.patch('/:id/status', tipoSuporteController.alterarStatusTipoSuporte);

// Listar vínculos de um tipo de suporte
router.get('/:id/vinculos', tipoSuporteController.listarVinculosPorTipoSuporte)

// Adicionar unidade a um tipo de suporte
router.post('/:id/unidades', tipoSuporteController.adicionarUnidadeTipoSuporte)

// Alterar status de vínculo
router.put('/vinculos/:id', tipoSuporteController.alterarVinculoTipoSuporte)

// Remover vínculo
router.delete('/vinculos/:id', tipoSuporteController.removerVinculoTipoSuporte)

module.exports = router;