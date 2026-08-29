// src/controllers/solicitacaoController.js
const prisma = require('../prisma.js');
const { getBrasilDateTime } = require('../utils/dataBrasilObter.js');
const { gravarLog } = require('../utils/logGrava.js');

// Para todas as funções
const statusValidos = ['PENDENTE', 'EMATENDIMENTO', 'CONCLUIDO', 'RECUSADO', 'FALTAINFORMACAO', 'CANCELADO']
const tiposValidos = ['CADASTROPESSOAUNIDADE', 'ALTERACAODADOSPESSOA', 'ALTERACAODADOSTECNICO', 'ALTERACAODADOSGESTORCOMUM', 'ALTERACAODADOSGESTORADM', 'CADASTROGESTORADM', 'SOLICITARTROCAUNIDADEPESSOA', 'SOLICITARTROCAUNIDADEPESSOAGESTOR', 'DIVERSAS'];
const tiposValidosAdm = ['ALTERACAODADOSGESTORADM', 'CADASTROGESTORADM', 'SOLICITARTROCAUNIDADEPESSOAGESTOR'];
const tiposValidosGestor = ['CADASTROPESSOAUNIDADE', 'ALTERACAODADOSPESSOA', 'ALTERACAODADOSTECNICO', 'SOLICITARTROCAUNIDADEPESSOA'];
const tiposValidosGestorAdm = ['CADASTROPESSOAUNIDADE', 'ALTERACAODADOSPESSOA', 'ALTERACAODADOSTECNICO', 'ALTERACAODADOSGESTORCOMUM', 'SOLICITARTROCAUNIDADEPESSOA'];

class SolicitacaoController {

