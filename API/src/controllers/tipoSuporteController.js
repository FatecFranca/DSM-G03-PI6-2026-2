// src/controllers/tipoSuporteController.js
const prisma = require('../prisma.js');

class TipoSuporteController {

    // Cadastrar novo tipo de suporte (apenas administradores)
    async cadastrarTipoSuporte(req, res) {
        try {
            const { TipSupNom, TipSupStatus } = req.body;
            const usuarioLogado = req.usuario;

            // Verificar se o usuário é ADMINISTRADOR
            if (usuarioLogado.usuarioTipo !== 'ADMINISTRADOR') {
                return res.status(403).json({
                    error: 'Apenas administradores podem acessar essa rota'
                });
            }

            if (!TipSupNom || !TipSupNom.trim()) {
                return res.status(400).json({ error: 'Nome do tipo de suporte é obrigatório' });
            }

            // Validar status se fornecido
            if (TipSupStatus) {
                const statusValidos = ['ATIVO', 'INATIVO'];
                if (!statusValidos.includes(TipSupStatus)) {
                    return res.status(400).json({
                        error: 'Status inválido. Use: ATIVO ou INATIVO'
                    });
                }
            }

            // Verificar se já existe tipo de suporte com o mesmo nome
            const tipoExistente = await prisma.tipoSuporte.findFirst({
                where: {
                    TipSupNom: {
                        equals: TipSupNom.trim(),
                        mode: 'insensitive'
                    }
                }
            });

            if (tipoExistente) {
                return res.status(409).json({
                    error: 'Já existe um tipo de suporte com este nome'
                });
            }

            // Criar tipo de suporte
            const tipoSuporte = await prisma.tipoSuporte.create({
                data: {
                    TipSupNom: TipSupNom.trim(),
                    TipSupStatus: TipSupStatus || 'ATIVO',
                    TipSupDtCadastro: new Date()
                }
            });

            res.status(201).json({
                message: 'Tipo de suporte cadastrado com sucesso',
                data: tipoSuporte
            });

        } catch (error) {
            console.error('Erro ao cadastrar tipo de suporte:', error);
            res.status(500).json({ error: 'Erro ao cadastrar tipo de suporte' });
        }
    }

    // Alterar tipo de suporte (apenas administradores)
    async alterarTipoSuporte(req, res) {
        try {
            const { id } = req.params;
            const { TipSupNom, TipSupStatus } = req.body;
            const usuarioLogado = req.usuario;

            // Verificar se o usuário é ADMINISTRADOR
            if (usuarioLogado.usuarioTipo !== 'ADMINISTRADOR') {
                return res.status(403).json({
                    error: 'Apenas administradores podem acessar essa rota'
                });
            }

            const tipoSuporteId = parseInt(id);
            if (isNaN(tipoSuporteId)) {
                return res.status(400).json({ error: 'ID do tipo de suporte inválido' });
            }

            // Buscar tipo de suporte a ser alterado
            const tipoExistente = await prisma.tipoSuporte.findUnique({
                where: { TipSupId: tipoSuporteId }
            });

            if (!tipoExistente) {
                return res.status(404).json({ error: 'Tipo de suporte não encontrado' });
            }

            // Preparar dados para atualização
            const dadosAtualizacao = {};

            // Validar e adicionar nome se fornecido
            if (TipSupNom !== undefined) {
                if (!TipSupNom.trim()) {
                    return res.status(400).json({ error: 'Nome do tipo de suporte não pode ser vazio' });
                }

                // Verificar se já existe outro tipo com o mesmo nome na mesma unidade
                if (TipSupNom.trim().toLowerCase() !== tipoExistente.TipSupNom.toLowerCase()) {
                    const tipoMesmoNome = await prisma.tipoSuporte.findFirst({
                        where: {
                            TipSupNom: {
                                equals: TipSupNom.trim(),
                                mode: 'insensitive'
                            },
                            TipSupId: {
                                not: tipoSuporteId
                            }
                        }
                    });

                    if (tipoMesmoNome) {
                        return res.status(409).json({
                            error: 'Já existe outro tipo de suporte com este nome nesta unidade'
                        });
                    }
                }

                dadosAtualizacao.TipSupNom = TipSupNom.trim();
            }

            // Validar e adicionar status se fornecido
            if (TipSupStatus !== undefined) {
                const statusValidos = ['ATIVO', 'INATIVO'];
                if (!statusValidos.includes(TipSupStatus)) {
                    return res.status(400).json({
                        error: 'Status inválido. Use: ATIVO ou INATIVO'
                    });
                }

                // Se for inativar, verificar se existem chamados vinculados a este tipo
                if (TipSupStatus === 'INATIVO' && tipoExistente.TipSupStatus === 'ATIVO') {
                    const chamadosVinculados = await prisma.chamado.count({
                        where: {
                            TipSupId: tipoSuporteId,
                            ChamadoStatus: {
                                notIn: ['CONCLUIDO', 'CANCELADO', 'RECUSADO']
                            }
                        }
                    });

                    if (chamadosVinculados > 0) {
                        return res.status(400).json({
                            error: 'Não é possível inativar um tipo de suporte com chamados em andamento. Finalize os chamados primeiro.'
                        });
                    }
                }

                dadosAtualizacao.TipSupStatus = TipSupStatus;
            }

            // Verificar se há dados para atualizar
            if (Object.keys(dadosAtualizacao).length === 0) {
                return res.status(400).json({ error: 'Nenhum dado fornecido para atualização' });
            }

            // Atualizar tipo de suporte
            const tipoAtualizado = await prisma.tipoSuporte.update({
                where: { TipSupId: tipoSuporteId },
                data: dadosAtualizacao
            });

            res.status(200).json({
                message: 'Tipo de suporte atualizado com sucesso',
                data: tipoAtualizado
            });

        } catch (error) {
            console.error('Erro ao alterar tipo de suporte:', error);
            res.status(500).json({ error: 'Erro ao alterar tipo de suporte' });
        }
    }

