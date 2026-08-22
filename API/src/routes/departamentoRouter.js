// src/routes/departamentoRouter.js
const express = require('express');
const departamentoController = require('../controllers/departamentoController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Todas as rotas abaixo exigem autenticação
router.use(authMiddleware);

/**
 * @openapi
 * /departamentos:
 *   get:
 *     summary: Lista departamentos
 *     description: Retorna lista de departamentos com filtros e paginação. Requer autenticação.
 *     tags:
 *       - Departamentos
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
 *           enum: [ATIVO, INATIVO, BLOQUEADO]
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
 *         description: Sucesso ao listar departamentos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DepartamentoResumo'
 *                 paginacao:
 *                   $ref: '#/components/schemas/Paginacao'
 *       403:
 *         description: Sem permissão para listar departamentos
 */
router.get('/', departamentoController.listarDepartamentos);

/**
 * @openapi
 * /departamentos/{id}:
 *   get:
 *     summary: Busca departamento por ID
 *     description: Retorna os detalhes completos de um departamento específico. Requer autenticação.
 *     tags:
 *       - Departamentos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do departamento
 *     responses:
 *       200:
 *         description: Sucesso ao buscar departamento
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/DepartamentoDetalhado'
 *       403:
 *         description: Sem permissão para visualizar este departamento
 *       404:
 *         description: Departamento não encontrado
 */
router.get('/:id', departamentoController.buscarDepartamentoPorId);

/**
 * @openapi
 * /departamentos:
 *   post:
 *     summary: Cadastra novo departamento
 *     description: Cadastra um novo departamento na unidade. Apenas gestores podem cadastrar. Requer autenticação.
 *     tags:
 *       - Departamentos
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
 *               - DepartamentoNome
 *             properties:
 *               UnidadeId:
 *                 type: integer
 *                 description: ID da unidade
 *               DepartamentoNome:
 *                 type: string
 *                 description: Nome do departamento
 *               DepartamentoStatus:
 *                 type: string
 *                 enum: [ATIVO, INATIVO, BLOQUEADO]
 *                 default: ATIVO
 *                 description: Status do departamento (opcional)
 *     responses:
 *       201:
 *         description: Departamento cadastrado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Departamento'
 *       400:
 *         description: Dados inválidos ou faltando
 *       403:
 *         description: Apenas gestores podem cadastrar departamentos
 *       409:
 *         description: Já existe um departamento com este nome nesta unidade
 */
router.post('/', departamentoController.cadastrarDepartamento);

/**
 * @openapi
 * /departamentos/{id}:
 *   put:
 *     summary: Altera departamento
 *     description: Altera os dados de um departamento. Apenas gestores da unidade podem alterar. Requer autenticação.
 *     tags:
 *       - Departamentos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do departamento
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               DepartamentoNome:
 *                 type: string
 *                 description: Nome do departamento
 *               DepartamentoStatus:
 *                 type: string
 *                 enum: [ATIVO, INATIVO, BLOQUEADO]
 *                 description: Status do departamento
 *     responses:
 *       200:
 *         description: Departamento atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Departamento'
 *       400:
 *         description: Dados inválidos
 *       403:
 *         description: Sem permissão para alterar este departamento
 *       404:
 *         description: Departamento não encontrado
 *       409:
 *         description: Já existe outro departamento com este nome nesta unidade
 */
router.put('/:id', departamentoController.alterarDepartamento);

/**
 * @openapi
 * /departamentos/{id}/status:
 *   patch:
 *     summary: Altera status do departamento
 *     description: Altera apenas o status do departamento (ATIVO, INATIVO, BLOQUEADO). Apenas gestores da unidade. Requer autenticação.
 *     tags:
 *       - Departamentos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do departamento
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - DepartamentoStatus
 *             properties:
 *               DepartamentoStatus:
 *                 type: string
 *                 enum: [ATIVO, INATIVO, BLOQUEADO]
 *                 description: Novo status do departamento
 *     responses:
 *       200:
 *         description: Status do departamento atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Departamento'
 *       400:
 *         description: Status inválido ou departamento possui técnicos ativos
 *       403:
 *         description: Apenas gestores podem alterar status
 *       404:
 *         description: Departamento não encontrado
 */
router.patch('/:id/status', departamentoController.alterarStatusDepartamento);

module.exports = router;