    // =============================================
    // ABRIR SOLICITAÇÃO (PÚBLICO - NÃO EXIGE LOGIN)
    // =============================================
    async abrirSolicitacao(req, res) {
        try {
            const {
                UnidadeId,
                SolicitacaoTipo,
                SolicitacaoDescricao,
                SolicitacaoSolicitanteNome,
                SolicitacaoSolicitanteEmail,
                SolicitacaoSolicitanteTelefone
            } = req.body;

            // Validações básicas
            if (!SolicitacaoTipo || !SolicitacaoTipo.trim()) {
                return res.status(400).json({
                    error: 'Tipo da solicitação é obrigatório'
                });
            }

            if (!SolicitacaoDescricao || !SolicitacaoDescricao.trim()) {
                return res.status(400).json({
                    error: 'Descrição da solicitação é obrigatória'
                });
            }

            // Validar tipos permitidos
            if (!tiposValidos.includes(SolicitacaoTipo)) {
                return res.status(400).json({
                    error: 'Tipo de solcitação inválido'
                });
            }

            // Se UnidadeId for fornecido, verificar se existe
            if (UnidadeId) {
                const unidadeIdInt = parseInt(UnidadeId);
                if (isNaN(unidadeIdInt)) {
                    return res.status(400).json({
                        error: 'ID da unidade inválido'
                    });
                }

                const unidade = await prisma.unidade.findUnique({
                    where: { UnidadeId: unidadeIdInt }
                });

                if (!unidade) {
                    return res.status(404).json({
                        error: 'Unidade não encontrada'
                    });
                }
            }

            // Validar que pelo menos nome OU email OU telefone foi fornecido
            let SolicitacaoIdRelacional;
            let UnidadeIdGrava;
            let usuarioLogado;

            if (req.usuario) {
                SolicitacaoIdRelacional = req.usuario.usuarioId;
                switch (req.usuario.usuarioTipo) {
                    case "TECNICO":
                        usuarioLogado = await prisma.tecnico.findUnique({
                            where: { TecnicoId: req.usuario.usuarioId }
                        });
                        UnidadeIdGrava = usuarioLogado.UnidadeId;
                        break;
                    case "PESSOA":
                        usuarioLogado = await prisma.pessoa.findUnique({
                            where: { PessoaId: req.usuario.usuarioId }
                        });
                        UnidadeIdGrava = usuarioLogado.UnidadeId;
                        break;
                    case "GESTOR":
                        usuarioLogado = await prisma.gestor.findUnique({
                            where: { GestorId: req.usuario.usuarioId, GestorStatus: 'ATIVO' }
                        });
                        UnidadeIdGrava = usuarioLogado.UnidadeId;
                        break;
                    case "ADMINISTRADOR":
                        usuarioLogado = await prisma.administrador.findUnique({
                            where: { AdministradorId: parseInt(req.usuario.usuarioId) }
                        });
                        UnidadeIdGrava = null;
                        break;
                    default:
                        return res.status(404).json({
                            error: 'Tipo de usuário logado não identificado'
                        });
                }
            } else {
                if (!UnidadeId) {
                    return res.status(404).json({
                        error: 'É necessário iformar a unidade para qual será enviada a solicitação'
                    });
                } else {
                    UnidadeIdGrava = parseInt(UnidadeId);

                    if (!SolicitacaoSolicitanteNome) {
                        return res.status(400).json({
                            error: 'É necessário fornecer o nome do solicitante'
                        });
                    }

                    if (!SolicitacaoSolicitanteEmail) {
                        return res.status(400).json({
                            error: 'É necessário fornecer o e-mail do solicitante para contato'
                        });
                    }

                    if (!SolicitacaoSolicitanteTelefone) {
                        return res.status(400).json({
                            error: 'É necessário fornecer o telefone do solicitante para contato'
                        });
                    }
                }
            }

            // Se IdRelacional for fornecido, verificar se é um UUID válido (opcional)
            // Não validamos se existe, pois pode ser de uma entidade que ainda será criada

            // Criar solicitação
            const solicitacao = await prisma.solicitacao.create({
                data: {
                    UnidadeId: UnidadeIdGrava,
                    SolicitacaoTipo: SolicitacaoTipo.trim(),
                    SolicitacaoDescricao: SolicitacaoDescricao.trim(),
                    SolicitacaoIdRelacional: SolicitacaoIdRelacional?.trim() || null,
                    SolicitacaoSolicitanteNome: SolicitacaoSolicitanteNome?.trim() || null,
                    SolicitacaoSolicitanteEmail: SolicitacaoSolicitanteEmail?.trim() || null,
                    SolicitacaoSolicitanteTelefone: SolicitacaoSolicitanteTelefone?.trim() || null,
                    SolicitacaoStatus: 'PENDENTE',
                    SolicitacaoUsuarioFinalizou: null,
                    SolicitacaoDtCadastro: getBrasilDateTime()
                },
                include: {
                    Unidade: {
                        select: {
                            UnidadeId: true,
                            UnidadeNome: true,
                            UnidadeStatus: true
                        }
                    }
                }
            });

            // --- Gravar log de criação (apenas se houver usuário logado)
            let LogTipoRelacao = 'OUTRO';
            let LogUsuId = null;
            if (req.usuario) {
                LogTipoRelacao = req.usuario.usuarioTipo;
                LogUsuId = String(req.usuario.usuarioId).trim()
            }

            const LogAcao = 'ABRIRSOLICITACAO';
            const LogDetalhe = 'Foi aberta uma solicitação de ID (' + solicitacao.SolicitacaoId + ') do tipo (' + solicitacao.SolicitacaoTipo + ')';
            await gravarLog(
                LogUsuId,
                LogAcao,
                LogTipoRelacao,
                LogDetalhe,
                solicitacao.SolicitacaoId
            );
            // ---

            return res.status(201).json({
                message: 'Solicitação aberta com sucesso',
                data: solicitacao
            });

        } catch (error) {
            console.error('Erro ao abrir solicitação:', error);
            return res.status(500).json({
                error: 'Erro ao abrir solicitação'
            });
        }
    }

