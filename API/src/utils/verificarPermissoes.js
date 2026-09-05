const tiposValidosAdm = ['ALTERACAODADOSGESTORADM', 'CADASTROGESTORADM', 'SOLICITARTROCAUNIDADEPESSOAGESTOR'];
const tiposValidosGestor = ['CADASTROPESSOAUNIDADE', 'ALTERACAODADOSPESSOA', 'ALTERACAODADOSTECNICO', 'SOLICITARTROCAUNIDADEPESSOA', 'DIVERSAS'];
const tiposValidosGestorAdm = ['CADASTROPESSOAUNIDADE', 'ALTERACAODADOSPESSOA', 'ALTERACAODADOSTECNICO', 'ALTERACAODADOSGESTORCOMUM', 'SOLICITARTROCAUNIDADEPESSOA', 'DIVERSAS'];

function verficarPermissaoSolicitacao(tipoSolicitacao, usuarioTipo, usuarioNivel) {
    switch (usuarioTipo) {
        case 'GESTOR':
            if (usuarioNivel === 'ADMINUNIDADE') {
                if (!tiposValidosGestorAdm.includes(tipoSolicitacao)) {
                    return false;
                } else {
                    return true;
                }
            } else if (usuarioNivel === 'COMUM') {
                if (!tiposValidosGestor.includes(tipoSolicitacao)) {
                    return false;
                } else {
                    return true;
                }
            } else {
                return false;
            }
        case 'PESSOA':
            return false;
        case 'TECNICO':
            return false;
        case 'ADMINISTRADOR':
            if (!tiposValidosAdm.includes(tipoSolicitacao)) {
                return false;
            } else {
                return true;
            }
        default:
            return false;
    }
}

module.exports = {
    verficarPermissaoSolicitacao
};
