// src/controllers/atividadeChamadoController.js
const prisma = require('../prisma.js');
const { getBrasilDateTime } = require('../utils/dataBrasilObter.js');

class AtividadeChamadoController {

    // Criar nova atividade em um chamado (apenas técnicos da equipe responsável)
    async criarAtividade(req, res) {
        try {
            const { chamadoId } = req.params;
            const { AtividadeDescricao, AtividadeUsuarioVer } = req.body;
            const usuarioLogado = req.usuario;

            // Validações básicas
            if (!chamadoId) {
                return res.status(400).json({ error: 'ID do chamado é obrigatório' });
            }

            if (!AtividadeDescricao || !AtividadeDescricao.trim()) {
                return res.status(400).json({ error: 'Descrição da atividade é obrigatória' });
            }

            if (!chamadoId) {
                return res.status(400).json({ error: 'ID do chamado inválido' });
            }

            // Verificar se o usuário é TECNICO
            if (usuarioLogado.usuarioTipo !== 'TECNICO') {
                return res.status(403).json({
                    error: 'Apenas técnicos podem registrar atividades em chamados'
                });
            }

            // Buscar técnico logado
            const tecnicoLogado = await prisma.tecnico.findUnique({
                where: { TecnicoId: usuarioLogado.usuarioId }
            });

            if (!tecnicoLogado) {
                return res.status(403).json({ error: 'Técnico não encontrado' });
            }

            // Verificar se o técnico está ativo
            if (tecnicoLogado.TecnicoStatus !== 'ATIVO') {
                return res.status(403).json({
                    error: 'Seu usuário técnico está inativo. Não é possível registrar atividades.'
                });
            }

            // Buscar chamado
            const chamado = await prisma.chamado.findUnique({
                where: { ChamadoId: chamadoId },
                include: {
                    Equipe: {
                        include: {
                            TecnicoEquipe: {
                                where: {
                                    TecEquStatus: 'ATIVO'
                                }
                            }
                        }
                    },
                    Unidade: true
                }
            });

            if (!chamado) {
                return res.status(404).json({ error: 'Chamado não encontrado' });
            }

            // Verificar se o chamado está em um status que permite atividades
            const statusPermitidos = ['ATRIBUIDO', 'EMATENDIMENTO'];
            if (!statusPermitidos.includes(chamado.ChamadoStatus)) {
                return res.status(400).json({
                    error: `Não é possível registrar atividades em chamados com status ${chamado.ChamadoStatus}`
                });
            }

            // Verificar se o técnico pertence à equipe responsável pelo chamado
            if (!chamado.EquipeId) {
                return res.status(400).json({
                    error: 'O chamado ainda não foi atribuído a uma equipe'
                });
            }

            const pertenceEquipe = chamado.Equipe.TecnicoEquipe.some(
                te => te.TecnicoId === tecnicoLogado.TecnicoId
            );

            if (!pertenceEquipe) {
                return res.status(403).json({
                    error: 'Você só pode registrar atividades em chamados da sua equipe'
                });
            }

            // Verificar se a unidade do técnico é a mesma do chamado
            if (tecnicoLogado.UnidadeId !== chamado.UnidadeId) {
                return res.status(403).json({
                    error: 'Você só pode registrar atividades em chamados da sua unidade'
                });
            }

            // Criar atividade
            const atividade = await prisma.atividadeChamado.create({
                data: {
                    ChamadoId: chamadoId,
                    TecnicoId: tecnicoLogado.TecnicoId,
                    AtividadeDescricao: AtividadeDescricao.trim(),
                    AtividadeDtRealizacao: getBrasilDateTime(),
                    AtividadeUsuarioVer: AtividadeUsuarioVer || 'GESTEC' // Apenas gestores e técnicos podem ver
                },
                include: {
                    Tecnico: {
                        select: {
                            TecnicoId: true,
                            TecnicoNome: true,
                            TecnicoEmail: true
                        }
                    },
                    Chamado: {
                        select: {
                            ChamadoId: true,
                            ChamadoTitulo: true,
                            ChamadoStatus: true
                        }
                    }
                }
            });

            // Se o chamado estava em ATRIBUIDO, mudar para EMATENDIMENTO automaticamente
            if (chamado.ChamadoStatus === 'ATRIBUIDO') {
                await prisma.chamado.update({
                    where: { ChamadoId: chamadoId },
                    data: { ChamadoStatus: 'EMATENDIMENTO' }
                });
            }

            return res.status(201).json({
                message: 'Atividade registrada com sucesso',
                data: atividade
            });

        } catch (error) {
            console.error('Erro ao criar atividade:', error);
            return res.status(500).json({ error: 'Erro ao criar atividade' });
        }
    }

