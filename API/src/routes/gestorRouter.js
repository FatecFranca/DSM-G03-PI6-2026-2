// src/routes/gestorRouter.js
const express = require('express');
const gestorController = require('../controllers/gestorController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

/**
 * @openapi
 * /gestores/login:
 *   post:
 *     summary: Login de gestor
 *     description: Realiza autenticação de gestor e retorna token JWT. Rota pública.
 *     tags:
 *       - Gestores
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - GestorUsuario
 *               - GestorSenha
 *             properties:
 *               GestorUsuario:
 *                 type: string
 *                 description: Nome de usuário do gestor
 *                 example: "gestor1"
 *               GestorSenha:
 *                 type: string
 *                 description: Senha do gestor
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
 *                       $ref: '#/components/schemas/GestorSemSenha'
 *                     token:
 *                       type: string
 *                     tipo:
 *                       type: string
 *                       enum: [GESTOR]
 *       400:
 *         description: Usuário ou senha inválidos
 *       403:
 *         description: Conta inativa ou bloqueada
 */
router.post('/login', gestorController.loginGestor);

// Todas as rotas de gestor exigem autenticação
router.use(authMiddleware);

/**
 * @openapi
 * /gestores:
 *   get:
 *     summary: Lista gestores
 *     description: Retorna lista de gestores com filtros e paginação. Requer autenticação.
 *     tags:
 *       - Gestores
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: unidadeId
 *         schema:
 *           type: integer
 *         description: Filtra por ID da unidade (apenas administrador)
 *       - in: query
 *         name: nivel
 *         schema:
 *           type: string
 *           enum: [COMUM, ADMINUNIDADE]
 *         description: Filtra por nível do gestor
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
 *         description: Sucesso ao listar gestores
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/GestorResumo'
 *                 paginacao:
 *                   $ref: '#/components/schemas/Paginacao'
 *       403:
 *         description: Sem permissão para listar gestores
 */
router.get('/', gestorController.listarGestores);

/**
 * @openapi
 * /gestores/{id}:
 *   get:
 *     summary: Busca gestor por ID
 *     description: Retorna os detalhes completos de um gestor específico. Requer autenticação.
 *     tags:
 *       - Gestores
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do gestor
 *     responses:
 *       200:
 *         description: Sucesso ao buscar gestor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/GestorDetalhado'
 *       403:
 *         description: Sem permissão para visualizar este gestor
 *       404:
 *         description: Gestor não encontrado
 */
router.get('/:id', gestorController.buscarGestorPorId);

/**
 * @openapi
 * /gestores/dashboard/dados:
 *   get:
 *     summary: Dados do dashboard do gestor
 *     description: Retorna estatísticas e indicadores para o dashboard do gestor. Requer autenticação.
 *     tags:
 *       - Gestores
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sucesso ao buscar dados do dashboard
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalChamadosAnalisados:
 *                       type: integer
 *                     totalChamadosAtribuidos:
 *                       type: integer
 *                     totalChamadosAtendimento:
 *                       type: integer
 *                     totalChamadosFaltandoInformacao:
 *                       type: integer
 *                     totalChamadosPendentes:
 *                       type: integer
 *                     totalChamadosRecusados:
 *                       type: integer
 *                     totalDepartamentos:
 *                       type: integer
 *                     totalEquipes:
 *                       type: integer
 *                     totalGestoresADM:
 *                       type: integer
 *                     totalGestoresComuns:
 *                       type: integer
 *                     totalPessoas:
 *                       type: integer
 *                     totalTecnicos:
 *                       type: integer
 *                     totalTiposSuporte:
 *                       type: integer
 *       403:
 *         description: Apenas gestores podem acessar esta rota
 */
router.get('/dashboard/dados', gestorController.dashboard);

/**
 * @openapi
 * /gestores:
 *   post:
 *     summary: Cadastra novo gestor
 *     description: Cadastra um novo gestor. Apenas administradores e gestores ADMINUNIDADE podem cadastrar. Requer autenticação.
 *     tags:
 *       - Gestores
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
 *               - GestorNome
 *               - GestorCPF
 *               - GestorUsuario
 *               - GestorSenha
 *               - GestorNivel
 *             properties:
 *               UnidadeId:
 *                 type: integer
 *                 description: ID da unidade
 *               GestorNome:
 *                 type: string
 *                 description: Nome completo
 *               GestorEmail:
 *                 type: string
 *                 format: email
 *                 description: E-mail (opcional)
 *               GestorTelefone:
 *                 type: string
 *                 description: Telefone (opcional)
 *               GestorCPF:
 *                 type: string
 *                 description: CPF (único)
 *               GestorUsuario:
 *                 type: string
 *                 description: Nome de usuário para login (único)
 *               GestorSenha:
 *                 type: string
 *                 minLength: 6
 *                 description: Senha (mínimo 6 caracteres)
 *               GestorNivel:
 *                 type: string
 *                 enum: [COMUM, ADMINUNIDADE]
 *                 description: Nível de acesso do gestor
 *               GestorStatus:
 *                 type: string
 *                 enum: [ATIVO, INATIVO, BLOQUEADO]
 *                 default: ATIVO
 *                 description: Status do gestor (opcional)
 *     responses:
 *       201:
 *         description: Gestor cadastrado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/GestorSemSenha'
 *       400:
 *         description: Dados inválidos ou faltando
 *       403:
 *         description: Sem permissão para cadastrar gestores
 *       409:
 *         description: CPF ou usuário já cadastrado
 */
router.post('/', gestorController.cadastrarGestor);

/**
 * @openapi
 * /gestores/{id}:
 *   put:
 *     summary: Altera gestor
 *     description: Altera os dados de um gestor. Permissões variam conforme nível de acesso. Requer autenticação.
 *     tags:
 *       - Gestores
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do gestor
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               UnidadeId:
 *                 type: integer
 *                 description: ID da unidade (apenas administrador)
 *               GestorNome:
 *                 type: string
 *                 description: Nome completo
 *               GestorEmail:
 *                 type: string
 *                 format: email
 *                 description: E-mail
 *               GestorTelefone:
 *                 type: string
 *                 description: Telefone
 *               GestorCPF:
 *                 type: string
 *                 description: CPF (apenas administrador ou ADMINUNIDADE alterando outro)
 *               GestorUsuario:
 *                 type: string
 *                 description: Nome de usuário (apenas administrador ou ADMINUNIDADE alterando outro)
 *               GestorSenha:
 *                 type: string
 *                 minLength: 6
 *                 description: Nova senha (mínimo 6 caracteres)
 *               GestorSenhaAtual:
 *                 type: string
 *                 description: Senha atual (obrigatória para auto-alteração)
 *               GestorNivel:
 *                 type: string
 *                 enum: [COMUM, ADMINUNIDADE]
 *                 description: Nível de acesso (apenas administrador)
 *               GestorStatus:
 *                 type: string
 *                 enum: [ATIVO, INATIVO, BLOQUEADO]
 *                 description: Status (apenas administrador)
 *     responses:
 *       200:
 *         description: Gestor atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/GestorSemSenha'
 *       400:
 *         description: Dados inválidos ou faltando
 *       403:
 *         description: Sem permissão para alterar este gestor
 *       404:
 *         description: Gestor não encontrado
 *       409:
 *         description: CPF ou usuário já existe para outro gestor
 */
router.put('/:id', gestorController.alterarGestor);

/**
 * @openapi
 * /gestores/{id}/status:
 *   patch:
 *     summary: Altera status do gestor
 *     description: Altera apenas o status do gestor (ATIVO, INATIVO, BLOQUEADO). Apenas administradores e gestores ADMINUNIDADE. Requer autenticação.
 *     tags:
 *       - Gestores
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do gestor
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - GestorStatus
 *             properties:
 *               GestorStatus:
 *                 type: string
 *                 enum: [ATIVO, INATIVO, BLOQUEADO]
 *                 description: Novo status do gestor
 *     responses:
 *       200:
 *         description: Status do gestor atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/GestorSemSenha'
 *       400:
 *         description: Status inválido
 *       403:
 *         description: Sem permissão para alterar status deste gestor
 *       404:
 *         description: Gestor não encontrado
 */
router.patch('/:id/status', gestorController.alterarStatusGestor);

module.exports = router;