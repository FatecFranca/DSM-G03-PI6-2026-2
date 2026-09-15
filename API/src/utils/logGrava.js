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

ALTERARADMINISTRADOR -> Controller (adminController.js) -> Alterar administrador pelo mesmo administrador logado

LOGINADMINISTRADOR -> Controller (adminController.js) -> Realizado login por um administrador

CRIARATIVIDADE -> Controller (atividadeChamadoController.js) -> Criar atividade por um técnico logado

ALTERARATIVIDADE -> Controller (atividadeChamadoController.js) -> Alterar atividade por um técnico logado

EXCLUIRATIVIDADE -> Controller (atividadeChamadoController.js) -> Excluir atividade por um técnico logado

ALTERARSTATUSCHAMADO -> Controller (chamadoController.js e atividadeChamadoController.js) -> Alterar status do chamado por um técnico/gestor/pessoa logado

CRIARCHAMADO -> Controller (chamadoController.js) -> Criar chamado por uma pessoa logada

ATRIBUIREQUIPECHAMADO -> Controller (chamadoController.js) -> Atribuir equipe ao chamado por um gestor logado

ALTERARCHAMADO -> Controller (chamadoController.js) -> Alterar chamado por uma pessoa logada

CRIARDEPARTAMENTO -> Controller (departamentoController.js) -> Criar departamento por um gestor logado

ALTERARDEPARTAMENTO -> Controller (departamentoController.js) -> Alterar departamento por um gestor logado

ALTERARSTATUSDEPARTAMENTO -> Controller (departamentoController.js) -> Alterar status do departamento por um gestor logado

CRIAREQUIPE -> Controller (equipeController.js) -> Criar equipe por um gestor logado

ALTERAREQUIPE -> Controller (equipeController.js) -> Alterar equipe por um gestor logado

ALTERARSTATUSEQUIPE -> Controller (equipeController.js) -> Alterar status da equipe por um gestor logado

ADICIONARTECNICOEQUIPE -> Controller (equipeController.js) -> Adicionar técnico à equipe por um gestor logado

REMOVERTECNICOEQUIPE -> Controller (equipeController.js) -> Remover técnico da equipe por um gestor logado

EXCLUIRVINCULOTECNICOEQUIPE -> Controller (equipeController.js) -> Excluir vínculo do técnico à equipe por um gestor logado

LOGINPESSOA -> Controller (pessoaController.js) -> Realizado login por uma pessoa

CRIARPESSOA -> Controller (pessoaController.js) -> Criar pessoa por um gestor logado

ALTERARPESSOA -> Controller (pessoaController.js) -> Alterar pessoa por um gestor logado ou pela própria pessoa logada

ALTERARSTATUSPESSOA -> Controller (pessoaController.js) -> Alterar status da pessoa por um gestor logado

CRIARTECNICO -> Controller (tecnicoController.js) -> Criar tecnico por um gestor logado

ALTERARTECNICO -> Controller (tecnicoController.js) -> Alterar tecnico por um gestor logado ou pelo próprio tecnico logada

ALTERARSTATUSTECNICO -> Controller (tecnicoController.js) -> Alterar staus de tecnico por um gestor logado

*/