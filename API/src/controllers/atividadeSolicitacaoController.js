// src/controllers/atividadeSolicitacaoController.js
const prisma = require('../prisma.js');
const { getBrasilDateTime } = require('../utils/dataBrasilObter.js');
const { gravarLog } = require('../utils/logGrava.js');
const { verficarPermissaoSolicitacao } = require('../utils/verificarPermissoes.js');

class AtividadeSolicitacaoController {

    // =============================================
    // ADICIONAR ATIVIDADE À SOLICITAÇÃO
    // =============================================
    async adicionarAtividade(req, res) {
        try {
            const { id } = req.params; // ID da solicitação
            const { AtividadeSolicitacaoDescricao } = req.body;
            const usuarioLogado = req.usuario;

            // Verificar se o usuário está logado
            if (!usuarioLogado) {
                return res.status(401).json({
                    error: 'Usuário não autenticado'
                });
            }

            // Verificar permissão
            const tiposPermitidos = ['ADMINISTRADOR', 'GESTOR'];
            if (!tiposPermitidos.includes(usuarioLogado.usuarioTipo)) {
                return res.status(403).json({
                    error: 'Usuário não tem permissão para adicionar atividades'
                });
            }

            // Validar descrição
            if (!AtividadeSolicitacaoDescricao || !AtividadeSolicitacaoDescricao.trim()) {
                return res.status(400).json({
                    error: 'Descrição da atividade é obrigatória'
                });
            }

            // Buscar solicitação
            const solicitacao = await prisma.solicitacao.findUnique({
                where: { SolicitacaoId: id }
            });

            if (!solicitacao) {
                return res.status(404).json({
                    error: 'Solicitação não encontrada'
                });
            }

            // Verificar se a solicitação está finalizada
            if (solicitacao.SolicitacaoStatus === 'CONCLUIDO' ||
                solicitacao.SolicitacaoStatus === 'RECUSADO' ||
                solicitacao.SolicitacaoStatus === 'CANCELADO') {
                return res.status(400).json({
                    error: 'Não é possível adicionar atividades a uma solicitação finalizada'
                });
            }

            if (usuarioLogado.usuarioTipo === 'GESTOR') {
                const gestor = await prisma.gestor.findUnique({
                    where: {
                        GestorId: usuarioLogado.usuarioId,
                        GestorStatus: 'ATIVO'
                    }
                });

                if (!gestor) {
                    return res.status(403).json({
                        error: 'Gestor não encontrado'
                    });
                }

                // Verificar se a solicitação é da unidade do gestor
                if (solicitacao.UnidadeId && gestor.UnidadeId !== solicitacao.UnidadeId) {
                    return res.status(403).json({
                        error: 'Você só pode adicionar atividades a solicitações da sua unidade'
                    });
                }
            }

            // Obter o nome do usuário para registrar
            let usuarioNome = '';
            let usuarioNivel = 'COMUM';
            switch (usuarioLogado.usuarioTipo) {
                case 'ADMINISTRADOR':
                    const admin = await prisma.administrador.findUnique({
                        where: { AdministradorId: parseInt(usuarioLogado.usuarioId), AdministradorStatus: 'ATIVO' }
                    });
                    if (!admin) {
                        return res.status(403).json({
                            error: 'Administrador não encontrado'
                        });
                    }
                    usuarioNome = admin?.AdministradorUsuario;
                    break;
                case 'GESTOR':
                    const gestor = await prisma.gestor.findUnique({
                        where: { GestorId: usuarioLogado.usuarioId, GestorStatus: 'ATIVO' }
                    });
                    if (!gestor) {
                        return res.status(403).json({
                            error: 'Gestor não encontrado'
                        });
                    }
                    usuarioNome = gestor?.GestorUsuario;
                    usuarioNivel = gestor?.GestorNivel;
                    break;
            }

            // Verfiicando se o usuário tem permnissão para adicionar atividade à solicitação
            const temPermissao = verficarPermissaoSolicitacao(solicitacao.SolicitacaoTipo, usuarioLogado.usuarioTipo, usuarioNivel);
            if (!temPermissao) {
                return res.status(403).json({
                    error: 'Usuário não tem permissão para adicionar atividades a esta solicitação'
                });
            }

            // Criar atividade
            const atividade = await prisma.atividadeSolicitacao.create({
                data: {
                    SolicitacaoId: id,
                    AtividadeSolicitacaoDescricao: AtividadeSolicitacaoDescricao.trim(),
                    AtividadeSolicitacaoDtRealizacao: getBrasilDateTime(),
                    AtividadeSolicitacaoUsuario: usuarioNome
                }
            });

            // --- Gravar log de criação
            const LogAcao = 'ADICIONARATIVIDADESOLICITACAO';
            const LogDetalhe = 'Foi adicionada uma atividade à solicitação de ID (' + id + ') pelo usuário (' + usuarioNome + ')';
            await gravarLog(
                String(usuarioLogado.usuarioId).trim(),
                LogAcao,
                usuarioLogado.usuarioTipo,
                LogDetalhe,
                atividade.AtividadeSolicitacaoId
            );
            // ---

            return res.status(201).json({
                message: 'Atividade adicionada com sucesso',
                data: atividade
            });

        } catch (error) {
            console.error('Erro ao adicionar atividade:', error);
            return res.status(500).json({
                error: 'Erro ao adicionar atividade'
            });
        }
    }

