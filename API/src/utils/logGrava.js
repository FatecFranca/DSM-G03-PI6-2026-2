// src/utils/logGrava.js
const prisma = require('../prisma.js');
const { getBrasilDateTime } = require('./dataBrasilObter.js');

async function gravarLog(LogUsuId, LogAcao, LogTipoRelacao, LogDetalhe, LogChave) {

    // Adicionar registro na tabela log
    const logGra = await prisma.log.create({
        data: {
            LogChave: LogChave,
            LogUsuId: LogUsuId,
            LogAcao: LogAcao,
            LogTipoRelacao: LogTipoRelacao,
            LogDetalhe: LogDetalhe,
            LogData: getBrasilDateTime()
        },

    });

    return logGra;

}

module.exports = { gravarLog };

// Todos os logs existes
/*

CADASTRARGESTORADM -> Controller (gestorController.js) -> Cadastrar gestor ADMUNIDADE por um ADMINISTRADOR

CADASTRARGESTORCOMUM -> Controller (gestorController.js) -> Cadastrar gestor COMUM por um ADMINISTRADOR ou GESTOR de Nível ADMUNIDADE

ALTERARGESTOR -> Controller (gestorController.js) -> Alterado gestor por um ADMINISTRADOR ou GESTOR de Nível ADMUNIDADE

ALTERARSTATUSGESTOR -> Controller (gestorController.js) -> Alterado status de gestor por um ADMINISTRADOR ou GESTOR de Nível ADMUNIDADE

LOGINGESTOR -> Controller (gestorController.js) -> Realizado login por um gestor

CADASTRARUNIDADE -> Controller (unidadeController.js) -> Cadastrar unidade por ADMINISTRADOR

ALTERARUNIDADE -> Controller (unidadeController.js) -> Alterar unidade por ADMINISTRADOR

ALTERARSTATUSUNIDADE -> Controller (unidadeController.js) -> Alterar status de unidade por ADMINISTRADOR

CADASTRARTIPOSUPORTE -> Controller (tipoSuporteController.js) -> Cadastrar tipo de suporte por ADMINISTRADOR

ALTERARTIPOSUPORTE -> Controller (tipoSuporteController.js) -> Alterar tipo de suporte por ADMINISTRADOR

ALTERARSTATUSTIPOSUPORTE -> Controller (tipoSuporteController.js) -> Alterar status de tipo de suporte por ADMINISTRADOR

VINCULARUNIDADEIPOSUPORTE -> Controller (tipoSuporteController.js) -> Vincular tipo de suporte com unidade por ADMINISTRADOR

DESVINCULARUNIDADEIPOSUPORTE -> Controller (tipoSuporteController.js) -> Desvincular tipo de suporte com unidade por ADMINISTRADOR

ALTERARSTATUSVINCULOUNIDADEIPOSUPORTE -> Controller (tipoSuporteController.js) -> Alterar status de vinculo de tipo de suporte com unidade por ADMINISTRADOR

ABRIRSOLICITACAO -> Controller (solicitacaoController.js) -> Abrir solicitação por um usuário não logado, por uma pessoa logada ou por um gestor logado

ALTERARSTATUSSOLICITACAO -> Controller (solicitacaoController.js) -> Alterar status da solicitação por gestor ou administrador

*/