    // Listar tipos de suporte com filtros
    async listarTiposSuporte(req, res) {
        try {
            const {
                unidadeId,
                status,
                nome
            } = req.query;

            const usuarioLogado = req.usuario;

            // Construir filtro base
            const filtro = {};

            // Aplicar filtros de acordo com permissão
            if (usuarioLogado.usuarioTipo === 'GESTOR') {
                const gestorLogado = await prisma.gestor.findUnique({
                    where: { GestorId: usuarioLogado.usuarioId }
                });

                if (!gestorLogado) {
                    // Gestor só vê tipos de suporte da sua unidade
                    //filtro.UnidadeId = gestorLogado.UnidadeId;
                    return res.status(404).json({
                        error: 'Gestor não encontrado. Não é possível listar tipos de suporte.'
                    });
                }
            }

            // Aplicar filtros da query

            // Se for admin ou se o filtro for compatível com a permissão
            let UnidadeIdFiltro = null;
            if (usuarioLogado.usuarioTipo === 'ADMINISTRADOR') {
                if (unidadeId) {
                    UnidadeIdFiltro = parseInt(unidadeId);
                }
            } else if (usuarioLogado.usuarioTipo === 'GESTOR') {
                // Verificar se o gestor tem acesso a esta unidade
                const gestorLogado = await prisma.gestor.findUnique({
                    where: { GestorId: usuarioLogado.usuarioId }
                });

                if (gestorLogado && gestorLogado.UnidadeId) {
                    UnidadeIdFiltro = gestorLogado.UnidadeId;
                } else {
                    return res.status(403).json({
                        error: 'Você não tem permissão para visualizar tipos de suporte: sem unidade vinculada'
                    });
                }
            } else if (usuarioLogado.usuarioTipo === 'PESSOA') {
                // Verificar se a pessoa tem acesso a esta unidade
                const pessoaLogado = await prisma.pessoa.findUnique({
                    where: { PessoaId: usuarioLogado.usuarioId }
                });

                if (pessoaLogado && pessoaLogado.UnidadeId) {
                    UnidadeIdFiltro = pessoaLogado.UnidadeId;
                } else {
                    return res.status(403).json({
                        error: 'Você não tem permissão para visualizar tipos de suporte: Sem Unidade vinculada'
                    });
                }
            } else if (usuarioLogado.usuarioTipo === 'TECNICO') {
                // Verificar se o tecnico tem acesso a esta unidade
                const tecnicoLogado = await prisma.tecnico.findUnique({
                    where: { TecnicoId: usuarioLogado.usuarioId }
                });

                if (tecnicoLogado && tecnicoLogado.UnidadeId) {
                    UnidadeIdFiltro = tecnicoLogado.UnidadeId;
                } else {
                    return res.status(403).json({
                        error: 'Você não tem permissão para visualizar tipos de suporte: Sem Unidade Vinculada'
                    });
                }
            }

            // Administrador visualiza ativos e inativos
            if (usuarioLogado.usuarioTipo === 'ADMINISTRADOR') {
                if (status) {
                    const statusValidos = ['ATIVO', 'INATIVO'];
                    if (!statusValidos.includes(status)) {
                        return res.status(400).json({
                            error: 'Status inválido. Use: ATIVO ou INATIVO'
                        });
                    }
                    filtro.TipSupStatus = status;
                }
            } else if (usuarioLogado.usuarioTipo === 'PESSOA' || usuarioLogado.usuarioTipo === 'TECNICO' || usuarioLogado.usuarioTipo === 'GESTOR') {
                filtro.TipSupStatus = 'ATIVO';
            }

            if (nome) {
                filtro.TipSupNom = {
                    contains: nome,
                    mode: 'insensitive'
                };
            }

            let [tipos] = [];

            //console.log('filtro = ', filtro);

            // Buscar tipos de suporte
            if (usuarioLogado.usuarioTipo === 'ADMINISTRADOR') {
                if (UnidadeIdFiltro === null) {
                    [tipos] = await prisma.$transaction([
                        prisma.tipoSuporte.findMany({
                            where: filtro,
                            orderBy: [
                                { TipSupNom: 'asc' }
                            ],
                            include: {
                                _count: {
                                    select: {
                                        Chamado: true,
                                        TipoSuporteUnidade: true
                                    }
                                }
                            }
                        }),
                        prisma.tipoSuporte.count({ where: filtro })
                    ]);
                } else {
                    //  Pegar os tipos de suporte vinculados a unidade filtrada
                    const tipoSupUni = prisma.tipoSuporteUnidade.findMany({
                        where: { UnidadeId: UnidadeIdFiltro },
                        orderBy: [
                            { TipSupId: 'asc' }
                        ]
                    });

                    // Pegar os tipos de suporte vinculados a unidade filtrada
                    [tipos] = await prisma.$transaction([
                        prisma.tipoSuporte.findMany({
                            where: {
                                TipSupId: {
                                    in: (await tipoSupUni).map(t => t.TipSupId)
                                },
                                ...filtro
                            },
                            orderBy: [
                                { TipSupNom: 'asc' }
                            ],
                            include: {
                                _count: {
                                    select: {
                                        Chamado: true,
                                        TipoSuporteUnidade: true
                                    }
                                }
                            }
                        }),
                        prisma.tipoSuporte.count({
                            where: {
                                TipSupId: {
                                    in: (await tipoSupUni).map(t => t.TipSupId)
                                },
                                ...filtro
                            }
                        })
                    ]);
                }
            } else if (usuarioLogado.usuarioTipo === 'PESSOA' || usuarioLogado.usuarioTipo === 'GESTOR' || usuarioLogado.usuarioTipo === 'TECNICO') {
                //  Pegar os tipos de suporte vinculados a unidade filtrada
                const tipoSupUni = prisma.tipoSuporteUnidade.findMany({
                    where: { UnidadeId: UnidadeIdFiltro },
                    orderBy: [
                        { TipSupId: 'asc' }
                    ]
                });

                // Pegar os tipos de suporte vinculados a unidade filtrada
                [tipos] = await prisma.$transaction([
                    prisma.tipoSuporte.findMany({
                        where: {
                            TipSupId: {
                                in: (await tipoSupUni).map(t => t.TipSupId)
                            },
                            ...filtro
                        },
                        orderBy: [
                            { TipSupNom: 'asc' }
                        ],
                        include: {
                            _count: {
                                select: {
                                    Chamado: true,
                                    TipoSuporteUnidade: true
                                }
                            }
                        }
                    }),
                    prisma.tipoSuporte.count({
                        where: {
                            TipSupId: {
                                in: (await tipoSupUni).map(t => t.TipSupId)
                            },
                            ...filtro
                        }
                    })
                ]);
            }

            res.status(200).json({
                data: tipos
            });

        } catch (error) {
            console.error('Erro ao listar tipos de suporte:', error);
            res.status(500).json({ error: 'Erro ao listar tipos de suporte' });
        }
    }

