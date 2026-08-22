// src/routes/equipeRoutes.js
const express = require('express');
const equipeController = require('../controllers/equipeController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

/**
 * @openapi
 * /equipes/{id}:
 *   get:
 *     summary: Busca equipe por ID
 *     description: Retorna os detalhes completos de uma equipe específica. Rota pública (não exige autenticação).
 *     tags:
 *       - Equipes
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da equipe
 *     responses:
 *       200:
 *         description: Sucesso ao buscar equipe
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/EquipeDetalhada'
 *       400:
 *         description: ID da equipe inválido
 *       404:
 *         description: Equipe não encontrada
 */
router.get('/:id', equipeController.buscarEquipePorId);

// Todas as rotas abaixo exigem autenticação
router.use(authMiddleware);

/**
 * @openapi
 * /equipes:
 *   get:
 *     summary: Lista equipes
 *     description: Retorna lista de equipes com filtros e paginação. Requer autenticação.
 *     tags:
 *       - Equipes
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
 *           enum: [ATIVA, INATIVA]
 *         description: Filtra por status
 *       - in: query
 *         name: nome
 *         schema:
 *           type: string
 *         description: Filtra por nome (busca parcial)
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
 *         description: Sucesso ao listar equipes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/EquipeResumo'
 *                 paginacao:
 *                   $ref: '#/components/schemas/Paginacao'
 *       403:
 *         description: Sem permissão para listar equipes
 */
router.get('/', equipeController.listarEquipes);

/**
 * @openapi
 * /equipes/{equipeId}/tecnicos:
 *   get:
 *     summary: Lista vínculos de uma equipe
 *     description: Retorna todos os técnicos vinculados a uma equipe específica. Requer autenticação.
 *     tags:
 *       - Equipes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: equipeId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da equipe
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ATIVO, INATIVO]
 *         description: Filtra por status do vínculo
 *       - in: query
 *         name: apenasAtivos
 *         schema:
 *           type: boolean
 *         description: Se true, retorna apenas vínculos ativos
 *     responses:
 *       200:
 *         description: Sucesso ao listar vínculos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/TecnicoEquipe'
 *                 total:
 *                   type: integer
 *       403:
 *         description: Sem permissão para visualizar vínculos
 *       404:
 *         description: Equipe não encontrada
 */
router.get('/:equipeId/tecnicos', equipeController.listarVinculosPorEquipe);

/**
 * @openapi
 * /equipes/tecnico/{tecnicoId}:
 *   get:
 *     summary: Lista vínculos de um técnico
 *     description: Retorna todas as equipes vinculadas a um técnico específico. Requer autenticação.
 *     tags:
 *       - Equipes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tecnicoId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do técnico
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ATIVO, INATIVO]
 *         description: Filtra por status do vínculo
 *       - in: query
 *         name: apenasAtivos
 *         schema:
 *           type: boolean
 *         description: Se true, retorna apenas vínculos ativos
 *     responses:
 *       200:
 *         description: Sucesso ao listar vínculos do técnico
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/EquipeVinculo'
 *                 total:
 *                   type: integer
 *       403:
 *         description: Sem permissão para visualizar vínculos
 *       404:
 *         description: Técnico não encontrado
 */
router.get('/tecnico/:tecnicoId', equipeController.listarVinculosPorTecnico);

/**
 * @openapi
 * /equipes:
 *   post:
 *     summary: Cadastra nova equipe
 *     description: Cadastra uma nova equipe na unidade. Apenas gestores. Requer autenticação.
 *     tags:
 *       - Equipes
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
 *               - EquipeNome
 *               - EquipeDescricao
 *             properties:
 *               UnidadeId:
 *                 type: integer
 *                 description: ID da unidade
 *               EquipeNome:
 *                 type: string
 *                 description: Nome da equipe
 *               EquipeDescricao:
 *                 type: string
 *                 description: Descrição da equipe
 *               EquipeStatus:
 *                 type: string
 *                 enum: [ATIVA, INATIVA]
 *                 default: ATIVA
 *                 description: Status da equipe (opcional)
 *     responses:
 *       201:
 *         description: Equipe cadastrada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Equipe'
 *       400:
 *         description: Dados inválidos ou faltando
 *       403:
 *         description: Apenas gestores podem cadastrar equipes
 *       409:
 *         description: Já existe uma equipe com este nome nesta unidade
 */
router.post('/', equipeController.cadastrarEquipe);

/**
 * @openapi
 * /equipes/{id}:
 *   put:
 *     summary: Altera equipe
 *     description: Altera os dados de uma equipe. Apenas gestores da unidade. Requer autenticação.
 *     tags:
 *       - Equipes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da equipe
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               EquipeNome:
 *                 type: string
 *                 description: Nome da equipe
 *               EquipeDescricao:
 *                 type: string
 *                 description: Descrição da equipe
 *               EquipeStatus:
 *                 type: string
 *                 enum: [ATIVA, INATIVA]
 *                 description: Status da equipe
 *     responses:
 *       200:
 *         description: Equipe atualizada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Equipe'
 *       400:
 *         description: Dados inválidos
 *       403:
 *         description: Sem permissão para alterar esta equipe
 *       404:
 *         description: Equipe não encontrada
 *       409:
 *         description: Já existe outra equipe com este nome nesta unidade
 */
router.put('/:id', equipeController.alterarEquipe);

/**
 * @openapi
 * /equipes/{id}/status:
 *   patch:
 *     summary: Altera status da equipe
 *     description: Altera apenas o status da equipe (ATIVA, INATIVA). Apenas gestores da unidade. Requer autenticação.
 *     tags:
 *       - Equipes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da equipe
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - EquipeStatus
 *             properties:
 *               EquipeStatus:
 *                 type: string
 *                 enum: [ATIVA, INATIVA]
 *                 description: Novo status da equipe
 *     responses:
 *       200:
 *         description: Status da equipe atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Equipe'
 *       400:
 *         description: Status inválido
 *       403:
 *         description: Apenas gestores podem alterar status
 *       404:
 *         description: Equipe não encontrada
 */
router.patch('/:id/status', equipeController.alterarStatusEquipe);

/**
 * @openapi
 * /equipes/{equipeId}/tecnicos:
 *   post:
 *     summary: Adiciona técnico à equipe
 *     description: Vincula um técnico a uma equipe. Apenas gestores da unidade. Requer autenticação.
 *     tags:
 *       - Equipes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: equipeId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da equipe
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - TecnicoId
 *             properties:
 *               TecnicoId:
 *                 type: string
 *                 description: ID do técnico
 *               TecEquStatus:
 *                 type: string
 *                 enum: [ATIVO, INATIVO]
 *                 default: ATIVO
 *                 description: Status do vínculo (opcional)
 *     responses:
 *       201:
 *         description: Técnico adicionado à equipe com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/TecnicoEquipe'
 *       400:
 *         description: Dados inválidos ou técnico não pertence à unidade
 *       403:
 *         description: Apenas gestores podem gerenciar vínculos
 *       404:
 *         description: Equipe ou técnico não encontrado
 *       409:
 *         description: Técnico já está vinculado a esta equipe
 */
router.post('/:equipeId/tecnicos', equipeController.adicionarTecnicoEquipe);

/**
 * @openapi
 * /equipes/vinculos/{vinculoId}:
 *   put:
 *     summary: Altera vínculo técnico-equipe
 *     description: Altera o status de um vínculo entre técnico e equipe. Apenas gestores da unidade. Requer autenticação.
 *     tags:
 *       - Equipes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vinculoId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do vínculo
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - TecEquStatus
 *             properties:
 *               TecEquStatus:
 *                 type: string
 *                 enum: [ATIVO, INATIVO]
 *                 description: Novo status do vínculo
 *     responses:
 *       200:
 *         description: Vínculo atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/TecnicoEquipe'
 *       400:
 *         description: Status inválido
 *       403:
 *         description: Apenas gestores podem alterar vínculos
 *       404:
 *         description: Vínculo não encontrado
 */
router.put('/vinculos/:vinculoId', equipeController.alterarTecnicoEquipe);

/**
 * @openapi
 * /equipes/vinculos/{vinculoId}:
 *   delete:
 *     summary: Remove vínculo técnico-equipe
 *     description: Remove permanentemente o vínculo entre técnico e equipe. Apenas gestores da unidade. Requer autenticação.
 *     tags:
 *       - Equipes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vinculoId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do vínculo
 *     responses:
 *       200:
 *         description: Vínculo removido com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Não é possível remover técnico com chamados em andamento
 *       403:
 *         description: Apenas gestores podem remover vínculos
 *       404:
 *         description: Vínculo não encontrado
 */
router.delete('/vinculos/:vinculoId', equipeController.removerTecnicoEquipe);

module.exports = router;