    // Alterar atividade (apenas o técnico que criou)
    async alterarAtividade(req, res) {
        try {
            const { id } = req.params;
            const { AtividadeDescricao, AtividadeUsuarioVer } = req.body;
            const usuarioLogado = req.usuario;

            const atividadeId = id;
            if (!atividadeId) {
                return res.status(400).json({ error: 'ID da atividade inválido' });
            }

            // Validação da descrição
            if (!AtividadeDescricao || !AtividadeDescricao.trim()) {
                return res.status(400).json({ error: 'Descrição da atividade é obrigatória' });
            }

            // Verificar se o usuário é TECNICO
            if (usuarioLogado.usuarioTipo !== 'TECNICO') {
                return res.status(403).json({
                    error: 'Apenas técnicos podem alterar atividades'
                });
            }

            // Buscar atividade
            const atividade = await prisma.atividadeChamado.findUnique({
                where: { AtividadeId: atividadeId },
                include: {
                    Chamado: {
                        include: {
                            Equipe: true
                        }
                    }
                }
            });

            if (!atividade) {
                return res.status(404).json({ error: 'Atividade não encontrada' });
            }

            // Verificar se o técnico logado é o autor da atividade
            if (atividade.TecnicoId !== usuarioLogado.usuarioId) {
                return res.status(403).json({
                    error: 'Apenas o técnico que registrou a atividade pode alterá-la'
                });
            }

            // Buscar técnico logado
            const tecnicoLogado = await prisma.tecnico.findUnique({
                where: { TecnicoId: usuarioLogado.usuarioId }
            });

            if (!tecnicoLogado || tecnicoLogado.TecnicoStatus !== 'ATIVO') {
                return res.status(403).json({
                    error: 'Técnico não encontrado ou inativo'
                });
            }

            // Verificar se o chamado ainda está em andamento
            const statusPermitidos = ['ATRIBUIDO', 'EMATENDIMENTO'];
            if (!statusPermitidos.includes(atividade.Chamado.ChamadoStatus)) {
                return res.status(400).json({
                    error: 'Não é possível alterar atividades de chamados concluídos, recusados ou cancelados'
                });
            }

            // Atualizar atividade
            const atividadeAtualizada = await prisma.atividadeChamado.update({
                where: { AtividadeId: atividadeId },
                data: {
                    AtividadeDescricao: AtividadeDescricao.trim(),
                    AtividadeUsuarioVer: AtividadeUsuarioVer || 'GESTEC' // Apenas gestores e técnicos podem ver
                },
                include: {
                    Tecnico: {
                        select: {
                            TecnicoId: true,
                            TecnicoNome: true
                        }
                    },
                    Chamado: {
                        select: {
                            ChamadoId: true,
                            ChamadoTitulo: true,
                            ChamadoStatus: true
                        }
                    }
                }
            });

            res.status(200).json({
                message: 'Atividade atualizada com sucesso',
                data: atividadeAtualizada
            });

        } catch (error) {
            console.error('Erro ao alterar atividade:', error);
            res.status(500).json({ error: 'Erro ao alterar atividade' });
        }
    }