    // =============================================
    // LISTAR SOLICITAÇÕES (GESTOR/ADMIN)
    // =============================================
    async listarSolicitacoes(req, res) {
        try {
            const {
                status,
                tipo,
                unidadeId,
                pagina = 1,
                limite = 10
            } = req.query;

            const usuarioLogado = req.usuario;

            // Verificar se o usuário é GESTOR ou ADMINISTRADOR
            if (usuarioLogado.usuarioTipo !== 'ADMINISTRADOR' && usuarioLogado.usuarioTipo !== 'GESTOR') {
                return res.status(403).json({
                    error: 'Apenas gestores e administradores podem acessar esta rota'
                });
            }

            // Construir filtro
            const filtro = {};

            // Filtrar por status
            if (status) {
                if (!statusValidos.includes(status)) {
                    return res.status(400).json({
                        error: 'Status inválido para filtro'
                    });
                }
                filtro.SolicitacaoStatus = status;
            }

            // Filtrar por tipo
            if (tipo) {
                if (!tiposValidos.includes(tipo)) {
                    return res.status(400).json({
                        error: 'Tipo inválido para filtro'
                    });
                }
                filtro.SolicitacaoTipo = tipo;
            } else {
                return res.status(400).json({
                    error: 'Tipo é necessário para filtro'
                });
            }

            // Filtrar por unidade
            if (unidadeId) {
                const unidadeIdInt = parseInt(unidadeId);
                if (isNaN(unidadeIdInt)) {
                    return res.status(400).json({
                        error: 'ID da unidade inválido'
                    });
                }
                filtro.UnidadeId = unidadeIdInt;
            }

            // Se for GESTOR, filtrar apenas solicitações da sua unidade
            if (usuarioLogado.usuarioTipo === 'GESTOR') {
                const gestor = await prisma.gestor.findUnique({
                    where: { GestorId: usuarioLogado.usuarioId, GestorStatus: 'ATIVO' }
                });

                if (!gestor) {
                    return res.status(403).json({
                        error: 'Gestor não encontrado'
                    });
                }

                if (gestor.GestorNivel = 'ADMINUNIDADE') {
                    if (!tiposValidosGestorAdm.includes(tipo)) {
                        return res.status(400).json({
                            error: 'Tipo inválido para usuário gestor'
                        });
                    }
                } else {
                    if (!tiposValidosGestor.includes(tipo)) {
                        return res.status(400).json({
                            error: 'Tipo inválido para o nível de gestor'
                        });
                    }
                }

                // Se o gestor tiver uma unidade vinculada, filtrar por ela
                if (gestor.UnidadeId) {
                    filtro.UnidadeId = gestor.UnidadeId;
                }
            } else if (usuarioLogado.usuarioTipo === 'ADMINISTRADOR') {
                const administrador = await prisma.administrador.findUnique({
                    where: { AdministradorId: usuarioLogado.usuarioId }
                });

                if (!administrador) {
                    return res.status(403).json({
                        error: 'Administrador não encontrado'
                    });
                }

                if (!tiposValidosAdm.includes(tipo)) {
                    return res.status(400).json({
                        error: 'Tipo inválido para o usuário'
                    });
                }
            }

            // Calcular paginação
            const paginaAtual = parseInt(pagina);
            const limitePorPagina = parseInt(limite);
            const skip = (paginaAtual - 1) * limitePorPagina;

            // Buscar solicitações
            const [solicitacoes, total] = await prisma.$transaction([
                prisma.solicitacao.findMany({
                    where: filtro,
                    orderBy: {
                        SolicitacaoId: 'desc'
                    },
                    skip: skip,
                    take: limitePorPagina,
                    include: {
                        Unidade: {
                            select: {
                                UnidadeId: true,
                                UnidadeNome: true,
                                UnidadeStatus: true
                            }
                        }
                    }
                }),
                prisma.solicitacao.count({
                    where: filtro
                })
            ]);

            return res.status(200).json({
                data: solicitacoes,
                paginacao: {
                    paginaAtual,
                    limitePorPagina,
                    totalRegistros: total,
                    totalPaginas: Math.ceil(total / limitePorPagina)
                }
            });

        } catch (error) {
            console.error('Erro ao listar solicitações:', error);
            return res.status(500).json({
                error: 'Erro ao listar solicitações'
            });
        }
    }

    // =============================================
    // BUSCAR SOLICITAÇÃO POR ID (SOLICITANTE)
    // =============================================
    async listarSolicitacoesPorUsuario(req, res) {
        try {
            const usuarioLogado = req.usuario;

            // Verificar se o usuário é GESTOR ou ADMINISTRADOR
            if (usuarioLogado.usuarioTipo !== 'ADMINISTRADOR' && usuarioLogado.usuarioTipo !== 'GESTOR' && usuarioLogado.usuarioTipo !== 'PESSOA' && usuarioLogado.usuarioTipo !== 'TECNICO') {
                return res.status(403).json({
                    error: 'Usuário precisa estarlogado para ver suas solicitações'
                });
            }

            const SolicitacaoIdRelacional = String(usuarioLogado.usuarioId);

            // Buscar solicitação
            const solicitacoes = await prisma.solicitacao.findMany({
                where: {
                    SolicitacaoIdRelacional: SolicitacaoIdRelacional
                },
                include: {
                    Unidade: {
                        select: {
                            UnidadeId: true,
                            UnidadeNome: true,
                            UnidadeStatus: true
                        }
                    },
                    AtividadeSolicitacao: {
                        orderBy: {
                            AtivSolDt: 'desc'
                        },
                        take: 10
                    }
                }
            });

            return res.status(200).json({
                data: solicitacoes
            });

        } catch (error) {
            console.error('Erro ao buscar solicitações:', error);
            return res.status(500).json({
                error: 'Erro ao buscar solicitações'
            });
        }
    }