    // Buscar tipo de suporte por ID
    async buscarTipoSuportePorId(req, res) {
        try {
            const { id } = req.params;
            const usuarioLogado = req.usuario;

            const tipoSuporteId = parseInt(id);
            if (isNaN(tipoSuporteId)) {
                return res.status(400).json({ error: 'ID do tipo de suporte inválido' });
            }

            // Buscar tipo de suporte
            const tipoSuporte = await prisma.tipoSuporte.findUnique({
                where: { TipSupId: tipoSuporteId },
                include: {
                    Chamado: {
                        select: {
                            ChamadoId: true,
                            ChamadoTitulo: true,
                            ChamadoStatus: true,
                            ChamadoDtAbertura: true
                        },
                        orderBy: {
                            ChamadoDtAbertura: 'desc'
                        },
                        take: 10
                    }
                }
            });

            if (!tipoSuporte) {
                return res.status(404).json({ error: 'Tipo de suporte não encontrado' });
            }

            // Verificar permissão para gestores
            if (usuarioLogado.usuarioTipo !== 'ADMINISTRADOR') {
                if (usuarioLogado.usuarioTipo === 'GESTOR') {
                    const gestorLogado = await prisma.gestor.findUnique({
                        where: { GestorId: usuarioLogado.usuarioId }
                    });

                    const tipoSuporteUni = await prisma.tipoSuporteUnidade.findFirst({
                        where: { TipSupId: tipoSuporteId, UnidadeId: gestorLogado.UnidadeId, TipSupUniStatus: 'ATIVO' },
                    });

                    if (!tipoSuporteUni) {
                        return res.status(403).json({
                            error: 'Você só pode visualizar tipos de suporte da sua própria unidade'
                        });
                    }
                } else if (usuarioLogado.usuarioTipo === 'TECNICO') {
                    const tecnicoLogado = await prisma.tecnico.findUnique({
                        where: { TecnicoId: usuarioLogado.usuarioId }
                    });

                    const tipoSuporteUni = await prisma.tipoSuporteUnidade.findUnique({
                        where: { TipSupId: tipoSuporteId, UnidadeId: tecnicoLogado.UnidadeId, TipSupUniStatus: 'ATIVO' },
                    });

                    if (!tipoSuporteUni) {
                        return res.status(403).json({
                            error: 'Você só pode visualizar tipos de suporte da sua própria unidade'
                        });
                    }

                } else if (usuarioLogado.usuarioTipo === 'PESSOA') {
                    const pessoaLogada = await prisma.pessoa.findUnique({
                        where: { PessoaId: usuarioLogado.usuarioId }
                    });

                    const tipoSuporteUni = await prisma.tipoSuporteUnidade.findUnique({
                        where: { TipSupId: tipoSuporteId, UnidadeId: pessoaLogada.UnidadeId, TipSupUniStatus: 'ATIVO' },
                    });

                    if (!tipoSuporteUni) {
                        return res.status(403).json({
                            error: 'Você só pode visualizar tipos de suporte da sua própria unidade'
                        });
                    }

                } else {
                    return res.status(403).json({
                        error: 'Tipo de usuário não autorizado para esta ação'
                    });
                }
            }

            res.status(200).json({
                data: tipoSuporte
            });

        } catch (error) {
            console.error('Erro ao buscar tipo de suporte:', error);
            res.status(500).json({ error: 'Erro ao buscar tipo de suporte' });
        }
    }