    // Excluir atividade (apenas o técnico que criou)
    async excluirAtividade(req, res) {
        try {
            const { id } = req.params;
            const usuarioLogado = req.usuario;

            const atividadeId = id;
            if (!atividadeId) {
                return res.status(400).json({ error: 'ID da atividade inválido' });
            }

            // Verificar se o usuário é TECNICO
            if (usuarioLogado.usuarioTipo !== 'TECNICO') {
                return res.status(403).json({
                    error: 'Apenas técnicos podem excluir atividades'
                });
            }

            // Buscar atividade
            const atividade = await prisma.atividadeChamado.findUnique({
                where: { AtividadeId: atividadeId },
                include: {
                    Chamado: true
                }
            });

            if (!atividade) {
                return res.status(404).json({ error: 'Atividade não encontrada' });
            }

            // Verificar se o técnico logado é o autor da atividade
            if (atividade.TecnicoId !== usuarioLogado.usuarioId) {
                return res.status(403).json({
                    error: 'Apenas o técnico que registrou a atividade pode excluí-la'
                });
            }

            // Buscar técnico logado
            const tecnicoLogado = await prisma.tecnico.findUnique({
                where: { TecnicoId: usuarioLogado.usuarioId }
            });

            if (!tecnicoLogado || tecnicoLogado.TecnicoStatus !== 'ATIVO') {
                return res.status(403).json({
                    error: 'Técnico não encontrado ou inativo'
                });
            }

            // Verificar se o chamado ainda está em andamento
            const statusPermitidos = ['ATRIBUIDO', 'EMATENDIMENTO'];
            if (!statusPermitidos.includes(atividade.Chamado.ChamadoStatus)) {
                return res.status(400).json({
                    error: 'Não é possível excluir atividades de chamados concluídos ou cancelados'
                });
            }

            // Excluir atividade
            await prisma.atividadeChamado.delete({
                where: { AtividadeId: atividadeId }
            });

            res.status(200).json({
                message: 'Atividade excluída com sucesso'
            });

        } catch (error) {
            console.error('Erro ao excluir atividade:', error);
            res.status(500).json({ error: 'Erro ao excluir atividade' });
        }
    }

