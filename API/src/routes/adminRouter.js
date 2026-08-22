// src/routes/adminRouter.js
const express = require('express');
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

/**
 * @openapi
 * /admin/login:
 *   post:
 *     summary: Login do administrador
 *     description: Realiza autenticação do administrador e retorna token JWT. Rota pública.
 *     tags:
 *       - Administrador
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - AdministradorUsuario
 *               - AdministradorSenha
 *             properties:
 *               AdministradorUsuario:
 *                 type: string
 *                 description: Nome de usuário do administrador
 *                 example: "ADMIN001"
 *               AdministradorSenha:
 *                 type: string
 *                 description: Senha do administrador
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
 *                       $ref: '#/components/schemas/AdministradorResumo'
 *                     token:
 *                       type: string
 *                     tipo:
 *                       type: string
 *                       enum: [ADMINISTRADOR]
 *       400:
 *         description: Usuário ou senha inválidos
 */
router.post('/login', adminController.login);

// Todas as rotas abaixo exigem autenticação
router.use(authMiddleware);

/**
 * @openapi
 * /admin/dashboard:
 *   get:
 *     summary: Dados do dashboard do administrador
 *     description: Retorna estatísticas e indicadores gerais do sistema. Apenas administradores.
 *     tags:
 *       - Administrador
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
 *                     totalUnidadesAtivas:
 *                       type: integer
 *                       description: Total de unidades com status ATIVA
 *                     totalUnidadesInativas:
 *                       type: integer
 *                       description: Total de unidades com status INATIVA ou BLOQUEADA
 *                     totalPessoas:
 *                       type: integer
 *                       description: Total de pessoas cadastradas
 *                     totalTecnicos:
 *                       type: integer
 *                       description: Total de técnicos cadastrados
 *                     totalChamados:
 *                       type: integer
 *                       description: Total de chamados
 *                     totalAtividades:
 *                       type: integer
 *                       description: Total de atividades registradas
 *                     totalTiposSuporte:
 *                       type: integer
 *                       description: Total de tipos de suporte cadastrados
 *                     totalDepartamentos:
 *                       type: integer
 *                       description: Total de departamentos cadastrados
 *                     totalEquipes:
 *                       type: integer
 *                       description: Total de equipes cadastradas
 *                     totalGestores:
 *                       type: integer
 *                       description: Total de gestores cadastrados
 *       401:
 *         description: Usuário não autenticado
 *       403:
 *         description: Apenas administradores podem acessar esta rota
 *       404:
 *         description: Usuário não encontrado
 */
router.get('/dashboard', adminController.dashboard);

/**
 * @openapi
 * /admin:
 *   put:
 *     summary: Altera dados do administrador
 *     description: Altera os dados do administrador logado. Requer autenticação.
 *     tags:
 *       - Administrador
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - AdministradorUsuario
 *               - AdministradorSenhaAtual
 *             properties:
 *               AdministradorUsuario:
 *                 type: string
 *                 description: Novo nome de usuário
 *               AdministradorSenhaAtual:
 *                 type: string
 *                 description: Senha atual (obrigatória para confirmar alteração)
 *               AdministradorSenha:
 *                 type: string
 *                 minLength: 6
 *                 description: Nova senha (opcional, mínimo 6 caracteres)
 *     responses:
 *       200:
 *         description: Dados atualizados com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/AdministradorResumo'
 *       400:
 *         description: Dados inválidos ou senha atual incorreta
 *       401:
 *         description: Usuário não autenticado
 *       403:
 *         description: Apenas administradores podem acessar esta rota
 *       404:
 *         description: Administrador não encontrado
 *       409:
 *         description: Nome de usuário já está em uso
 */
router.put('/', adminController.alterarAdmin);

module.exports = router;