    // Alterar apenas status do tipo de suporte (apenas administradores)
    async alterarStatusTipoSuporte(req, res) {
        try {
            const { id } = req.params;
            const { TipSupStatus } = req.body;
            const usuarioLogado = req.usuario;

            // Verificar se o usuário é ADMINISTRADOR
            if (usuarioLogado.usuarioTipo !== 'ADMINISTRADOR') {
                return res.status(403).json({
                    error: 'Apenas administradores podem acessar essa rota'
                });
            }

            const tipoSuporteId = parseInt(id);
            if (isNaN(tipoSuporteId)) {
                return res.status(400).json({ error: 'ID do tipo de suporte inválido' });
            }

            // Validar status
            if (!TipSupStatus) {
                return res.status(400).json({ error: 'Status é obrigatório' });
            }

            const statusValidos = ['ATIVO', 'INATIVO'];
            if (!statusValidos.includes(TipSupStatus)) {
                return res.status(400).json({
                    error: 'Status inválido. Use: ATIVO ou INATIVO'
                });
            }

            // Buscar tipo de suporte
            const tipoExistente = await prisma.tipoSuporte.findUnique({
                where: { TipSupId: tipoSuporteId }
            });

            if (!tipoExistente) {
                return res.status(404).json({ error: 'Tipo de suporte não encontrado' });
            }

            // Se for inativar, verificar se existem chamados em andamento
            if (TipSupStatus === 'INATIVO' && tipoExistente.TipSupStatus === 'ATIVO') {
                const chamadosEmAndamento = await prisma.chamado.count({
                    where: {
                        TipSupId: tipoSuporteId,
                        ChamadoStatus: {
                            notIn: ['CONCLUIDO', 'CANCELADO', 'RECUSADO']
                        }
                    }
                });

                if (chamadosEmAndamento > 0) {
                    return res.status(400).json({
                        error: 'Não é possível inativar um tipo de suporte com chamados em andamento'
                    });
                }
            }

            // Atualizar status
            const tipoAtualizado = await prisma.tipoSuporte.update({
                where: { TipSupId: tipoSuporteId },
                data: { TipSupStatus: TipSupStatus }
            });

            res.status(200).json({
                message: 'Status do tipo de suporte atualizado com sucesso',
                data: tipoAtualizado
            });

        } catch (error) {
            console.error('Erro ao alterar status do tipo de suporte:', error);
            res.status(500).json({ error: 'Erro ao alterar status do tipo de suporte' });
        }
    }