    // Listar atividades de um chamado
    async listarAtividadesPorChamado(req, res) {
        try {
            const { chamadoId } = req.params;
            const { ordem = 'asc' } = req.query;
            const usuarioLogado = req.usuario;

            if (!chamadoId) {
                return res.status(400).json({ error: 'ID do chamado inválido' });
            }

            // Buscar chamado para verificar permissões
            const chamado = await prisma.chamado.findUnique({
                where: { ChamadoId: chamadoId },
                include: {
                    Pessoa: true,
                    Equipe: {
                        include: {
                            TecnicoEquipe: {
                                where: {
                                    TecEquStatus: 'ATIVO'
                                }
                            }
                        }
                    },
                    Unidade: true
                }
            });

            if (!chamado) {
                return res.status(404).json({ error: 'Chamado não encontrado' });
            }

            // Verificar permissão de visualização
            let podeVisualizar = false;

            let filtroAtividades = {
                ChamadoId: chamadoId
            };

            if (usuarioLogado.usuarioTipo === 'PESSOA') {
                // Pessoa só vê atividades dos seus próprios chamados
                podeVisualizar = (chamado.PessoaId === usuarioLogado.usuarioId);
                filtroAtividades.AtividadeUsuarioVer = 'TODOS'; // Pessoas só veem atividades públicas
            }
            else if (usuarioLogado.usuarioTipo === 'TECNICO') {
                // Técnico vê atividades se pertence à equipe responsável ou é da mesma unidade
                const tecnico = await prisma.tecnico.findUnique({
                    where: { TecnicoId: usuarioLogado.usuarioId }
                });

                if (tecnico) {
                    // Verificar se é da mesma unidade
                    if (tecnico.UnidadeId === chamado.UnidadeId) {
                        podeVisualizar = true;
                    }

                    // Verificar se pertence à equipe responsável
                    if (chamado.EquipeId) {
                        const pertenceEquipe = chamado.Equipe.TecnicoEquipe.some(
                            te => te.TecnicoId === usuarioLogado.usuarioId
                        );
                        if (pertenceEquipe) {
                            podeVisualizar = true;
                        }
                    }
                }
            }
            else if (usuarioLogado.usuarioTipo === 'GESTOR') {
                // Gestor vê atividades dos chamados da sua unidade
                const gestor = await prisma.gestor.findUnique({
                    where: { GestorId: usuarioLogado.usuarioId, GestorStatus: 'ATIVO' }
                });

                if (gestor && gestor.UnidadeId === chamado.UnidadeId) {
                    podeVisualizar = true;
                }
            }
            else if (usuarioLogado.usuarioTipo === 'ADMINISTRADOR') {
                podeVisualizar = true;
            }

            if (!podeVisualizar) {
                return res.status(403).json({
                    error: 'Você não tem permissão para visualizar as atividades deste chamado'
                });
            }

            //console.log('Filtro de atividades:', filtroAtividades);
            // Buscar atividades
            const atividades = await prisma.atividadeChamado.findMany({
                where: filtroAtividades,
                orderBy: {
                    AtividadeDtRealizacao: ordem === 'asc' ? 'asc' : 'desc'
                },
                include: {
                    Tecnico: {
                        select: {
                            TecnicoId: true,
                            TecnicoNome: true,
                            TecnicoEmail: true
                        }
                    },
                    Chamado: {
                        select: {
                            ChamadoStatus: true
                        }
                    },
                }
            });

            return res.status(200).json({
                data: atividades,
                total: atividades.length,
                chamado: {
                    ChamadoId: chamado.ChamadoId,
                    ChamadoTitulo: chamado.ChamadoTitulo,
                    ChamadoStatus: chamado.ChamadoStatus
                }
            });

        } catch (error) {
            console.error('Erro ao listar atividades:', error);
            res.status(500).json({ error: 'Erro ao listar atividades' });
        }
    }

