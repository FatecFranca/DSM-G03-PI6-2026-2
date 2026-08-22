// src/routes/tecnicoRouter.js
const express = require('express');
const tecnicoController = require('../controllers/tecnicoController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

/**
 * @openapi
 * /tecnicos/login:
 *   post:
 *     summary: Login de técnico
 *     description: Realiza autenticação de técnico e retorna token JWT. Rota pública.
 *     tags:
 *       - Técnicos
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - TecnicoUsuario
 *               - TecnicoSenha
 *             properties:
 *               TecnicoUsuario:
 *                 type: string
 *                 description: Nome de usuário do técnico
 *                 example: "joaosilva"
 *               TecnicoSenha:
 *                 type: string
 *                 description: Senha do técnico
 *                 example: "senha123"
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     usuario:
 *                       $ref: '#/components/schemas/TecnicoSemSenha'
 *                     token:
 *                       type: string
 *                     tipo:
 *                       type: string
 *                       enum: [TECNICO]
 *       400:
 *         description: Usuário ou senha inválidos
 *       403:
 *         description: Conta inativa ou bloqueada
 */
router.post('/login', tecnicoController.login);

// Todas as rotas abaixo exigem autenticação
router.use(authMiddleware);

/**
 * @openapi
 * /tecnicos:
 *   get:
 *     summary: Lista técnicos
 *     description: Retorna lista de técnicos com filtros e paginação. Requer autenticação.
 *     tags:
 *       - Técnicos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: unidadeId
 *         schema:
 *           type: integer
 *         description: Filtra por ID da unidade (apenas gestor)
 *       - in: query
 *         name: departamentoId
 *         schema:
 *           type: integer
 *         description: Filtra por ID do departamento (apenas gestor)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ATIVO, INATIVO, BLOQUEADO]
 *         description: Filtra por status (apenas gestor)
 *       - in: query
 *         name: nome
 *         schema:
 *           type: string
 *         description: Filtra por nome (busca parcial, apenas gestor)
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
 *         description: Sucesso ao listar técnicos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/TecnicoResumo'
 *                 paginacao:
 *                   $ref: '#/components/schemas/Paginacao'
 *       403:
 *         description: Sem permissão para listar técnicos
 */
router.get('/', tecnicoController.listarTecnicos);

/**
 * @openapi
 * /tecnicos/{id}:
 *   get:
 *     summary: Busca técnico por ID
 *     description: Retorna os detalhes completos de um técnico específico. Requer autenticação.
 *     tags:
 *       - Técnicos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do técnico
 *     responses:
 *       200:
 *         description: Sucesso ao buscar técnico
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/TecnicoDetalhado'
 *       403:
 *         description: Sem permissão para visualizar este técnico
 *       404:
 *         description: Técnico não encontrado
 */
router.get('/:id', tecnicoController.buscarTecnicoPorId);

/**
 * @openapi
 * /tecnicos/unidade/{unidadeId}:
 *   get:
 *     summary: Lista técnicos por unidade
 *     description: Retorna lista resumida de técnicos de uma unidade/departamento. Útil para selects. Requer autenticação.
 *     tags:
 *       - Técnicos
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
 *         name: departamentoId
 *         schema:
 *           type: integer
 *         description: Filtra por ID do departamento
 *       - in: query
 *         name: apenasAtivos
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Se true, retorna apenas técnicos com status ATIVO
 *     responses:
 *       200:
 *         description: Sucesso ao listar técnicos da unidade
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/TecnicoUnidadeResumo'
 *       403:
 *         description: Sem permissão para visualizar técnicos desta unidade
 *       404:
 *         description: Unidade não encontrada
 */
router.get('/unidade/:unidadeId', tecnicoController.listarTecnicosPorUnidade);

/**
 * @openapi
 * /tecnicos:
 *   post:
 *     summary: Cadastra novo técnico
 *     description: Cadastra um novo técnico na unidade. Apenas gestor da unidade. Requer autenticação.
 *     tags:
 *       - Técnicos
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - DepartamentoId
 *               - UnidadeId
 *               - TecnicoNome
 *               - TecnicoCPF
 *               - TecnicoUsuario
 *               - TecnicoSenha
 *             properties:
 *               DepartamentoId:
 *                 type: string
 *                 description: ID do departamento
 *               UnidadeId:
 *                 type: integer
 *                 description: ID da unidade
 *               TecnicoNome:
 *                 type: string
 *                 description: Nome completo
 *               TecnicoEmail:
 *                 type: string
 *                 format: email
 *                 description: E-mail (opcional)
 *               TecnicoTelefone:
 *                 type: string
 *                 description: Telefone (opcional)
 *               TecnicoCPF:
 *                 type: string
 *                 description: CPF (único)
 *               TecnicoUsuario:
 *                 type: string
 *                 description: Nome de usuário para login (único)
 *               TecnicoSenha:
 *                 type: string
 *                 minLength: 6
 *                 description: Senha (mínimo 6 caracteres)
 *               TecnicoStatus:
 *                 type: string
 *                 enum: [ATIVO, INATIVO, BLOQUEADO]
 *                 default: ATIVO
 *                 description: Status do técnico (opcional)
 *     responses:
 *       201:
 *         description: Técnico cadastrado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/TecnicoSemSenha'
 *       400:
 *         description: Dados inválidos ou faltando
 *       403:
 *         description: Apenas gestores podem cadastrar técnicos
 *       409:
 *         description: CPF ou usuário já cadastrado
 */
router.post('/', tecnicoController.cadastrarTecnico);

/**
 * @openapi
 * /tecnicos/{id}:
 *   put:
 *     summary: Altera técnico
 *     description: Altera os dados de um técnico. Gestor da unidade ou o próprio técnico. Requer autenticação.
 *     tags:
 *       - Técnicos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do técnico
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               DepartamentoId:
 *                 type: string
 *                 description: ID do departamento (apenas gestor)
 *               UnidadeId:
 *                 type: integer
 *                 description: ID da unidade (apenas gestor)
 *               TecnicoNome:
 *                 type: string
 *                 description: Nome completo
 *               TecnicoEmail:
 *                 type: string
 *                 format: email
 *                 description: E-mail
 *               TecnicoTelefone:
 *                 type: string
 *                 description: Telefone
 *               TecnicoCPF:
 *                 type: string
 *                 description: CPF (apenas gestor)
 *               TecnicoUsuario:
 *                 type: string
 *                 description: Nome de usuário (apenas gestor)
 *               TecnicoSenha:
 *                 type: string
 *                 minLength: 6
 *                 description: Nova senha (mínimo 6 caracteres)
 *               TecnicoStatus:
 *                 type: string
 *                 enum: [ATIVO, INATIVO, BLOQUEADO]
 *                 description: Status (apenas gestor)
 *     responses:
 *       200:
 *         description: Técnico atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/TecnicoSemSenha'
 *       400:
 *         description: Dados inválidos
 *       403:
 *         description: Sem permissão para alterar este técnico
 *       404:
 *         description: Técnico não encontrado
 *       409:
 *         description: CPF ou usuário já existe para outro técnico
 */
router.put('/:id', tecnicoController.alterarTecnico);

/**
 * @openapi
 * /tecnicos/{id}/status:
 *   patch:
 *     summary: Altera status do técnico
 *     description: Altera apenas o status do técnico (ATIVO, INATIVO, BLOQUEADO). Apenas gestor da unidade. Requer autenticação.
 *     tags:
 *       - Técnicos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do técnico
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - TecnicoStatus
 *             properties:
 *               TecnicoStatus:
 *                 type: string
 *                 enum: [ATIVO, INATIVO, BLOQUEADO]
 *                 description: Novo status do técnico
 *     responses:
 *       200:
 *         description: Status do técnico atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/TecnicoSemSenha'
 *       400:
 *         description: Status inválido ou técnico possui equipes/chamados ativos
 *       403:
 *         description: Apenas gestores podem alterar status
 *       404:
 *         description: Técnico não encontrado
 */
router.patch('/:id/status', tecnicoController.alterarStatusTecnico);

module.exports = router;