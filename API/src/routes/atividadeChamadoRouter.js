// src/routes/atividadeChamadoRoutes.js
const express = require('express');
const atividadeChamadoController = require('../controllers/atividadeChamadoController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Todas as rotas de atividade exigem autenticação
router.use(authMiddleware);

/**
 * @openapi
 * /atividadechamado/chamado/{chamadoId}:
 *   get:
 *     summary: Lista atividades de um chamado
 *     description: Retorna todas as atividades registradas em um chamado específico. Requer autenticação.
 *     tags:
 *       - Atividades
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chamadoId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do chamado
 *       - in: query
 *         name: ordem
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Ordem das atividades por data (ascendente ou descendente)
 *     responses:
 *       200:
 *         description: Sucesso ao listar atividades
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AtividadeChamado'
 *                 total:
 *                   type: integer
 *                 chamado:
 *                   type: object
 *                   properties:
 *                     ChamadoId:
 *                       type: string
 *                     ChamadoTitulo:
 *                       type: string
 *                     ChamadoStatus:
 *                       type: string
 *       403:
 *         description: Sem permissão para visualizar atividades deste chamado
 *       404:
 *         description: Chamado não encontrado
 */
router.get('/chamado/:chamadoId', atividadeChamadoController.listarAtividadesPorChamado);

/**
 * @openapi
 * /atividadechamado/tecnico/{tecnicoId}:
 *   get:
 *     summary: Lista atividades de um técnico
 *     description: Retorna todas as atividades registradas por um técnico específico. Requer autenticação.
 *     tags:
 *       - Atividades
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
 *         name: dataInicio
 *         schema:
 *           type: string
 *           format: date
 *         description: Data inicial do período
 *       - in: query
 *         name: dataFim
 *         schema:
 *           type: string
 *           format: date
 *         description: Data final do período
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
 *         description: Sucesso ao listar atividades do técnico
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     tecnico:
 *                       $ref: '#/components/schemas/TecnicoResumo'
 *                     atividades:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/AtividadeComChamado'
 *                 paginacao:
 *                   $ref: '#/components/schemas/Paginacao'
 *       403:
 *         description: Sem permissão para visualizar atividades deste técnico
 *       404:
 *         description: Técnico não encontrado
 */
router.get('/tecnico/:tecnicoId', atividadeChamadoController.listarAtividadesPorTecnico);

/**
 * @openapi
 * /atividadechamado/chamado/{chamadoId}/estatisticas:
 *   get:
 *     summary: Estatísticas de atividades de um chamado
 *     description: Retorna estatísticas como total de atividades, técnicos envolvidos, primeira e última atividade. Requer autenticação.
 *     tags:
 *       - Atividades
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chamadoId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do chamado
 *     responses:
 *       200:
 *         description: Sucesso ao buscar estatísticas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     chamadoId:
 *                       type: string
 *                     totalAtividades:
 *                       type: integer
 *                     tecnicosEnvolvidos:
 *                       type: integer
 *                     primeiraAtividade:
 *                       type: object
 *                       properties:
 *                         data:
 *                           type: string
 *                           format: date-time
 *                         tecnicoId:
 *                           type: string
 *                     ultimaAtividade:
 *                       type: object
 *                       properties:
 *                         data:
 *                           type: string
 *                           format: date-time
 *                         tecnicoId:
 *                           type: string
 *       403:
 *         description: Sem permissão para visualizar estatísticas deste chamado
 *       404:
 *         description: Chamado não encontrado
 */
router.get('/chamado/:chamadoId/estatisticas', atividadeChamadoController.estatisticasPorChamado);

/**
 * @openapi
 * /atividadechamado/{id}:
 *   get:
 *     summary: Busca uma atividade por ID
 *     description: Retorna os detalhes completos de uma atividade específica. Requer autenticação.
 *     tags:
 *       - Atividades
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da atividade
 *     responses:
 *       200:
 *         description: Sucesso ao buscar atividade
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/AtividadeChamadoDetalhada'
 *       403:
 *         description: Sem permissão para visualizar esta atividade
 *       404:
 *         description: Atividade não encontrada
 */
router.get('/:id', atividadeChamadoController.buscarAtividadePorId);

/**
 * @openapi
 * /atividadechamado/chamado/{chamadoId}:
 *   post:
 *     summary: Cria uma nova atividade em um chamado
 *     description: Registra uma nova atividade em um chamado. Apenas técnicos da equipe responsável podem criar atividades.
 *     tags:
 *       - Atividades
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chamadoId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do chamado
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - AtividadeDescricao
 *             properties:
 *               AtividadeDescricao:
 *                 type: string
 *                 description: Descrição da atividade realizada
 *     responses:
 *       201:
 *         description: Atividade registrada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/AtividadeChamado'
 *       400:
 *         description: Dados inválidos ou status do chamado não permite atividades
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Apenas técnicos podem registrar atividades ou técnico não pertence à equipe
 *       404:
 *         description: Chamado não encontrado
 */
router.post('/chamado/:chamadoId', atividadeChamadoController.criarAtividade);

/**
 * @openapi
 * /atividadechamado/{id}:
 *   put:
 *     summary: Altera uma atividade existente
 *     description: Altera a descrição de uma atividade. Apenas o técnico que criou a atividade pode alterá-la.
 *     tags:
 *       - Atividades
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da atividade
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - AtividadeDescricao
 *             properties:
 *               AtividadeDescricao:
 *                 type: string
 *                 description: Nova descrição da atividade
 *     responses:
 *       200:
 *         description: Atividade atualizada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/AtividadeChamado'
 *       400:
 *         description: Dados inválidos ou chamado já está concluído/cancelado
 *       403:
 *         description: Apenas o técnico que criou a atividade pode alterá-la
 *       404:
 *         description: Atividade não encontrada
 */
router.put('/:id', atividadeChamadoController.alterarAtividade);

/**
 * @openapi
 * /atividadechamado/{id}:
 *   delete:
 *     summary: Exclui uma atividade
 *     description: Exclui uma atividade. Apenas o técnico que criou a atividade pode excluí-la.
 *     tags:
 *       - Atividades
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da atividade
 *     responses:
 *       200:
 *         description: Atividade excluída com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Não é possível excluir atividades de chamados concluídos ou cancelados
 *       403:
 *         description: Apenas o técnico que criou a atividade pode excluí-la
 *       404:
 *         description: Atividade não encontrada
 */
router.delete('/:id', atividadeChamadoController.excluirAtividade);

module.exports = router;