    // Listar tipos de suporte por unidade (para uso em selects)
    async listarTiposPorUnidade(req, res) {
        try {
            const { unidadeId } = req.params;
            let { apenasAtivos } = req.body; // Pode ser 'true' ou 'false'
            const usuarioLogado = req.usuario;

            const unidadeIdInt = parseInt(unidadeId);
            if (isNaN(unidadeIdInt)) {
                return res.status(400).json({ error: 'ID da unidade inválido' });
            }

            // Verificar permissão para gestores
            if (usuarioLogado.usuarioTipo !== 'ADMINISTRADOR') {
                if (usuarioLogado.usuarioTipo === 'GESTOR') {
                    const gestorLogado = await prisma.gestor.findUnique({
                        where: { GestorId: usuarioLogado.usuarioId }
                    });

                    if (gestorLogado && gestorLogado.UnidadeId !== unidadeIdInt) {
                        return res.status(403).json({
                            error: 'Você só pode visualizar tipos de suporte da sua própria unidade'
                        });
                    }

                    apenasAtivos = 'true'; // Gestores só podem ver ativos

                } else if (usuarioLogado.usuarioTipo === 'TECNICO') {
                    const tecnicoLogado = await prisma.tecnico.findUnique({
                        where: { TecnicoId: usuarioLogado.usuarioId }
                    });

                    if (tecnicoLogado && tecnicoLogado.UnidadeId !== unidadeIdInt) {
                        return res.status(403).json({
                            error: 'Você só pode visualizar tipos de suporte da sua própria unidade'
                        });
                    }

                    apenasAtivos = 'true'; // Tecnicos só podem ver ativos

                } else if (usuarioLogado.usuarioTipo === 'PESSOA') {
                    const pessoaLogada = await prisma.pessoa.findUnique({
                        where: { PessoaId: usuarioLogado.usuarioId }
                    });

                    if (pessoaLogada && pessoaLogada.UnidadeId !== unidadeIdInt) {
                        return res.status(403).json({
                            error: 'Você só pode visualizar tipos de suporte da sua própria unidade'
                        });
                    }

                    apenasAtivos = 'true'; // Pessoas só podem ver ativos

                } else {
                    return res.status(403).json({
                        error: 'Tipo de usuário não autorizado para esta ação'
                    });
                }
            }

            // Verificar se unidade existe
            const unidade = await prisma.unidade.findUnique({
                where: { UnidadeId: unidadeIdInt }
            });

            if (!unidade) {
                return res.status(404).json({ error: 'Unidade não encontrada' });
            }

            // Continuar aqui
            // Construir filtro
            const filtro = {
                UnidadeId: unidadeIdInt
            };

            if (apenasAtivos === 'true') {
                filtro.TipSupStatus = 'ATIVO';
            }

            let tiposUnidade = [];

            if (apenasAtivos === 'true') {
                tiposUnidade = await prisma.tipoSuporteUnidade.findMany({
                    where: { TipSupUniStatus: 'ATIVO', UnidadeId: unidadeIdInt },
                });
            } else {
                tiposUnidade = await prisma.tipoSuporteUnidade.findMany({
                    where: { UnidadeId: unidadeIdInt },
                });
            }

            // Buscar tipos de suporte
            let tipos;

            if (tiposUnidade.length === 0) {
                tipos = [];
            } else {
                if (apenasAtivos === 'true') {
                    tipos = await prisma.tipoSuporte.findMany({
                        where: {
                            TipSupId: {
                                in: tiposUnidade.map(t => t.TipSupId)
                            },
                            TipSupStatus: 'ATIVO'
                        },
                        orderBy: {
                            TipSupNom: 'asc'
                        },
                        select: {
                            TipSupId: true,
                            TipSupNom: true,
                            TipSupStatus: true,
                            _count: {
                                select: {
                                    Chamado: true
                                }
                            }
                        }
                    });
                } else {
                    tipos = await prisma.tipoSuporte.findMany({
                        where: {
                            TipSupId: {
                                in: tiposUnidade.map(t => t.TipSupId)
                            }
                        },
                        orderBy: {
                            TipSupNom: 'asc'
                        },
                        select: {
                            TipSupId: true,
                            TipSupNom: true,
                            TipSupStatus: true,
                            _count: {
                                select: {
                                    Chamado: true
                                }
                            }
                        }
                    });
                }
            }

            res.status(200).json({
                data: tipos
            });

        } catch (error) {
            console.error('Erro ao listar tipos de suporte por unidade:', error);
            res.status(500).json({ error: 'Erro ao listar tipos de suporte por unidade' });
        }
    }