    // Listar atividades de um técnico
    async listarAtividadesPorTecnico(req, res) {
        try {
            const { tecnicoId } = req.params;
            const {
                dataInicio,
                dataFim,
                pagina = 1,
                limite = 10
            } = req.query;
            const usuarioLogado = req.usuario;

            if (!tecnicoId) {
                return res.status(400).json({ error: 'ID do técnico inválido' });
            }

            // Verificar permissão
            if (usuarioLogado.usuarioTipo === 'TECNICO') {
                // Técnico só pode ver suas próprias atividades
                if (usuarioLogado.usuarioId !== tecnicoId) {
                    return res.status(403).json({
                        error: 'Você só pode visualizar suas próprias atividades'
                    });
                }
            }
            else if (usuarioLogado.usuarioTipo === 'GESTOR') {
                // Gestor pode ver atividades de técnicos da sua unidade
                const gestor = await prisma.gestor.findUnique({
                    where: { GestorId: usuarioLogado.usuarioId, GestorStatus: 'ATIVO' }
                });

                const tecnico = await prisma.tecnico.findUnique({
                    where: { TecnicoId: tecnicoId }
                });

                if (!tecnico) {
                    return res.status(404).json({ error: 'Técnico não encontrado' });
                }

                if (gestor && gestor.UnidadeId !== tecnico.UnidadeId) {
                    return res.status(403).json({
                        error: 'Você só pode visualizar atividades de técnicos da sua unidade'
                    });
                }
            }

            // Construir filtro
            const filtro = {
                TecnicoId: tecnicoId
            };

            if (dataInicio || dataFim) {
                filtro.AtividadeDtRealizacao = {};

                if (dataInicio) {
                    const inicio = new Date(dataInicio);
                    inicio.setHours(0, 0, 0, 0);
                    filtro.AtividadeDtRealizacao.gte = inicio;
                }

                if (dataFim) {
                    const fim = new Date(dataFim);
                    fim.setHours(23, 59, 59, 999);
                    filtro.AtividadeDtRealizacao.lte = fim;
                }
            }

            // Calcular paginação
            const paginaAtual = parseInt(pagina);
            const limitePorPagina = parseInt(limite);
            const skip = (paginaAtual - 1) * limitePorPagina;

            // Buscar atividades
            const [atividades, total] = await prisma.$transaction([
                prisma.atividadeChamado.findMany({
                    where: filtro,
                    orderBy: {
                        AtividadeDtRealizacao: 'desc'
                    },
                    skip: skip,
                    take: limitePorPagina,
                    include: {
                        Chamado: {
                            select: {
                                ChamadoId: true,
                                ChamadoTitulo: true,
                                ChamadoStatus: true,
                                Pessoa: {
                                    select: {
                                        PessoaNome: true
                                    }
                                }
                            }
                        }
                    }
                }),
                prisma.atividadeChamado.count({ where: filtro })
            ]);

            // Buscar informações do técnico
            const tecnico = await prisma.tecnico.findUnique({
                where: { TecnicoId: tecnicoId },
                select: {
                    TecnicoId: true,
                    TecnicoNome: true,
                    TecnicoEmail: true,
                    Departamento: {
                        select: {
                            DepartamentoNome: true
                        }
                    }
                }
            });

            res.status(200).json({
                data: {
                    tecnico,
                    atividades
                },
                paginacao: {
                    paginaAtual,
                    limitePorPagina,
                    totalRegistros: total,
                    totalPaginas: Math.ceil(total / limitePorPagina)
                }
            });

        } catch (error) {
            console.error('Erro ao listar atividades do técnico:', error);
            res.status(500).json({ error: 'Erro ao listar atividades do técnico' });
        }
    }

    // Buscar atividade por ID
    async buscarAtividadePorId(req, res) {
        try {
            const { id } = req.params;
            const usuarioLogado = req.usuario;

            const atividadeId = id;
            if (!atividadeId) {
                return res.status(400).json({ error: 'ID da atividade inválido' });
            }

            // Buscar atividade
            const atividade = await prisma.atividadeChamado.findUnique({
                where: { AtividadeId: atividadeId },
                include: {
                    Tecnico: {
                        select: {
                            TecnicoId: true,
                            TecnicoNome: true,
                            TecnicoEmail: true,
                            Unidade: {
                                select: {
                                    UnidadeNome: true
                                }
                            }
                        }
                    },
                    Chamado: {
                        include: {
                            Pessoa: {
                                select: {
                                    PessoaId: true,
                                    PessoaNome: true
                                }
                            },
                            Equipe: {
                                select: {
                                    EquipeId: true,
                                    EquipeNome: true
                                }
                            },
                            Unidade: {
                                select: {
                                    UnidadeId: true,
                                    UnidadeNome: true
                                }
                            }
                        }
                    }
                }
            });

            if (!atividade) {
                return res.status(404).json({ error: 'Atividade não encontrada' });
            }

            // Verificar permissão de visualização
            let podeVisualizar = false;

            if (usuarioLogado.usuarioTipo === 'PESSOA') {
                // Pessoa só vê atividades dos seus próprios chamados
                podeVisualizar = (atividade.Chamado.PessoaId === usuarioLogado.usuarioId);
            }
            else if (usuarioLogado.usuarioTipo === 'TECNICO') {
                // Técnico vê atividades se é o autor ou pertence à equipe
                if (atividade.TecnicoId === usuarioLogado.usuarioId) {
                    podeVisualizar = true;
                } else {
                    // Verificar se pertence à mesma equipe
                    const tecnicoEquipe = await prisma.tecnicoEquipe.findFirst({
                        where: {
                            TecnicoId: usuarioLogado.usuarioId,
                            EquipeId: atividade.Chamado.EquipeId,
                            TecEquStatus: 'ATIVO'
                        }
                    });
                    podeVisualizar = !!tecnicoEquipe;
                }
            }
            else if (usuarioLogado.usuarioTipo === 'GESTOR') {
                // Gestor vê atividades dos chamados da sua unidade
                const gestor = await prisma.gestor.findUnique({
                    where: { GestorId: usuarioLogado.usuarioId, GestorStatus: 'ATIVO' }
                });

                if (gestor && gestor.UnidadeId === atividade.Chamado.UnidadeId) {
                    podeVisualizar = true;
                }
            }
            else if (usuarioLogado.usuarioTipo === 'ADMINISTRADOR') {
                podeVisualizar = true;
            }

            if (!podeVisualizar) {
                return res.status(403).json({
                    error: 'Você não tem permissão para visualizar esta atividade'
                });
            }

            res.status(200).json({
                data: atividade
            });

        } catch (error) {
            console.error('Erro ao buscar atividade:', error);
            res.status(500).json({ error: 'Erro ao buscar atividade' });
        }
    }

