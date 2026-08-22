// src/routes/pessoaRouter.js
const express = require('express');
const pessoaController = require('../controllers/pessoaController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

/**
 * @openapi
 * /pessoas/login:
 *   post:
 *     summary: Login de pessoa
 *     description: Realiza autenticação de pessoa (usuário) e retorna token JWT. Rota pública.
 *     tags:
 *       - Pessoas
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - PessoaUsuario
 *               - PessoaSenha
 *             properties:
 *               PessoaUsuario:
 *                 type: string
 *                 description: CPF do usuário
 *                 example: "12345678900"
 *               PessoaSenha:
 *                 type: string
 *                 description: Senha do usuário
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
 *                       $ref: '#/components/schemas/PessoaSemSenha'
 *                     token:
 *                       type: string
 *                     tipo:
 *                       type: string
 *                       enum: [PESSOA]
 *       400:
 *         description: Usuário ou senha inválidos
 *       403:
 *         description: Conta inativa ou bloqueada
 */
router.post('/login', pessoaController.login);

// Todas as rotas abaixo exigem autenticação
router.use(authMiddleware);

/**
 * @openapi
 * /pessoas:
 *   get:
 *     summary: Lista pessoas
 *     description: Retorna lista de pessoas com filtros e paginação. Requer autenticação.
 *     tags:
 *       - Pessoas
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: unidadeId
 *         schema:
 *           type: integer
 *         description: Filtra por ID da unidade (apenas gestor)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ATIVA, INATIVA, BLOQUEADA]
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
 *         description: Sucesso ao listar pessoas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PessoaResumo'
 *                 paginacao:
 *                   $ref: '#/components/schemas/Paginacao'
 *       403:
 *         description: Sem permissão para listar pessoas
 */
router.get('/', pessoaController.listarPessoas);

/**
 * @openapi
 * /pessoas/{id}:
 *   get:
 *     summary: Busca pessoa por ID
 *     description: Retorna os detalhes completos de uma pessoa específica. Requer autenticação.
 *     tags:
 *       - Pessoas
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da pessoa
 *     responses:
 *       200:
 *         description: Sucesso ao buscar pessoa
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/PessoaDetalhada'
 *       403:
 *         description: Sem permissão para visualizar esta pessoa
 *       404:
 *         description: Pessoa não encontrada
 */
router.get('/:id', pessoaController.buscarPessoaPorId);

/**
 * @openapi
 * /pessoas/unidade/{unidadeId}:
 *   get:
 *     summary: Lista pessoas por unidade
 *     description: Retorna lista resumida de pessoas de uma unidade específica. Útil para selects. Requer autenticação.
 *     tags:
 *       - Pessoas
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
 *         description: Se true, retorna apenas pessoas com status ATIVA
 *     responses:
 *       200:
 *         description: Sucesso ao listar pessoas da unidade
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PessoaUnidadeResumo'
 *       403:
 *         description: Sem permissão para visualizar pessoas desta unidade
 *       404:
 *         description: Unidade não encontrada
 */
router.get('/unidade/:unidadeId', pessoaController.listarPessoasPorUnidade);

/**
 * @openapi
 * /pessoas:
 *   post:
 *     summary: Cadastra nova pessoa
 *     description: Cadastra uma nova pessoa na unidade. Apenas gestor da unidade. Requer autenticação.
 *     tags:
 *       - Pessoas
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
 *               - PessoaNome
 *               - PessoaCPF
 *               - PessoaSenha
 *             properties:
 *               UnidadeId:
 *                 type: integer
 *                 description: ID da unidade
 *               PessoaNome:
 *                 type: string
 *                 description: Nome completo
 *               PessoaEmail:
 *                 type: string
 *                 format: email
 *                 description: E-mail (opcional)
 *               PessoaTelefone:
 *                 type: string
 *                 description: Telefone (opcional)
 *               PessoaCPF:
 *                 type: string
 *                 description: CPF (único)
 *               PessoaSenha:
 *                 type: string
 *                 minLength: 6
 *                 description: Senha (mínimo 6 caracteres)
 *               PessoaStatus:
 *                 type: string
 *                 enum: [ATIVA, INATIVA, BLOQUEADA]
 *                 default: ATIVA
 *                 description: Status da pessoa (opcional)
 *     responses:
 *       201:
 *         description: Pessoa cadastrada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/PessoaSemSenha'
 *       400:
 *         description: Dados inválidos ou faltando
 *       403:
 *         description: Apenas gestores podem cadastrar pessoas
 *       409:
 *         description: CPF já cadastrado
 */
router.post('/', pessoaController.cadastrarPessoa);

/**
 * @openapi
 * /pessoas/{id}:
 *   put:
 *     summary: Altera pessoa
 *     description: Altera os dados de uma pessoa. Gestor da unidade ou a própria pessoa. Requer autenticação.
 *     tags:
 *       - Pessoas
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da pessoa
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               UnidadeId:
 *                 type: integer
 *                 description: ID da unidade (apenas gestor)
 *               PessoaNome:
 *                 type: string
 *                 description: Nome completo
 *               PessoaEmail:
 *                 type: string
 *                 format: email
 *                 description: E-mail
 *               PessoaTelefone:
 *                 type: string
 *                 description: Telefone
 *               PessoaCPF:
 *                 type: string
 *                 description: CPF (apenas gestor)
 *               PessoaSenha:
 *                 type: string
 *                 minLength: 6
 *                 description: Nova senha (mínimo 6 caracteres)
 *               PessoaStatus:
 *                 type: string
 *                 enum: [ATIVA, INATIVA, BLOQUEADA]
 *                 description: Status (apenas gestor)
 *     responses:
 *       200:
 *         description: Pessoa atualizada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/PessoaSemSenha'
 *       400:
 *         description: Dados inválidos
 *       403:
 *         description: Sem permissão para alterar esta pessoa
 *       404:
 *         description: Pessoa não encontrada
 */
router.put('/:id', pessoaController.alterarPessoa);

/**
 * @openapi
 * /pessoas/{id}/status:
 *   patch:
 *     summary: Altera status da pessoa
 *     description: Altera apenas o status da pessoa (ATIVA, INATIVA, BLOQUEADA). Apenas gestor da unidade. Requer autenticação.
 *     tags:
 *       - Pessoas
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da pessoa
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - PessoaStatus
 *             properties:
 *               PessoaStatus:
 *                 type: string
 *                 enum: [ATIVA, INATIVA, BLOQUEADA]
 *                 description: Novo status da pessoa
 *     responses:
 *       200:
 *         description: Status da pessoa atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/PessoaSemSenha'
 *       400:
 *         description: Status inválido ou pessoa possui chamados em aberto
 *       403:
 *         description: Apenas gestores podem alterar status
 *       404:
 *         description: Pessoa não encontrada
 */
router.patch('/:id/status', pessoaController.alterarStatusPessoa);

module.exports = router;