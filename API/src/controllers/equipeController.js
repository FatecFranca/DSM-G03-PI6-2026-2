// src/controllers/equipeController.js
const prisma = require('../prisma.js');
const { getBrasilDateTime } = require('../utils/dataBrasilObter.js');

class EquipeController {

    // Cadastrar nova equipe (apenas gestores)
    async cadastrarEquipe(req, res) {
        try {
            const { UnidadeId, EquipeNome, EquipeDescricao, EquipeStatus } = req.body;
            const usuarioLogado = req.usuario;

            // Validações básicas
            if (!UnidadeId) {
                return res.status(400).json({ error: 'Unidade é obrigatória' });
            }

            if (!EquipeNome || !EquipeNome.trim()) {
                return res.status(400).json({ error: 'Nome da equipe é obrigatório' });
            }

            if (!EquipeDescricao || !EquipeDescricao.trim()) {
                return res.status(400).json({ error: 'Descrição da equipe é obrigatória' });
            }

            // Verificar se o usuário é GESTOR
            if (usuarioLogado.usuarioTipo !== 'GESTOR') {
                return res.status(403).json({
                    error: 'Apenas gestores podem cadastrar equipes'
                });
            }

            // Buscar gestor logado
            const gestorLogado = await prisma.gestor.findUnique({
                where: { GestorId: usuarioLogado.usuarioId, GestorStatus: 'ATIVO' }
            });

            if (!gestorLogado) {
                return res.status(403).json({ error: 'Gestor não encontrado' });
            }

            // Verificar status do gestor
            if (gestorLogado.GestorStatus !== 'ATIVO') {
                return res.status(403).json({
                    error: 'Seu usuário gestor está inativo. Não é possível cadastrar equipes.'
                });
            }

            // Verificar se o gestor pertence à unidade informada
            if (gestorLogado.UnidadeId !== parseInt(UnidadeId)) {
                return res.status(403).json({
                    error: 'Você só pode cadastrar equipes na sua própria unidade'
                });
            }

            // Verificar se a unidade existe e está ativa
            const unidade = await prisma.unidade.findUnique({
                where: { UnidadeId: parseInt(UnidadeId) }
            });

            if (!unidade) {
                return res.status(404).json({ error: 'Unidade não encontrada' });
            }

            if (unidade.UnidadeStatus !== 'ATIVA') {
                return res.status(400).json({
                    error: 'Não é possível cadastrar equipes em uma unidade inativa ou bloqueada'
                });
            }

            // Validar status se fornecido
            if (EquipeStatus) {
                const statusValidos = ['ATIVA', 'INATIVA'];
                if (!statusValidos.includes(EquipeStatus)) {
                    return res.status(400).json({
                        error: 'Status inválido. Use: ATIVA ou INATIVA'
                    });
                }
            }

            // Verificar se já existe equipe com o mesmo nome na mesma unidade
            const equipeExistente = await prisma.equipe.findFirst({
                where: {
                    UnidadeId: parseInt(UnidadeId),
                    EquipeNome: {
                        equals: EquipeNome.trim(),
                        mode: 'insensitive'
                    }
                }
            });

            if (equipeExistente) {
                return res.status(409).json({
                    error: 'Já existe uma equipe com este nome nesta unidade'
                });
            }

            // Criar equipe
            const equipe = await prisma.equipe.create({
                data: {
                    UnidadeId: parseInt(UnidadeId),
                    EquipeNome: EquipeNome.trim(),
                    EquipeDescricao: EquipeDescricao.trim(),
                    EquipeStatus: EquipeStatus || 'ATIVA',
                    EquipeDtCadastro: getBrasilDateTime()
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

            return res.status(201).json({
                message: 'Equipe cadastrada com sucesso',
                data: equipe
            });

        } catch (error) {
            console.error('Erro ao cadastrar equipe:', error);
            res.status(500).json({ error: 'Erro ao cadastrar equipe' });
        }
    }

    // Alterar equipe (apenas gestores)
    async alterarEquipe(req, res) {
        try {
            const { id } = req.params;
            const { EquipeNome, EquipeDescricao, EquipeStatus } = req.body;
            const usuarioLogado = req.usuario;

            const equipeId = id;
            if (!equipeId) {
                return res.status(400).json({ error: 'ID da equipe é obrigatório' });
            }

            // Verificar se o usuário é GESTOR
            if (usuarioLogado.usuarioTipo !== 'GESTOR') {
                return res.status(403).json({
                    error: 'Apenas gestores podem alterar equipes'
                });
            }

            // Buscar gestor logado
            const gestorLogado = await prisma.gestor.findUnique({
                where: { GestorId: usuarioLogado.usuarioId, GestorStatus: 'ATIVO' }
            });

            if (!gestorLogado) {
                return res.status(403).json({ error: 'Gestor não encontrado' });
            }

            // Verificar status do gestor
            if (gestorLogado.GestorStatus !== 'ATIVO') {
                return res.status(403).json({
                    error: 'Seu usuário gestor está inativo. Não é possível alterar equipes.'
                });
            }

            // Buscar equipe a ser alterada
            const equipeExistente = await prisma.equipe.findUnique({
                where: { EquipeId: equipeId },
                include: {
                    Unidade: true
                }
            });

            if (!equipeExistente) {
                return res.status(404).json({ error: 'Equipe não encontrada' });
            }

            // Verificar se o gestor pertence à mesma unidade da equipe
            if (gestorLogado.UnidadeId !== equipeExistente.UnidadeId) {
                return res.status(403).json({
                    error: 'Você só pode alterar equipes da sua própria unidade'
                });
            }

            // Verificar se a unidade está ativa
            if (equipeExistente.Unidade.UnidadeStatus !== 'ATIVA') {
                return res.status(400).json({
                    error: 'Não é possível alterar equipes de uma unidade inativa ou bloqueada'
                });
            }

            // Preparar dados para atualização
            const dadosAtualizacao = {};

            // Validar e adicionar nome se fornecido
            if (EquipeNome !== undefined) {
                if (!EquipeNome.trim()) {
                    return res.status(400).json({ error: 'Nome da equipe não pode ser vazio' });
                }

                // Verificar se já existe outra equipe com o mesmo nome na mesma unidade
                if (EquipeNome.trim().toLowerCase() !== equipeExistente.EquipeNome.toLowerCase()) {
                    const equipeMesmoNome = await prisma.equipe.findFirst({
                        where: {
                            UnidadeId: equipeExistente.UnidadeId,
                            EquipeNome: {
                                equals: EquipeNome.trim(),
                                mode: 'insensitive'
                            },
                            EquipeId: {
                                not: equipeId
                            }
                        }
                    });

                    if (equipeMesmoNome) {
                        return res.status(409).json({
                            error: 'Já existe outra equipe com este nome nesta unidade'
                        });
                    }
                }

                dadosAtualizacao.EquipeNome = EquipeNome.trim();
            }

            // Validar e adicionar descrição se fornecida
            if (EquipeDescricao !== undefined) {
                if (!EquipeDescricao.trim()) {
                    return res.status(400).json({ error: 'Descrição da equipe não pode ser vazia' });
                }
                dadosAtualizacao.EquipeDescricao = EquipeDescricao.trim();
            }

            // Validar e adicionar status se fornecido
            if (EquipeStatus !== undefined) {
                const statusValidos = ['ATIVA', 'INATIVA'];
                if (!statusValidos.includes(EquipeStatus)) {
                    return res.status(400).json({
                        error: 'Status inválido. Use: ATIVA ou INATIVA'
                    });
                }

                dadosAtualizacao.EquipeStatus = EquipeStatus;
            }

            // Verificar se há dados para atualizar
            if (Object.keys(dadosAtualizacao).length === 0) {
                return res.status(400).json({ error: 'Nenhum dado fornecido para atualização' });
            }

            // Atualizar equipe
            const equipeAtualizada = await prisma.equipe.update({
                where: { EquipeId: equipeId },
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

            res.status(200).json({
                message: 'Equipe atualizada com sucesso',
                data: equipeAtualizada
            });

        } catch (error) {
            console.error('Erro ao alterar equipe:', error);
            res.status(500).json({ error: 'Erro ao alterar equipe' });
        }
    }

    // Listar equipes com filtros
    async listarEquipes(req, res) {
        try {
            const {
                unidadeId,
                status,
                nome,
                pagina = 1,
                limite = 10
            } = req.query;

            const usuarioLogado = req.usuario;

            // Construir filtro base
            const filtro = {};

            // Aplicar filtros de acordo com permissão
            if (usuarioLogado?.usuarioTipo === 'GESTOR') {
                const gestorLogado = await prisma.gestor.findUnique({
                    where: { GestorId: usuarioLogado.usuarioId, GestorStatus: 'ATIVO' }
                });

                if (gestorLogado) {
                    // Gestor só vê equipes da sua unidade
                    filtro.UnidadeId = gestorLogado.UnidadeId;
                }
            }

            // Aplicar filtros da query
            if (unidadeId) {
                // Se for admin ou se o filtro for compatível com a permissão
                if (usuarioLogado?.usuarioTipo === 'ADMINISTRADOR') {
                    filtro.UnidadeId = parseInt(unidadeId);
                }
            }

            if (status) {
                const statusValidos = ['ATIVA', 'INATIVA'];
                if (!statusValidos.includes(status)) {
                    return res.status(400).json({
                        error: 'Status inválido. Use: ATIVA ou INATIVA'
                    });
                }
                filtro.EquipeStatus = status;
            }

            if (nome) {
                filtro.EquipeNome = {
                    contains: nome,
                    mode: 'insensitive'
                };
            }

            // Calcular paginação
            const paginaAtual = parseInt(pagina);
            const limitePorPagina = parseInt(limite);
            const skip = (paginaAtual - 1) * limitePorPagina;

            // Buscar equipes
            const [equipes, total] = await prisma.$transaction([
                prisma.equipe.findMany({
                    where: filtro,
                    orderBy: [
                        { EquipeNome: 'asc' }
                    ],
                    skip: skip,
                    take: limitePorPagina,
                    include: {
                        Unidade: {
                            select: {
                                UnidadeId: true,
                                UnidadeNome: true,
                                UnidadeStatus: true
                            }
                        },
                        _count: {
                            select: {
                                TecnicoEquipe: {
                                    where: {
                                        TecEquStatus: 'ATIVO'
                                    }
                                },
                                Chamado: {
                                    where: {
                                        ChamadoStatus: {
                                            in: ['ATRIBUIDO', 'EMATENDIMENTO']
                                        }
                                    }
                                }
                            }
                        }
                    }
                }),
                prisma.equipe.count({ where: filtro })
            ]);

            res.status(200).json({
                data: equipes,
                paginacao: {
                    paginaAtual,
                    limitePorPagina,
                    totalRegistros: total,
                    totalPaginas: Math.ceil(total / limitePorPagina)
                }
            });

        } catch (error) {
            console.error('Erro ao listar equipes:', error);
            res.status(500).json({ error: 'Erro ao listar equipes' });
        }
    }

    // Buscar equipe por ID
    async buscarEquipePorId(req, res) {
        try {
            const { id } = req.params;
            const usuarioLogado = req.usuario;

            const equipeId = id;
            if (!equipeId) {
                return res.status(400).json({ error: 'ID da equipe é obrigatório' });
            }

            // Buscar equipe
            const equipe = await prisma.equipe.findUnique({
                where: { EquipeId: equipeId, UnidadeId: Number(usuarioLogado.unidadeId) },
                include: {
                    Unidade: {
                        select: {
                            UnidadeId: true,
                            UnidadeNome: true,
                            UnidadeStatus: true
                        }
                    },
                    TecnicoEquipe: {
                        where: {
                            TecEquStatus: 'ATIVO'
                        },
                        include: {
                            Tecnico: {
                                select: {
                                    TecnicoId: true,
                                    TecnicoNome: true,
                                    TecnicoEmail: true,
                                    TecnicoStatus: true,
                                    Departamento: {
                                        select: {
                                            DepartamentoId: true,
                                            DepartamentoNome: true
                                        }
                                    }
                                }
                            }
                        }
                    },
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

            if (!equipe) {
                return res.status(404).json({ error: 'Equipe não encontrada' });
            }

            // Verificar permissão de visualização para gestores
            if (usuarioLogado?.usuarioTipo === 'GESTOR') {
                const gestorLogado = await prisma.gestor.findUnique({
                    where: { GestorId: usuarioLogado.usuarioId, GestorStatus: 'ATIVO' }
                });

                if (gestorLogado && gestorLogado.UnidadeId !== equipe.UnidadeId) {
                    return res.status(403).json({
                        error: 'Você só pode visualizar equipes da sua própria unidade'
                    });
                }
            }

            res.status(200).json({
                data: equipe
            });

        } catch (error) {
            console.error('Erro ao buscar equipe:', error);
            res.status(500).json({ error: 'Erro ao buscar equipe' });
        }
    }

    // Alterar apenas status da equipe (apenas gestores)
    async alterarStatusEquipe(req, res) {
        try {
            const { id } = req.params;
            const { EquipeStatus } = req.body;
            const usuarioLogado = req.usuario;

            const equipeId = id;
            if (!equipeId) {
                return res.status(400).json({ error: 'ID da equipe é obrigatório' });
            }

            // Validar status
            if (!EquipeStatus) {
                return res.status(400).json({ error: 'Status é obrigatório' });
            }

            const statusValidos = ['ATIVA', 'INATIVA'];
            if (!statusValidos.includes(EquipeStatus)) {
                return res.status(400).json({
                    error: 'Status inválido. Use: ATIVA ou INATIVA'
                });
            }

            // Verificar se o usuário é GESTOR
            if (usuarioLogado.usuarioTipo !== 'GESTOR') {
                return res.status(403).json({
                    error: 'Apenas gestores podem alterar status de equipes'
                });
            }

            // Buscar gestor logado
            const gestorLogado = await prisma.gestor.findUnique({
                where: { GestorId: usuarioLogado.usuarioId, GestorStatus: 'ATIVO' }
            });

            if (!gestorLogado) {
                return res.status(403).json({ error: 'Gestor não encontrado' });
            }

            // Verificar status do gestor
            if (gestorLogado.GestorStatus !== 'ATIVO') {
                return res.status(403).json({
                    error: 'Seu usuário gestor está inativo. Não é possível alterar status.'
                });
            }

            // Buscar equipe
            const equipeExistente = await prisma.equipe.findUnique({
                where: { EquipeId: equipeId },
                include: {
                    Unidade: true
                }
            });

            if (!equipeExistente) {
                return res.status(404).json({ error: 'Equipe não encontrada' });
            }

            // Verificar se o gestor pertence à mesma unidade da equipe
            if (gestorLogado.UnidadeId !== equipeExistente.UnidadeId) {
                return res.status(403).json({
                    error: 'Você só pode alterar status de equipes da sua própria unidade'
                });
            }

            // Verificar se a unidade está ativa
            if (equipeExistente.Unidade.UnidadeStatus !== 'ATIVA') {
                return res.status(400).json({
                    error: 'Não é possível alterar status de equipes de uma unidade inativa ou bloqueada'
                });
            }

            // Atualizar status em transação para garantir consistência
            let equipeAtualizada;
            await prisma.$transaction(async (tx) => {

                // Desativa todos os vinculos de técnicos com a equipe se a equipe for inativada
                if (EquipeStatus === 'INATIVA') {
                    await prisma.tecnicoEquipe.updateMany({
                        where: { EquipeId: equipeId },
                        data: { TecEquStatus: 'INATIVO' }
                    });
                }

                equipeAtualizada = await prisma.equipe.update({
                    where: { EquipeId: equipeId },
                    data: { EquipeStatus: EquipeStatus },
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
            });

            res.status(200).json({
                message: 'Status da equipe atualizado com sucesso',
                data: equipeAtualizada
            });

        } catch (error) {
            console.error('Erro ao alterar status da equipe:', error);
            res.status(500).json({ error: 'Erro ao alterar status da equipe' });
        }
    }

    // Adicionar técnico à equipe (apenas gestores)
    async adicionarTecnicoEquipe(req, res) {
        try {
            const { equipeId } = req.params;
            const { TecnicoId, TecEquStatus } = req.body;
            const usuarioLogado = req.usuario;

            // Validações básicas
            if (!TecnicoId) {
                return res.status(400).json({ error: 'ID do técnico é obrigatório' });
            }

            if (!equipeId || !TecnicoId) {
                return res.status(400).json({ error: 'IDs inválidos' });
            }

            // Verificar se o usuário é GESTOR
            if (usuarioLogado.usuarioTipo !== 'GESTOR') {
                return res.status(403).json({
                    error: 'Apenas gestores podem gerenciar vínculos de equipes'
                });
            }

            // Buscar gestor logado
            const gestorLogado = await prisma.gestor.findUnique({
                where: { GestorId: usuarioLogado.usuarioId, GestorStatus: 'ATIVO' }
            });

            if (!gestorLogado) {
                return res.status(403).json({ error: 'Gestor não encontrado' });
            }

            // Verificar status do gestor
            if (gestorLogado.GestorStatus !== 'ATIVO') {
                return res.status(403).json({
                    error: 'Seu usuário gestor está inativo. Não é possível gerenciar vínculos.'
                });
            }

            // Buscar equipe
            const equipe = await prisma.equipe.findUnique({
                where: { EquipeId: equipeId },
                include: {
                    Unidade: true
                }
            });

            if (!equipe) {
                return res.status(404).json({ error: 'Equipe não encontrada' });
            }

            // Verificar se o gestor pertence à mesma unidade da equipe
            if (gestorLogado.UnidadeId !== equipe.UnidadeId) {
                return res.status(403).json({
                    error: 'Você só pode gerenciar vínculos de equipes da sua própria unidade'
                });
            }

            // Verificar se a equipe está ativa
            if (equipe.EquipeStatus !== 'ATIVA') {
                return res.status(400).json({
                    error: 'Não é possível adicionar técnicos a uma equipe inativa'
                });
            }

            // Buscar técnico
            const tecnico = await prisma.tecnico.findUnique({
                where: { TecnicoId: TecnicoId },
                include: {
                    Unidade: true
                }
            });

            if (!tecnico) {
                return res.status(404).json({ error: 'Técnico não encontrado' });
            }

            // Verificar se o técnico pertence à mesma unidade
            if (tecnico.UnidadeId !== equipe.UnidadeId) {
                return res.status(400).json({
                    error: 'O técnico não pertence à mesma unidade da equipe'
                });
            }

            // Verificar se o técnico está ativo
            if (tecnico.TecnicoStatus !== 'ATIVO') {
                return res.status(400).json({
                    error: 'Não é possível adicionar um técnico inativo ou bloqueado à equipe'
                });
            }

            // Verificar se o vínculo já existe
            // Verificar se o vínculo já existe
            const vinculoExistente = await prisma.tecnicoEquipe.findFirst({
                where: {
                    EquipeId: equipeId,
                    TecnicoId: TecnicoId
                }
            });

            if (vinculoExistente) {
                return res.status(409).json({
                    error: 'Este técnico já está vinculado a esta equipe'
                });
            }

            // Validar status se fornecido
            let statusVinculo = 'ATIVO';
            if (TecEquStatus) {
                const statusValidos = ['ATIVO', 'INATIVO'];
                if (!statusValidos.includes(TecEquStatus)) {
                    return res.status(400).json({
                        error: 'Status inválido. Use: ATIVO ou INATIVO'
                    });
                }
                statusVinculo = TecEquStatus;
            }

            // Criar vínculo
            const vinculo = await prisma.tecnicoEquipe.create({
                data: {
                    EquipeId: equipeId,
                    TecnicoId: TecnicoId,
                    TecEquStatus: statusVinculo,
                    TecEquDtVin: getBrasilDateTime()
                },
                include: {
                    Equipe: {
                        select: {
                            EquipeId: true,
                            EquipeNome: true,
                            EquipeStatus: true
                        }
                    },
                    Tecnico: {
                        select: {
                            TecnicoId: true,
                            TecnicoNome: true,
                            TecnicoEmail: true,
                            TecnicoStatus: true
                        }
                    }
                }
            });

            return res.status(201).json({
                message: 'Técnico adicionado à equipe com sucesso',
                data: vinculo
            });

        } catch (error) {
            console.error('Erro ao adicionar técnico à equipe:', error);
            return res.status(500).json({ error: 'Erro ao adicionar técnico à equipe' });
        }
    }

    // Alterar vínculo técnico-equipe (apenas gestores)
    async alterarTecnicoEquipe(req, res) {
        try {
            const { vinculoId } = req.params;
            const { TecEquStatus } = req.body;
            const usuarioLogado = req.usuario;

            if (!vinculoId) {
                return res.status(400).json({ error: 'ID do vínculo é obrigatório' });
            }

            // Validar status
            if (!TecEquStatus) {
                return res.status(400).json({ error: 'Status é obrigatório' });
            }

            const statusValidos = ['ATIVO', 'INATIVO'];
            if (!statusValidos.includes(TecEquStatus)) {
                return res.status(400).json({
                    error: 'Status inválido. Use: ATIVO ou INATIVO'
                });
            }

            // Verificar se o usuário é GESTOR
            if (usuarioLogado.usuarioTipo !== 'GESTOR') {
                return res.status(403).json({
                    error: 'Apenas gestores podem alterar vínculos de equipes'
                });
            }

            // Buscar gestor logado
            const gestorLogado = await prisma.gestor.findUnique({
                where: { GestorId: usuarioLogado.usuarioId, GestorStatus: 'ATIVO' }
            });

            if (!gestorLogado) {
                return res.status(403).json({ error: 'Gestor não encontrado' });
            }

            // Verificar status do gestor
            if (gestorLogado.GestorStatus !== 'ATIVO') {
                return res.status(403).json({
                    error: 'Seu usuário gestor está inativo. Não é possível alterar vínculos.'
                });
            }

            // Buscar vínculo
            const vinculo = await prisma.tecnicoEquipe.findFirst({
                where: { TecEquId: vinculoId },
                include: {
                    Equipe: {
                        include: {
                            Unidade: true
                        }
                    },
                    Tecnico: {
                        select: {
                            TecnicoId: true,
                            TecnicoStatus: true
                        }
                    }
                }
            });

            if (!vinculo) {
                return res.status(404).json({ error: 'Vínculo não encontrado' });
            }

            // Verificar se o gestor pertence à mesma unidade da equipe
            if (gestorLogado.UnidadeId !== vinculo.Equipe.UnidadeId) {
                return res.status(403).json({
                    error: 'Você só pode alterar vínculos de equipes da sua própria unidade'
                });
            }

            // Verificar se a equipe esta ativa
            if (vinculo.Equipe.EquipeStatus !== 'ATIVA') {
                return res.status(403).json({
                    error: 'Não é possivel alterar vínculos de técnicos em equipes que não estão ativas'
                });
            }

            // Verificar se o tecnico esta ativo
            if (vinculo.Tecnico.TecnicoStatus !== 'ATIVO') {
                return res.status(403).json({
                    error: 'Não é possivel alterar vínculos de técnicos que não estão ativos'
                });
            }

            // Atualizar vínculo
            const vinculoAtualizado = await prisma.tecnicoEquipe.update({
                where: { TecEquId: vinculoId },
                data: { TecEquStatus: TecEquStatus },
                include: {
                    Equipe: {
                        select: {
                            EquipeId: true,
                            EquipeNome: true,
                            EquipeStatus: true
                        }
                    },
                    Tecnico: {
                        select: {
                            TecnicoId: true,
                            TecnicoNome: true,
                            TecnicoEmail: true,
                            TecnicoStatus: true
                        }
                    }
                }
            });

            res.status(200).json({
                message: 'Vínculo atualizado com sucesso',
                data: vinculoAtualizado
            });

        } catch (error) {
            console.error('Erro ao alterar vínculo:', error);
            res.status(500).json({ error: 'Erro ao alterar vínculo' });
        }
    }

    // Remover vínculo técnico-equipe (apenas gestores) - EXCLUSÃO PERMITIDA
    async removerTecnicoEquipe(req, res) {
        try {
            const { vinculoId } = req.params;
            const usuarioLogado = req.usuario;

            if (!vinculoId) {
                return res.status(400).json({ error: 'ID do vínculo inválido' });
            }

            // Verificar se o usuário é GESTOR
            if (usuarioLogado.usuarioTipo !== 'GESTOR') {
                return res.status(403).json({
                    error: 'Apenas gestores podem remover vínculos de equipes'
                });
            }

            // Buscar gestor logado
            const gestorLogado = await prisma.gestor.findUnique({
                where: { GestorId: usuarioLogado.usuarioId, GestorStatus: 'ATIVO' }
            });

            if (!gestorLogado) {
                return res.status(403).json({ error: 'Gestor não encontrado' });
            }

            // Verificar status do gestor
            if (gestorLogado.GestorStatus !== 'ATIVO') {
                return res.status(403).json({
                    error: 'Seu usuário gestor está inativo. Não é possível remover vínculos.'
                });
            }

            // Buscar vínculo
            const vinculo = await prisma.tecnicoEquipe.findFirst({
                where: { TecEquId: vinculoId },
                include: {
                    Equipe: {
                        include: {
                            Unidade: true
                        }
                    }
                }
            });

            if (!vinculo) {
                return res.status(404).json({ error: 'Vínculo não encontrado' });
            }

            // Verificar se o gestor pertence à mesma unidade da equipe
            if (gestorLogado.UnidadeId !== vinculo.Equipe.UnidadeId) {
                return res.status(403).json({
                    error: 'Você só pode remover vínculos de equipes da sua própria unidade'
                });
            }

            // Verificar se existem chamados em andamento para este técnico nesta equipe
            const chamadosEmAndamento = await prisma.chamado.count({
                where: {
                    EquipeId: vinculo.EquipeId,
                    ChamadoStatus: {
                        in: ['ATRIBUIDO', 'EMATENDIMENTO']
                    }
                }
            });

            if (chamadosEmAndamento > 0) {
                return res.status(400).json({
                    error: 'Não é possível remover um técnico de uma equipe com chamados em andamento. Finalize os chamados primeiro ou apenas inactive o vínculo.'
                });
            }

            // Verificar se a equipe está ativa
            if (vinculo.Equipe.EquipeStatus !== 'ATIVA') {
                return res.status(400).json({
                    error: 'Não é possível remover técnicos de uma equipe inativa'
                });
            }

            // Remover vínculo (EXCLUSÃO PERMITIDA)
            await prisma.tecnicoEquipe.delete({
                where: { TecEquId: vinculoId }
            });

            res.status(200).json({
                message: 'Vínculo removido com sucesso'
            });

        } catch (error) {
            console.error('Erro ao remover vínculo:', error);
            res.status(500).json({ error: 'Erro ao remover vínculo' });
        }
    }

    // Listar vínculos de uma equipe
    async listarVinculosPorEquipe(req, res) {
        try {
            const { equipeId } = req.params;
            const { status, apenasAtivos } = req.query;
            const usuarioLogado = req.usuario;

            if (!equipeId) {
                return res.status(400).json({ error: 'ID da equipe é obrigado' });
            }

            // Verificar permissão
            if (usuarioLogado?.usuarioTipo === 'GESTOR') {
                const gestorLogado = await prisma.gestor.findUnique({
                    where: { GestorId: usuarioLogado.usuarioId, GestorStatus: 'ATIVO' }
                });

                if (gestorLogado) {
                    const equipe = await prisma.equipe.findUnique({
                        where: { EquipeId: equipeId },
                        select: { UnidadeId: true }
                    });

                    if (!equipe) {
                        return res.status(404).json({ error: 'Equipe não encontrada' });
                    }

                    if (gestorLogado.UnidadeId !== equipe.UnidadeId) {
                        return res.status(403).json({
                            error: 'Você só pode visualizar vínculos de equipes da sua própria unidade'
                        });
                    }
                }
            }

            // Construir filtro
            const filtro = {
                EquipeId: equipeId
            };

            if (status) {
                const statusValidos = ['ATIVO', 'INATIVO'];
                if (!statusValidos.includes(status)) {
                    return res.status(400).json({
                        error: 'Status inválido. Use: ATIVO ou INATIVO'
                    });
                }
                filtro.TecEquStatus = status;
            } else if (apenasAtivos === 'true') {
                filtro.TecEquStatus = 'ATIVO';
            }

            // Buscar vínculos
            const vinculos = await prisma.tecnicoEquipe.findMany({
                where: filtro,
                orderBy: {
                    Tecnico: {
                        TecnicoNome: 'asc'
                    }
                },
                include: {
                    Tecnico: {
                        select: {
                            TecnicoId: true,
                            TecnicoNome: true,
                            TecnicoEmail: true,
                            TecnicoTelefone: true,
                            TecnicoStatus: true,
                            Departamento: {
                                select: {
                                    DepartamentoId: true,
                                    DepartamentoNome: true
                                }
                            }
                        }
                    }
                }
            });

            res.status(200).json({
                data: vinculos,
                total: vinculos.length
            });

        } catch (error) {
            console.error('Erro ao listar vínculos:', error);
            res.status(500).json({ error: 'Erro ao listar vínculos' });
        }
    }

    // Listar vínculos de um técnico
    async listarVinculosPorTecnico(req, res) {
        try {
            const { tecnicoId } = req.params;
            const { status, apenasAtivos } = req.query;
            const usuarioLogado = req.usuario;

            if (!tecnicoId) {
                return res.status(400).json({ error: 'ID do técnico inválido' });
            }

            // Verificar permissão
            if (usuarioLogado?.usuarioTipo === 'GESTOR') {
                const gestorLogado = await prisma.gestor.findUnique({
                    where: { GestorId: usuarioLogado.usuarioId, GestorStatus: 'ATIVO' }
                });

                if (gestorLogado) {
                    const tecnico = await prisma.tecnico.findUnique({
                        where: { TecnicoId: tecnicoId },
                        select: { UnidadeId: true }
                    });

                    if (!tecnico) {
                        return res.status(404).json({ error: 'Técnico não encontrado' });
                    }

                    if (gestorLogado.UnidadeId !== tecnico.UnidadeId) {
                        return res.status(403).json({
                            error: 'Você só pode visualizar vínculos de técnicos da sua própria unidade'
                        });
                    }
                }
            } else if (usuarioLogado?.usuarioTipo === 'TECNICO') {
                // Técnico só pode ver seus próprios vínculos
                if (usuarioLogado.usuarioId !== tecnicoId) {
                    return res.status(403).json({
                        error: 'Você só pode visualizar seus próprios vínculos'
                    });
                }
            }

            // Construir filtro
            const filtro = {
                TecnicoId: tecnicoId
            };

            if (status) {
                const statusValidos = ['ATIVO', 'INATIVO'];
                if (!statusValidos.includes(status)) {
                    return res.status(400).json({
                        error: 'Status inválido. Use: ATIVO ou INATIVO'
                    });
                }
                filtro.TecEquStatus = status;
            } else if (apenasAtivos === 'true') {
                filtro.TecEquStatus = 'ATIVO';
            }

            // Buscar vínculos
            const vinculos = await prisma.tecnicoEquipe.findMany({
                where: filtro,
                orderBy: {
                    Equipe: {
                        EquipeNome: 'asc'
                    }
                },
                include: {
                    Equipe: {
                        select: {
                            EquipeId: true,
                            EquipeNome: true,
                            EquipeDescricao: true,
                            EquipeStatus: true
                        }
                    }
                }
            });

            res.status(200).json({
                data: vinculos,
                total: vinculos.length
            });

        } catch (error) {
            console.error('Erro ao listar vínculos do técnico:', error);
            res.status(500).json({ error: 'Erro ao listar vínculos do técnico' });
        }
    }

}

module.exports = new EquipeController();