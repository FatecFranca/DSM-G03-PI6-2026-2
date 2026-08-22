// src/routes/chamadoRoutes.js
const express = require('express');
const chamadoController = require('../controllers/chamadoController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Todas as rotas de chamado exigem autenticação
router.use(authMiddleware);

// Rotas de listagem e estatísticas
/**
* @openapi
* /chamados:
*  get:
*   summary: Retorna a lista de chamados
*   description: Retorna todos os chamados. Requer autenticação.
*   tags:
*    - Chamados
*   security:
*    - bearerAuth: []
*   parameters:
*    - in: query
*      name: unidadeId
*      schema:
*       type: integer
*      description: Filtra por ID da unidade
*    - in: query
*      name: pessoaId
*      schema:
*       type: string
*      description: Filtra por ID da pessoa
*    - in: query
*      name: equipeId
*      schema:
*       type: string
*      description: Filtra por ID da equipe
*    - in: query
*      name: tipoSuporteId
*      schema:
*       type: integer
*      description: Filtra por ID do tipo de suporte
*    - in: query
*      name: status
*      schema:
*       type: string
*      description: Filtra por status (separar múltiplos por vírgula)
*    - in: query
*      name: urgencia
*      schema:
*       type: string
*      description: Filtra por urgência (BAIXA,MEDIA,ALTA,URGENTE)
*    - in: query
*      name: prioridadeMin
*      schema:
*       type: integer
*      description: Prioridade mínima (1-10)
*    - in: query
*      name: prioridadeMax
*      schema:
*       type: integer
*      description: Prioridade máxima (1-10)
*    - in: query
*      name: dataInicio
*      schema:
*       type: string
*       format: date
*      description: Data de início do período
*    - in: query
*      name: dataFim
*      schema:
*       type: string
*       format: date
*      description: Data de fim do período
*    - in: query
*      name: pagina
*      schema:
*       type: integer
*       default: 1
*      description: Número da página
*    - in: query
*      name: limite
*      schema:
*       type: integer
*       default: 10
*      description: Itens por página
*   responses:
*    200:
*     description: Sucesso ao buscar chamados.
*     content:
*      application/json:
*       schema:
*        type: object
*        properties:
*         data:
*          type: array
*          items:
*           $ref: '#/components/schemas/Chamado'
*         paginacao:
*          type: object
*          properties:
*           paginaAtual:
*            type: integer
*           limitePorPagina:
*            type: integer
*           totalRegistros:
*            type: integer
*           totalPaginas:
*            type: integer
*/
router.get('/', chamadoController.listarChamados);

/**
* @openapi
* /chamados/estatisticas:
*  get:
*   summary: Retorna estatísticas dos chamados
*   description: Retorna estatísticas como total, por status, por urgência, etc. Requer autenticação.
*   tags:
*    - Chamados
*   security:
*    - bearerAuth: []
*   parameters:
*    - in: query
*      name: unidadeId
*      schema:
*       type: integer
*      description: ID da unidade (apenas administrador)
*    - in: query
*      name: periodo
*      schema:
*       type: string
*       enum: [7d, 30d, 90d]
*       default: 30d
*      description: Período de análise (7d=7 dias, 30d=30 dias, 90d=90 dias)
*   responses:
*    200:
*     description: Sucesso ao buscar estatísticas.
*     content:
*      application/json:
*       schema:
*        type: object
*        properties:
*         data:
*          type: object
*          properties:
*           periodo:
*            type: object
*            properties:
*             dataInicio:
*              type: string
*              format: date-time
*             dataFim:
*              type: string
*              format: date-time
*           total:
*            type: integer
*           porStatus:
*            type: object
*            additionalProperties:
*             type: integer
*           porUrgencia:
*            type: object
*            additionalProperties:
*             type: integer
*/
router.get('/estatisticas', chamadoController.estatisticas);

/**
* @openapi
* /chamados/{id}:
*  get:
*   summary: Retorna um chamado específico
*   description: Retorna os detalhes de um chamado pelo ID. Requer autenticação.
*   tags:
*    - Chamados
*   security:
*    - bearerAuth: []
*   parameters:
*    - in: path
*      name: id
*      required: true
*      schema:
*       type: integer
*      description: ID do chamado
*   responses:
*    200:
*     description: Sucesso ao buscar chamado.
*     content:
*      application/json:
*       schema:
*        type: object
*        properties:
*         data:
*          $ref: '#/components/schemas/ChamadoDetalhado'
*    404:
*     description: Chamado não encontrado
*    403:
*     description: Sem permissão para visualizar este chamado
*/
router.get('/:id', chamadoController.buscarChamadoPorId);

// Rotas de criação e alteração
/**
* @openapi
* /chamados:
*  post:
*   summary: Abrir novo chamado
*   description: Cria um novo chamado. Apenas usuários do tipo PESSOA podem abrir chamados.
*   tags:
*    - Chamados
*   security:
*    - bearerAuth: []
*   requestBody:
*    required: true
*    content:
*     application/json:
*      schema:
*       type: object
*       required:
*        - ChamadoDescricaoInicial
*        - ChamadoDiasComProblema
*        - ChamadoRiscoVidaHumana
*        - ChamadoRiscoVidaAnimal
*        - ChamadoBloqueioVia
*        - TipSupId
*       properties:
*        ChamadoDescricaoInicial:
*         type: string
*         description: Descrição inicial do problema
*        ChamadoDiasComProblema:
*         type: integer
*         minimum: 1
*         description: Quantos dias o problema persiste
*        ChamadoRiscoVidaHumana:
*         type: boolean
*         description: Há risco de vida humana?
*        ChamadoRiscoVidaAnimal:
*         type: boolean
*         description: Há risco de vida animal?
*        ChamadoBloqueioVia:
*         type: boolean
*         description: Há bloqueio de via?
*        TipSupId:
*         type: integer
*         description: ID do tipo de suporte
*   responses:
*    201:
*     description: Chamado aberto com sucesso
*     content:
*      application/json:
*       schema:
*        type: object
*        properties:
*         message:
*          type: string
*         data:
*          $ref: '#/components/schemas/Chamado'
*    400:
*     description: Dados inválidos ou faltando
*    403:
*     description: Apenas pessoas podem abrir chamados
*/
router.post('/', chamadoController.abrirChamado);

/**
* @openapi
* /chamados/{id}:
*  put:
*   summary: Alterar chamado
*   description: Altera os dados de um chamado. Permissões -> PESSOA que abriu (apenas campos básicos), GESTOR da unidade (todos os campos).
*   tags:
*    - Chamados
*   security:
*    - bearerAuth: []
*   parameters:
*    - in: path
*      name: id
*      required: true
*      schema:
*       type: integer
*      description: ID do chamado
*   requestBody:
*    required: true
*    content:
*     application/json:
*      schema:
*       type: object
*       properties:
*        TipSupId:
*         type: integer
*         description: ID do tipo de suporte (apenas gestor)
*        EquipeId:
*         type: string
*         description: ID da equipe (apenas gestor)
*        ChamadoTitulo:
*         type: string
*         description: Título do chamado (apenas gestor)
*        ChamadoDescricaoInicial:
*         type: string
*         description: Descrição inicial (pessoa) ou descrição formatada (gestor)
*        ChamadoPrioridade:
*         type: integer
*         minimum: 1
*         maximum: 10
*         description: Prioridade (apenas gestor)
*        ChamadoUrgencia:
*         type: string
*         enum: [BAIXA, MEDIA, ALTA, URGENTE]
*         description: Urgência (apenas gestor)
*        ChamadoDiasComProblema:
*         type: integer
*         minimum: 1
*         description: Dias com problema (apenas pessoa)
*        ChamadoRiscoVidaHumana:
*         type: boolean
*         description: Risco de vida humana (apenas pessoa)
*        ChamadoRiscoVidaAnimal:
*         type: boolean
*         description: Risco de vida animal (apenas pessoa)
*        ChamadoBloqueioVia:
*         type: boolean
*         description: Via bloqueada (apenas pessoa)
*   responses:
*    200:
*     description: Chamado atualizado com sucesso
*     content:
*      application/json:
*       schema:
*        type: object
*        properties:
*         message:
*          type: string
*         data:
*          $ref: '#/components/schemas/Chamado'
*    400:
*     description: Dados inválidos ou faltando
*    403:
*     description: Sem permissão para alterar este chamado
*    404:
*     description: Chamado não encontrado
*/
router.put('/:id', chamadoController.alterarChamado);

/**
* @openapi
* /chamados/{id}/status:
*  patch:
*   summary: Alterar status do chamado
*   description: Altera o status de um chamado. Gestor pode alterar qualquer status, técnico pode alterar (exceto cancelar/recusar), pessoa só pode cancelar.
*   tags:
*    - Chamados
*   security:
*    - bearerAuth: []
*   parameters:
*    - in: path
*      name: id
*      required: true
*      schema:
*       type: integer
*      description: ID do chamado
*   requestBody:
*    required: true
*    content:
*     application/json:
*      schema:
*       type: object
*       required:
*        - ChamadoStatus
*       properties:
*        ChamadoStatus:
*         type: string
*         enum: [PROCESSAMENTO, PENDENTE, ANALISADO, ATRIBUIDO, EMATENDIMENTO, CONCLUIDO, CANCELADO, RECUSADO, FALTAINFORMACAO]
*         description: Novo status do chamado
*        ChamadoDescricaoFormatada:
*         type: string
*         description: Motivo da recusa (obrigatório se status for RECUSADO)
*        ChamadoEquipeId:
*         type: string
*         description: ID da equipe (obrigatório se status for ATRIBUIDO)
*   responses:
*    200:
*     description: Status atualizado com sucesso
*     content:
*      application/json:
*       schema:
*        type: object
*        properties:
*         message:
*          type: string
*         data:
*          $ref: '#/components/schemas/Chamado'
*    400:
*     description: Status inválido ou transição não permitida
*    403:
*     description: Sem permissão para alterar status
*    404:
*     description: Chamado não encontrado
*/
router.patch('/:id/status', chamadoController.alterarStatus);

/**
* @openapi
* /chamados/{id}/atribuir-equipe:
*  patch:
*   summary: Atribuir equipe ao chamado
*   description: Atribui uma equipe para atender o chamado. Apenas gestor da unidade.
*   tags:
*    - Chamados
*   security:
*    - bearerAuth: []
*   parameters:
*    - in: path
*      name: id
*      required: true
*      schema:
*       type: integer
*      description: ID do chamado
*   requestBody:
*    required: true
*    content:
*     application/json:
*      schema:
*       type: object
*       required:
*        - EquipeId
*       properties:
*        EquipeId:
*         type: string
*         description: ID da equipe a ser atribuída
*   responses:
*    200:
*     description: Equipe atribuída com sucesso
*     content:
*      application/json:
*       schema:
*        type: object
*        properties:
*         message:
*          type: string
*         data:
*          $ref: '#/components/schemas/Chamado'
*    400:
*     description: ID da equipe inválido
*    403:
*     description: Apenas gestores podem atribuir equipes
*    404:
*     description: Chamado ou equipe não encontrado
*/
router.patch('/:id/atribuir-equipe', chamadoController.atribuirEquipe);

module.exports = router;