    // =============================================
    // LISTAR ATIVIDADES DE UMA SOLICITAÇÃO
    // =============================================
    async listarAtividadesPorSolicitacao(req, res) {
        try {
            const { id } = req.params;
            const { limite = 10, pagina = 1 } = req.query;
            const usuarioLogado = req.usuario;

            // Verificar se o usuário está logado
            if (!usuarioLogado) {
                return res.status(401).json({
                    error: 'Usuário não autenticado'
                });
            }

            // Verificar permissão
            const tiposPermitidos = ['ADMINISTRADOR', 'GESTOR'];
            if (!tiposPermitidos.includes(usuarioLogado.usuarioTipo)) {
                return res.status(403).json({
                    error: 'Usuário não tem permissão para adicionar atividades'
                });
            }

            const paginaAtual = parseInt(pagina);
            const limitePorPagina = parseInt(limite);
            const skip = (paginaAtual - 1) * limitePorPagina;

            // Buscar solicitação
            const solicitacao = await prisma.solicitacao.findUnique({
                where: { SolicitacaoId: id }
            });

            if (!solicitacao) {
                return res.status(404).json({
                    error: 'Solicitação não encontrada'
                });
            }

            // Verificar permissões
            let usuarioNivel = 'COMUM';
            if (usuarioLogado.usuarioTipo === 'GESTOR') {
                const gestor = await prisma.gestor.findUnique({
                    where: {
                        GestorId: usuarioLogado.usuarioId,
                        GestorStatus: 'ATIVO'
                    }
                });

                if (!gestor) {
                    return res.status(403).json({
                        error: 'Gestor não encontrado'
                    });
                }

                if (solicitacao.UnidadeId && gestor.UnidadeId !== solicitacao.UnidadeId) {
                    return res.status(403).json({
                        error: 'Você só pode ver atividades de solicitações da sua unidade'
                    });
                }

                usuarioNivel = gestor.GestorNivel;
            }

            // Verfiicando se o usuário tem permnissão para adicionar atividade à solicitação
            const temPermissao = verficarPermissaoSolicitacao(solicitacao.SolicitacaoTipo, usuarioLogado.usuarioTipo, usuarioNivel);
            if (!temPermissao) {
                return res.status(403).json({
                    error: 'Usuário não tem permissão para adicionar atividades a esta solicitação'
                });
            }

            // Buscar atividades
            const [atividades, total] = await prisma.$transaction([
                prisma.atividadeSolicitacao.findMany({
                    where: {
                        SolicitacaoId: id
                    },
                    orderBy: {
                        AtividadeSolicitacaoDtRealizacao: 'desc'
                    },
                    skip: skip,
                    take: limitePorPagina
                }),
                prisma.atividadeSolicitacao.count({
                    where: {
                        SolicitacaoId: id
                    }
                })
            ]);

            return res.status(200).json({
                data: atividades,
                paginacao: {
                    paginaAtual,
                    limitePorPagina,
                    totalRegistros: total,
                    totalPaginas: Math.ceil(total / limitePorPagina)
                }
            });

        } catch (error) {
            console.error('Erro ao listar atividades:', error);
            return res.status(500).json({
                error: 'Erro ao listar atividades'
            });
        }
    }