    // =============================================
    // BUSCAR SOLICITAÇÃO POR ID (SOLICITANTE)
    // =============================================
    async buscarSolicitacaoPorId(req, res) {
        try {
            const id = req.params;
            const usuarioLogado = req.usuario;

            // Verificar se o usuário é GESTOR ou ADMINISTRADOR
            if (usuarioLogado.usuarioTipo !== 'ADMINISTRADOR' && usuarioLogado.usuarioTipo !== 'GESTOR' && usuarioLogado.usuarioTipo !== 'PESSOA' && usuarioLogado.usuarioTipo !== 'TECNICO') {
                return res.status(403).json({
                    error: 'Usuário precisa estar logado para ver a solicitação'
                });
            }

            // Buscar solicitação
            const solicitacao = await prisma.solicitacao.findUnique({
                where: {
                    SolicitacaoId: id
                },
                include: {
                    Unidade: {
                        select: {
                            UnidadeId: true,
                            UnidadeNome: true,
                            UnidadeStatus: true
                        }
                    },
                    AtividadeSolicitacao: {
                        orderBy: {
                            AtivSolDt: 'desc'
                        },
                        take: 10
                    }
                }
            });

            if (usuarioLogado.usuarioTipo === 'PESSOA' || usuarioLogado.usuarioTipo === 'TECNICO') {
                if (solicitacao.SolicitacaoIdRelacional !== usuarioLogado.usuarioId) {
                    return res.status(403).json({
                        error: 'Você só pode ver as suas solicitações'
                    });
                }
            } else if (usuarioLogado.usuarioTipo === 'GESTOR') {
                const gestor = await prisma.gestor.findUnique({
                    where: {
                        GestorId: usuarioLogado.usuarioId, GestorStatus: 'ATIVO'
                    }
                });

                if (!gestor){
                    return res.status(400).json({
                        error: 'Gestor não encontrado'
                    });
                }

                if (gestor.UnidadeId !== solicitacao.UnidadeId){
                    return res.status(403).json({
                        error: 'Você só pode visualizar as solicitações da sua unidade'
                    });
                }
            }

            return res.status(200).json({
                data: solicitacao
            });

        } catch (error) {
            console.error('Erro ao buscar solicitação:', error);
            return res.status(500).json({
                error: 'Erro ao buscar solicitação'
            });
        }
    }

