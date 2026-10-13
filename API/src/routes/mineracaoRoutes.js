// src/routes/mineracaoRoutes.js
const express = require('express');
const router = express.Router();
const mineracaoController = require('../controllers/mineracaoController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

// Execuções
router.get('/execucoes', mineracaoController.listarExecucoes);
router.get('/execucoes/:id', mineracaoController.buscarExecucaoPorId);
router.delete('/execucoes/:id', mineracaoController.deletarExecucao);

// Configuração da unidade
router.get('/unidades/:unidadeId/configuracao', mineracaoController.buscarConfiguracao);
//router.post('/unidades/:unidadeId/configuracao', mineracaoController.criarConfiguracao);

// Executar mineração
router.post('/unidades/:unidadeId/executar', mineracaoController.executarMineracao);

module.exports = router;