    // =============================================
    // BUSCAR ATIVIDADE POR ID
    // =============================================
    async buscarAtividadePorId(req, res) {
        try {
            const { id } = req.params;
            const usuarioLogado = req.usuario;

            if (!usuarioLogado) {
                return res.status(401).json({
                    error: 'Usuário não autenticado'
                });
            }

            // Verificar permissão
            const tiposPermitidos = ['ADMINISTRADOR', 'GESTOR'];
            if (!tiposPermitidos.includes(usuarioLogado.usuarioTipo)) {
                return res.status(403).json({
                    error: 'Usuário não tem permissão para adicionar atividades'
                });
            }

            const atividade = await prisma.atividadeSolicitacao.findUnique({
                where: {
                    AtividadeSolicitacaoId: id
                },
                include: {
                    Solicitacao: {
                        select: {
                            SolicitacaoId: true,
                            SolicitacaoTipo: true,
                            SolicitacaoStatus: true,
                            UnidadeId: true
                        }
                    }
                }
            });

            if (!atividade) {
                return res.status(404).json({
                    error: 'Atividade não encontrada'
                });
            }

            // Verificar permissões
            let usuarioNivel = 'COMUM';
            if (usuarioLogado.usuarioTipo === 'GESTOR') {
                const gestor = await prisma.gestor.findUnique({
                    where: {
                        GestorId: usuarioLogado.usuarioId,
                        GestorStatus: 'ATIVO'
                    }
                });

                if (!gestor) {
                    return res.status(403).json({
                        error: 'Gestor não encontrado'
                    });
                }

                if (atividade.Solicitacao.UnidadeId && gestor.UnidadeId !== atividade.Solicitacao.UnidadeId) {
                    return res.status(403).json({
                        error: 'Você só pode ver atividades de solicitações da sua unidade'
                    });
                }

                usuarioNivel = gestor.GestorNivel;
            }

            // Verfiicando se o usuário tem permnissão para adicionar atividade à solicitação
            const temPermissao = verficarPermissaoSolicitacao(atividade.Solicitacao.SolicitacaoTipo, usuarioLogado.usuarioTipo, usuarioNivel);
            if (!temPermissao) {
                return res.status(403).json({
                    error: 'Usuário não tem permissão para adicionar atividades a esta solicitação'
                });
            }

            return res.status(200).json({
                data: atividade
            });

        } catch (error) {
            console.error('Erro ao buscar atividade:', error);
            return res.status(500).json({
                error: 'Erro ao buscar atividade'
            });
        }
    }

    // =============================================
    // ALTERAR ATIVIDADE
    // =============================================
    async alterarAtividade(req, res) {
        try {
            const { id } = req.params;
            const { AtividadeSolicitacaoDescricao } = req.body;
            const usuarioLogado = req.usuario;

            if (!usuarioLogado) {
                return res.status(401).json({
                    error: 'Usuário não autenticado'
                });
            }

            // Verificar permissão
            const tiposPermitidos = ['ADMINISTRADOR', 'GESTOR'];
            if (!tiposPermitidos.includes(usuarioLogado.usuarioTipo)) {
                return res.status(403).json({
                    error: 'Usuário não tem permissão para adicionar atividades'
                });
            }

            if (!AtividadeSolicitacaoDescricao || !AtividadeSolicitacaoDescricao.trim()) {
                return res.status(400).json({
                    error: 'Descrição da atividade é obrigatória'
                });
            }

            // Buscar atividade
            const atividade = await prisma.atividadeSolicitacao.findUnique({
                where: {
                    AtividadeSolicitacaoId: id
                },
                include: {
                    Solicitacao: true
                }
            });

            if (!atividade) {
                return res.status(404).json({
                    error: 'Atividade não encontrada'
                });
            }

            // Verificar permissões (apenas quem criou ou gestor/admin pode editar)
            let podeEditar = false;
            let usuario;
            if (usuarioLogado.usuarioTipo === 'ADMINISTRADOR') {
                const admin = await prisma.administrador.findUnique({
                    where: {
                        AdministradorId: usuarioLogado.usuarioId,
                        AdministradorStatus: 'ATIVO'
                    }
                });
                if (admin && atividade.AtividadeSolicitacaoUsuario === admin.AdministradorUsuario) {
                    podeEditar = true;
                    usuario = admin.AdministradorUsuario;
                }
            } else if (usuarioLogado.usuarioTipo === 'GESTOR') {
                const gestor = await prisma.gestor.findUnique({
                    where: {
                        GestorId: usuarioLogado.usuarioId,
                        GestorStatus: 'ATIVO'
                    }
                });

                if (gestor && atividade.Solicitacao.UnidadeId === gestor.UnidadeId && atividade.AtividadeSolicitacaoUsuario === gestor.GestorUsuario) {
                    podeEditar = true;
                    usuario = gestor.GestorUsuario;
                }
            }

            if (!podeEditar) {
                return res.status(403).json({
                    error: 'Você não tem permissão para editar esta atividade'
                });
            }

            // Atualizar atividade
            const atividadeAtualizada = await prisma.atividadeSolicitacao.update({
                where: {
                    AtividadeSolicitacaoId: id
                },
                data: {
                    AtividadeSolicitacaoDescricao: AtividadeSolicitacaoDescricao.trim()
                }
            });

            // --- Gravar log de alteração
            const LogAcao = 'ALTERARATIVIDADESOLICITACAO';
            const LogDetalhe = 'Foi alterada a atividade de ID (' + id + ') pelo usuário (' + usuario + ')';
            await gravarLog(
                String(usuarioLogado.usuarioId).trim(),
                LogAcao,
                usuarioLogado.usuarioTipo,
                LogDetalhe,
                atividadeAtualizada.AtividadeSolicitacaoId
            );
            // ---

            return res.status(200).json({
                message: 'Atividade atualizada com sucesso',
                data: atividadeAtualizada
            });

        } catch (error) {
            console.error('Erro ao alterar atividade:', error);
            return res.status(500).json({
                error: 'Erro ao alterar atividade'
            });
        }
    }