    async listarVinculosPorTipoSuporte(req, res) {
        try {
            const { id } = req.params
            const usuarioLogado = req.usuario

            const tipoSuporteId = parseInt(id)
            if (isNaN(tipoSuporteId)) {
                return res.status(400).json({ error: 'ID do tipo de suporte inválido' })
            }

            // Verificar se o tipo de suporte existe
            const tipoSuporte = await prisma.tipoSuporte.findUnique({
                where: { TipSupId: tipoSuporteId }
            })

            if (!tipoSuporte) {
                return res.status(404).json({ error: 'Tipo de suporte não encontrado' })
            }

            // Buscar vínculos
            const vinculos = await prisma.tipoSuporteUnidade.findMany({
                where: { TipSupId: tipoSuporteId },
                include: {
                    Unidade: {
                        select: {
                            UnidadeId: true,
                            UnidadeNome: true,
                            UnidadeStatus: true
                        }
                    }
                },
                orderBy: {
                    Unidade: {
                        UnidadeNome: 'asc'
                    }
                }
            })

            res.status(200).json({
                data: vinculos
            })

        } catch (error) {
            console.error('Erro ao listar vínculos:', error)
            res.status(500).json({ error: 'Erro ao listar vínculos' })
        }
    }

    // Adicionar unidade a um tipo de suporte
    async adicionarUnidadeTipoSuporte(req, res) {
        try {
            const { id } = req.params
            const { unidadeId } = req.body
            const usuarioLogado = req.usuario

            // Verificar se o usuário é ADMINISTRADOR
            if (usuarioLogado.usuarioTipo !== 'ADMINISTRADOR') {
                return res.status(403).json({
                    error: 'Apenas administradores podem acessar essa rota'
                })
            }

            const tipoSuporteId = parseInt(id)
            const unidadeIdInt = parseInt(unidadeId)

            if (isNaN(tipoSuporteId) || isNaN(unidadeIdInt)) {
                return res.status(400).json({ error: 'IDs inválidos' })
            }

            // Verificar se o tipo de suporte existe
            const tipoSuporte = await prisma.tipoSuporte.findUnique({
                where: { TipSupId: tipoSuporteId }
            })

            if (!tipoSuporte) {
                return res.status(404).json({ error: 'Tipo de suporte não encontrado' })
            }

            // Verificar se a unidade existe
            const unidade = await prisma.unidade.findUnique({
                where: { UnidadeId: unidadeIdInt }
            })

            if (!unidade) {
                return res.status(404).json({ error: 'Unidade não encontrada' })
            }

            // Verificar se o vínculo já existe
            const vinculoExistente = await prisma.tipoSuporteUnidade.findFirst({
                where: {
                    TipSupId: tipoSuporteId,
                    UnidadeId: unidadeIdInt
                }
            })

            if (vinculoExistente) {
                return res.status(409).json({
                    error: 'Este tipo de suporte já está vinculado a esta unidade'
                })
            }

            // Criar vínculo
            const vinculo = await prisma.tipoSuporteUnidade.create({
                data: {
                    TipSupId: tipoSuporteId,
                    UnidadeId: unidadeIdInt,
                    TipSupUniStatus: 'ATIVO'
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
            })

            res.status(201).json({
                message: 'Unidade vinculada com sucesso',
                data: vinculo
            })

        } catch (error) {
            console.error('Erro ao adicionar unidade:', error)
            res.status(500).json({ error: 'Erro ao adicionar unidade' })
        }
    }

    // Alterar status de vínculo
    async alterarVinculoTipoSuporte(req, res) {
        try {
            const { id } = req.params
            const { status } = req.body
            const usuarioLogado = req.usuario

            // Verificar se o usuário é ADMINISTRADOR
            if (usuarioLogado.usuarioTipo !== 'ADMINISTRADOR') {
                return res.status(403).json({
                    error: 'Apenas administradores podem acessar essa rota'
                })
            }

            if (!status || !['ATIVO', 'INATIVO'].includes(status)) {
                return res.status(400).json({
                    error: 'Status inválido. Use: ATIVO ou INATIVO'
                })
            }

            // Verificar se o vínculo existe
            const vinculo = await prisma.tipoSuporteUnidade.findUnique({
                where: { TipSupUniId: id },
                include: {
                    TipoSuporte: true,
                    Unidade: true
                }
            })

            if (!vinculo) {
                return res.status(404).json({ error: 'Vínculo não encontrado' })
            }

            // Atualizar status
            const vinculoAtualizado = await prisma.tipoSuporteUnidade.update({
                where: { TipSupUniId: id },
                data: { TipSupUniStatus: status },
                include: {
                    Unidade: {
                        select: {
                            UnidadeId: true,
                            UnidadeNome: true,
                            UnidadeStatus: true
                        }
                    }
                }
            })

            res.status(200).json({
                message: 'Status do vínculo atualizado com sucesso',
                data: vinculoAtualizado
            })

        } catch (error) {
            console.error('Erro ao alterar vínculo:', error)
            res.status(500).json({ error: 'Erro ao alterar vínculo' })
        }
    }

    // Remover vínculo
    async removerVinculoTipoSuporte(req, res) {
        try {
            const { id } = req.params
            const usuarioLogado = req.usuario

            // Verificar se o usuário é ADMINISTRADOR
            if (usuarioLogado.usuarioTipo !== 'ADMINISTRADOR') {
                return res.status(403).json({
                    error: 'Apenas administradores podem acessar essa rota'
                })
            }

            // Verificar se o vínculo existe
            const vinculo = await prisma.tipoSuporteUnidade.findUnique({
                where: { TipSupUniId: id }
            })

            if (!vinculo) {
                return res.status(404).json({ error: 'Vínculo não encontrado' })
            }

            // Remover vínculo
            await prisma.tipoSuporteUnidade.delete({
                where: { TipSupUniId: id }
            })

            res.status(200).json({
                message: 'Vínculo removido com sucesso'
            })

        } catch (error) {
            console.error('Erro ao remover vínculo:', error)
            res.status(500).json({ error: 'Erro ao remover vínculo' })
        }
    }

}

module.exports = new TipoSuporteController();