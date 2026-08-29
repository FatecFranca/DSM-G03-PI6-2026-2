// src/routes/solicitacaoRouter.js
const express = require('express');
const solicitacaoController = require('../controllers/solicitacaoController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// =============================================
// ROTAS PÚBLICAS (NÃO EXIGEM AUTENTICAÇÃO)
// =============================================

/**
 * @openapi
 * /solicitacoes:
 *   post:
 *     summary: Abre uma nova solicitação (público)
 *     description: Permite que qualquer pessoa abra uma solicitação sem necessidade de login.
 *     tags:
 *       - Solicitações
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - SolicitacaoTipo
 *               - SolicitacaoDescricao
 *             properties:
 *               UnidadeId:
 *                 type: integer
 *                 description: ID da unidade (opcional)
 *               SolicitacaoTipo:
 *                 type: string
 *                 enum: [CADASTRO_PESSOA, ALTERACAO_DADOS, REVISAO_STATUS, CADASTRO_GESTOR, OUTRO]
 *                 description: Tipo da solicitação
 *               SolicitacaoDescricao:
 *                 type: string
 *                 description: Descrição detalhada da solicitação
 *               SolicitacaoIdRelacional:
 *                 type: string
 *                 description: ID relacional (pessoa, gestor, etc)
 *               SolicitacaoSolicitanteNome:
 *                 type: string
 *                 description: Nome do solicitante
 *               SolicitacaoSolicitanteEmail:
 *                 type: string
 *                 description: Email do solicitante
 *               SolicitacaoSolicitanteTelefone:
 *                 type: string
 *                 description: Telefone do solicitante
 *     responses:
 *       201:
 *         description: Solicitação aberta com sucesso
 *       400:
 *         description: Dados inválidos
 *       404:
 *         description: Unidade não encontrada
 */
router.post('/', solicitacaoController.abrirSolicitacao);

// =============================================
// ROTAS PROTEGIDAS (EXIGEM AUTENTICAÇÃO)
// =============================================
router.use(authMiddleware);

/**
 * @openapi
 * /solicitacoes:
 *   get:
 *     summary: Lista solicitações
 *     description: Retorna lista de solicitações com filtros e paginação. Apenas gestores e administradores.
 *     tags:
 *       - Solicitações
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDENTE, EMANDAMENTO, CONCLUIDO, REJEITADO]
 *         description: Filtra por status
 *       - in: query
 *         name: tipo
 *         schema:
 *           type: string
 *           enum: [CADASTRO_PESSOA, ALTERACAO_DADOS, REVISAO_STATUS, CADASTRO_GESTOR, OUTRO]
 *         description: Filtra por tipo
 *       - in: query
 *         name: unidadeId
 *         schema:
 *           type: integer
 *         description: Filtra por unidade (apenas administradores)
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
 *         description: Sucesso ao listar solicitações
 *       403:
 *         description: Apenas gestores e administradores podem acessar esta rota
 */
router.get('/', solicitacaoController.listarSolicitacoes);

/**
 * @openapi
 * /solicitacoes/{id}:
 *   get:
 *     summary: Busca solicitação por ID
 *     description: Retorna os detalhes de uma solicitação específica. Apenas gestores e administradores.
 *     tags:
 *       - Solicitações
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da solicitação
 *     responses:
 *       200:
 *         description: Sucesso ao buscar solicitação
 *       400:
 *         description: Gestor não encontrado
 *       403:
 *         description: Usuário precisa estar logado para ver a solicitação
 *       404:
 *         description: Solicitação não encontrada
 */
router.get('/:id', solicitacaoController.buscarSolicitacaoPorId);

/**
 * @openapi
 * /solicitacoes/{id}:
 *   get:
 *     summary: Busca solicitações por usuário
 *     description: Retorna todas as solicitações abertas por um usuário. Qualquer usuário logado.
 *     tags:
 *       - Solicitações
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sucesso ao buscar solicitação
 *       403:
 *         description: Usuário precisa estarlogado para ver suas solicitações
 *       404:
 *         description: Solicitação não encontrada
 */
router.get('/usuario/listar', solicitacaoController.listarSolicitacoesPorUsuario);

/**
 * @openapi
 * /solicitacoes/{id}/status:
 *   patch:
 *     summary: Altera status da solicitação
 *     description: Altera o status de uma solicitação (PENDENTE, EMANDAMENTO, CONCLUIDO, REJEITADO). Apenas gestores e administradores.
 *     tags:
 *       - Solicitações
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
 *               - SolicitacaoStatus
 *             properties:
 *               SolicitacaoStatus:
 *                 type: string
 *                 enum: [PENDENTE, EMANDAMENTO, CONCLUIDO, REJEITADO]
 *                 description: Novo status da solicitação
 *               SolicitacaoUsuarioFinalizou:
 *                 type: string
 *                 description: Usuário que finalizou (obrigatório para CONCLUIDO e REJEITADO)
 *     responses:
 *       200:
 *         description: Status da solicitação atualizado com sucesso
 *       400:
 *         description: Status inválido
 *       403:
 *         description: Apenas gestores e administradores podem acessar esta rota
 *       404:
 *         description: Solicitação não encontrada
 */
router.patch('/:id/status', solicitacaoController.alterarStatusSolicitacao);

module.exports = router;