    // =============================================
    // EXCLUIR ATIVIDADE
    // =============================================
    async excluirAtividade(req, res) {
        try {
            const { id } = req.params;
            const usuarioLogado = req.usuario;

            if (!usuarioLogado) {
                return res.status(401).json({
                    error: 'Usuário não autenticado'
                });
            }

            // Buscar atividade
            const atividade = await prisma.atividadeSolicitacao.findUnique({
                where: {
                    AtividadeSolicitacaoId: id
                },
                include: {
                    Solicitacao: true
                }
            });

            if (!atividade) {
                return res.status(404).json({
                    error: 'Atividade não encontrada'
                });
            }

            // Verificar permissões (apenas admin ou gestor pode excluir)
            // Verificar permissões (apenas quem criou ou gestor/admin pode editar)
            let podeExcluir = false;
            let usuario;
            if (usuarioLogado.usuarioTipo === 'ADMINISTRADOR') {
                const admin = await prisma.administrador.findUnique({
                    where: {
                        AdministradorId: usuarioLogado.usuarioId,
                        AdministradorStatus: 'ATIVO'
                    }
                });
                if (admin && atividade.AtividadeSolicitacaoUsuario === admin.AdministradorUsuario) {
                    podeExcluir = true;
                    usuario = admin.AdministradorUsuario;
                }
            } else if (usuarioLogado.usuarioTipo === 'GESTOR') {
                const gestor = await prisma.gestor.findUnique({
                    where: {
                        GestorId: usuarioLogado.usuarioId,
                        GestorStatus: 'ATIVO'
                    }
                });

                if (gestor && atividade.Solicitacao.UnidadeId === gestor.UnidadeId && atividade.AtividadeSolicitacaoUsuario === gestor.GestorUsuario) {
                    podeExcluir = true;
                    usuario = gestor.GestorUsuario;
                }
            }

            if (!podeExcluir) {
                return res.status(403).json({
                    error: 'Você não tem permissão para excluir esta atividade'
                });
            }

            // Excluir atividade
            await prisma.atividadeSolicitacao.delete({
                where: {
                    AtividadeSolicitacaoId: id
                }
            });

            // --- Gravar log de exclusão
            const LogAcao = 'EXCLUIRATIVIDADESOLICITACAO';
            const LogDetalhe = 'Foi excluída a atividade de ID (' + id + ') pelo usuário (' + usuario + ')';
            await gravarLog(
                String(usuarioLogado.usuarioId).trim(),
                LogAcao,
                usuarioLogado.usuarioTipo,
                LogDetalhe,
                id
            );
            // ---

            return res.status(200).json({
                message: 'Atividade excluída com sucesso'
            });

        } catch (error) {
            console.error('Erro ao excluir atividade:', error);
            return res.status(500).json({
                error: 'Erro ao excluir atividade'
            });
        }
    }

}

module.exports = new AtividadeSolicitacaoController();