    // Obter estatísticas de atividades por chamado
    async estatisticasPorChamado(req, res) {
        try {
            const { chamadoId } = req.params;
            const usuarioLogado = req.usuario;

            if (!chamadoId) {
                return res.status(400).json({ error: 'ID do chamado inválido' });
            }

            // Verificar permissão (mesma lógica da listagem)
            const chamado = await prisma.chamado.findUnique({
                where: { ChamadoId: chamadoId },
                include: {
                    Pessoa: true,
                    Equipe: true,
                    Unidade: true
                }
            });

            if (!chamado) {
                return res.status(404).json({ error: 'Chamado não encontrado' });
            }

            // Verificar permissão (simplificada - reutilizar lógica)
            let podeVisualizar = false;
            // ... mesma lógica de permissão da listagem ...
            // (implementar conforme necessário)

            if (!podeVisualizar) {
                return res.status(403).json({
                    error: 'Você não tem permissão para visualizar estatísticas deste chamado'
                });
            }

            // Buscar estatísticas
            const [
                totalAtividades,
                tecnicosEnvolvidos,
                primeiraAtividade,
                ultimaAtividade
            ] = await Promise.all([
                // Total de atividades
                prisma.atividadeChamado.count({
                    where: { ChamadoId: chamadoId }
                }),

                // Técnicos envolvidos (distintos)
                prisma.atividadeChamado.groupBy({
                    by: ['TecnicoId'],
                    where: { ChamadoId: chamadoId },
                    _count: true
                }),

                // Primeira atividade
                prisma.atividadeChamado.findFirst({
                    where: { ChamadoId: chamadoId },
                    orderBy: { AtividadeDtRealizacao: 'asc' }
                }),

                // Última atividade
                prisma.atividadeChamado.findFirst({
                    where: { ChamadoId: chamadoId },
                    orderBy: { AtividadeDtRealizacao: 'desc' }
                })
            ]);

            res.status(200).json({
                data: {
                    chamadoId: chamadoId,
                    totalAtividades,
                    tecnicosEnvolvidos: tecnicosEnvolvidos.length,
                    primeiraAtividade: primeiraAtividade ? {
                        data: primeiraAtividade.AtividadeDtRealizacao,
                        tecnicoId: primeiraAtividade.TecnicoId
                    } : null,
                    ultimaAtividade: ultimaAtividade ? {
                        data: ultimaAtividade.AtividadeDtRealizacao,
                        tecnicoId: ultimaAtividade.TecnicoId
                    } : null
                }
            });

        } catch (error) {
            console.error('Erro ao buscar estatísticas:', error);
            res.status(500).json({ error: 'Erro ao buscar estatísticas' });
        }
    }

}

module.exports = new AtividadeChamadoController();