    // =============================================
    // ALTERAR STATUS DA SOLICITAÇÃO (GESTOR/ADMIN)
    // =============================================
    async alterarStatusSolicitacao(req, res) {
        try {
            const { id } = req.params;
            const { SolicitacaoStatus } = req.body;
            const usuarioLogado = req.usuario;

            // Verificar se o usuário é GESTOR ou ADMINISTRADOR ou TECNICO ou PESSOA
            if (usuarioLogado.usuarioTipo !== 'ADMINISTRADOR' && usuarioLogado.usuarioTipo !== 'GESTOR' && usuarioLogado.usuarioTipo !== 'PESSOA' && usuarioLogado.usuarioTipo !== 'TECNICO') {
                return res.status(403).json({
                    error: 'Apenas usuários logados podem acessar esta rota'
                });
            }

            // Validar status
            if (!SolicitacaoStatus) {
                return res.status(400).json({
                    error: 'Status é obrigatório'
                });
            }

            if (!statusValidos.includes(SolicitacaoStatus)) {
                return res.status(400).json({
                    error: 'Status inválido para alteração'
                });
            }

            if (usuarioLogado.usuarioTipo === 'PESSOA' || usuarioLogado.usuarioTipo !== 'TECNICO') {
                if (SolicitacaoStatus !== 'CANCELADO') {
                    return res.status(400).json({
                        error: 'Cidadões e técnicos só podem cancelar a solicitação'
                    });

                }
            }

            // Buscar solicitação existente
            const solicitacaoExistente = await prisma.solicitacao.findUnique({
                where: {
                    SolicitacaoId: id
                }
            });

            if (!solicitacaoExistente) {
                return res.status(404).json({
                    error: 'Solicitação não encontrada'
                });
            }

            // Se for GESTOR, verificar se a solicitação é da sua unidade
            let usuarioLogadoBD;
            let usuarioLogadoFinalizaou;
            if (usuarioLogado.usuarioTipo === 'GESTOR') {
                usuarioLogadoBD = await prisma.gestor.findUnique({
                    where: { GestorId: usuarioLogado.usuarioId, GestorStatus: 'ATIVO' }
                });

                if (!usuarioLogadoBD) {
                    return res.status(403).json({
                        error: 'Gestor não encontrado'
                    });
                }

                // Se o gestor tem unidade e a solicitação tem unidade diferente
                if (usuarioLogadoBD.UnidadeId && solicitacaoExistente.UnidadeId && usuarioLogadoBD.UnidadeId !== solicitacaoExistente.UnidadeId) {
                    return res.status(403).json({
                        error: 'Você só pode alterar solicitações da sua unidade'
                    });
                }

                // Verifica se é o tipo de solicitação que ele pode alterar o status
                // Se for ele que abriu não precisa de checagem de tipo
                if (solicitacaoExistente.SolicitacaoIdRelacional !== usuarioLogadoBD.GestorId) {
                    if (usuarioLogadoBD.GestorNivel === 'ADMINUNIDADE') {
                        if (!tiposValidosGestorAdm.includes(solicitacaoExistente.SolicitacaoTipo)) {
                            return res.status(400).json({
                                error: 'Tipo inválido para alteração'
                            });
                        }
                    }
                }
                usuarioLogadoFinalizaou = usuarioLogadoBD.GestorUsuario;
            } else if (usuarioLogado.usuarioTipo === 'ADMINISTRADOR') {
                usuarioLogadoBD = await prisma.administrador.findUnique({
                    where: { AdministradorId: usuarioLogado.usuarioId, AdministradorStatus: 'ATIVO' }
                });
                usuarioLogadoFinalizaou = usuarioLogadoBD.AdministradorUsuario;
            }

            // Preparar dados para atualização
            let dadosAtualizacao;
            dadosAtualizacao.SolicitacaoStatus = SolicitacaoStatus;

            // Se status for CONCLUIDO ou RECUSADO ou CANCELADO, exige usuarioFinalizou
            if (SolicitacaoStatus === 'CONCLUIDO' || SolicitacaoStatus === 'RECUSADO') {
                dadosAtualizacao.SolicitacaoUsuarioFinalizou = usuarioLogadoFinalizaou.trim();
            }

            if (SolicitacaoStatus === 'CANCELADO') {
                if (solicitacaoExistente.SolicitacaoIdRelacional !== usuarioLogado.usuarioId) {
                    return res.status(400).json({
                        error: 'Somente o usuário que abriu a solicitação pode cancelá-la'
                    });
                }
            }

            // Atualizar solicitação
            const solicitacaoAtualizada = await prisma.solicitacao.update({
                where: {
                    SolicitacaoId: id
                },
                data: dadosAtualizacao,
                include: {
                    Unidade: {
                        select: {
                            UnidadeId: true,
                            UnidadeNome: true,
                            UnidadeStatus: true
                        }
                    }
                }
            });

            // --- Gravar log de alteração
            const LogAcao = 'ALTERARSTATUSSOLICITACAO';
            const LogDetalhe = 'Foi alterado o status da solicitação de ID (' + solicitacaoAtualizada.SolicitacaoId + '), status antes da alteração (' + solicitacaoExistente.SolicitacaoStatus + '), status depois da atualização (' + solicitacaoAtualizada.SolicitacaoStatus + ') pelo usuário de ID (' + usuarioLogadoFinalizaou + ')';
            await gravarLog(
                String(req.usuario.usuarioId).trim(),
                LogAcao,
                req.usuario.usuarioTipo,
                LogDetalhe,
                solicitacaoAtualizada.SolicitacaoId
            );
            // ---

            return res.status(200).json({
                message: 'Status da solicitação atualizado com sucesso',
                data: solicitacaoAtualizada
            });

        } catch (error) {
            console.error('Erro ao alterar status da solicitação:', error);
            return res.status(500).json({
                error: 'Erro ao alterar status da solicitação'
            });
        }
    }

}

module.exports = new SolicitacaoController();