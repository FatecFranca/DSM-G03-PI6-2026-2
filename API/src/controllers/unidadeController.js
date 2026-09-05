// src/controllers/unidadeController.js
const prisma = require('../prisma.js');
const { getBrasilDateTime } = require('../utils/dataBrasilObter.js');
const { gravarLog } = require('../utils/logGrava.js');

class UnidadeController {

    // Cadastrar nova unidade (apenas ADMINISTRADOR)
    async cadastrarUnidade(req, res) {
        try {
            const { UnidadeNome, UnidadeStatus, UnidadeTelefone, UnidadeEmail } = req.body;

            // Verificar se o usuário é ADMINISTRADOR
            if (req.usuario.usuarioTipo !== 'ADMINISTRADOR') {
                return res.status(403).json({
                    error: 'Apenas administradores podem cadastrar unidades'
                });
            }

            // Validações básicas
            if (!UnidadeNome || !UnidadeNome.trim()) {
                return res.status(400).json({
                    error: 'Nome da unidade é obrigatório'
                });
            }

            // Validar status (se fornecido)
            const statusValidos = ['ATIVA', 'INATIVA', 'BLOQUEADA'];
            if (UnidadeStatus && !statusValidos.includes(UnidadeStatus)) {
                return res.status(400).json({
                    error: 'Status inválido. Use: ATIVA, INATIVA ou BLOQUEADA'
                });
            }

            // Verificar se já existe unidade com o mesmo nome
            const unidadeExistente = await prisma.unidade.findFirst({
                where: {
                    UnidadeNome: {
                        equals: UnidadeNome.trim(),
                        mode: 'insensitive' // Case insensitive
                    }
                }
            });

            if (unidadeExistente) {
                return res.status(409).json({
                    error: 'Já existe uma unidade com este nome'
                });
            }

            // Criar unidade
            const unidade = await prisma.unidade.create({
                data: {
                    UnidadeNome: UnidadeNome.trim(),
                    UnidadeStatus: UnidadeStatus || 'ATIVA', // Status padrão se não informado
                    UnidadeDtCadastro: getBrasilDateTime(),
                    UnidadeEmail: UnidadeEmail.trim(),
                    UnidadeTelefone: UnidadeTelefone.trim()
                }
            });

            // --- Gravar log de criação
            const LogAcao = 'CADASTRARUNIDADE';
            const LogDetelhe = 'Foi cadastrada a unidade de ID (' + unidade.UnidadeId + ')';
            await gravarLog(String(req.usuario.usuarioId).trim(), LogAcao, req.usuario.usuarioTipo, LogDetelhe, String(unidade.UnidadeId).trim());
            // ---

            return res.status(201).json({
                message: 'Unidade cadastrada com sucesso',
                data: unidade
            });

        } catch (error) {
            console.error('Erro ao cadastrar unidade:', error);
            return res.status(500).json({
                error: 'Erro ao cadastrar unidade'
            });
        }
    }

    // Alterar unidade (apenas ADMINISTRADOR)
    async alterarUnidade(req, res) {
        try {
            const { id } = req.params;
            const { UnidadeNome, UnidadeStatus, UnidadeTelefone, UnidadeEmail } = req.body;

            // Verificar se o usuário é ADMINISTRADOR
            if (req.usuario.usuarioTipo !== 'ADMINISTRADOR') {
                return res.status(403).json({
                    error: 'Apenas administradores podem alterar unidades'
                });
            }

            // Validar ID
            const unidadeId = parseInt(id);
            if (isNaN(unidadeId)) {
                return res.status(400).json({
                    error: 'ID da unidade inválido'
                });
            }

            // Buscar unidade existente
            const unidadeExistente = await prisma.unidade.findUnique({
                where: {
                    UnidadeId: unidadeId
                }
            });

            if (!unidadeExistente) {
                return res.status(404).json({
                    error: 'Unidade não encontrada'
                });
            }

            // Preparar dados para atualização
            const dadosAtualizacao = {};

            // Validar e adicionar nome se fornecido
            if (UnidadeNome !== undefined) {
                if (!UnidadeNome.trim()) {
                    return res.status(400).json({
                        error: 'Nome da unidade não pode ser vazio'
                    });
                }

                // Verificar se já existe outra unidade com o mesmo nome
                if (UnidadeNome.trim().toLowerCase() !== unidadeExistente.UnidadeNome.toLowerCase()) {
                    const unidadeMesmoNome = await prisma.unidade.findFirst({
                        where: {
                            UnidadeNome: {
                                equals: UnidadeNome.trim(),
                                mode: 'insensitive'
                            },
                            UnidadeId: {
                                not: unidadeId
                            }
                        }
                    });

                    if (unidadeMesmoNome) {
                        return res.status(409).json({
                            error: 'Já existe outra unidade com este nome'
                        });
                    }
                }

                dadosAtualizacao.UnidadeNome = UnidadeNome.trim();
            }

            // Validar e adicionar status se fornecido
            if (UnidadeStatus !== undefined) {
                const statusValidos = ['ATIVA', 'INATIVA', 'BLOQUEADA'];
                if (!statusValidos.includes(UnidadeStatus)) {
                    return res.status(400).json({
                        error: 'Status inválido. Use: ATIVA, INATIVA ou BLOQUEADA'
                    });
                }
                dadosAtualizacao.UnidadeStatus = UnidadeStatus;
            }

            // Podem ser nulos, sem validação de nulicidade
            dadosAtualizacao.UnidadeTelefone = UnidadeTelefone;
            dadosAtualizacao.UnidadeEmail = UnidadeEmail;

            // Verificar se há dados para atualizar
            if (Object.keys(dadosAtualizacao).length === 0) {
                return res.status(400).json({
                    error: 'Nenhum dado fornecido para atualização'
                });
            }

            // Atualizar unidade
            const unidadeAtualizada = await prisma.unidade.update({
                where: {
                    UnidadeId: unidadeId
                },
                data: dadosAtualizacao
            });

            // --- Gravar log de alteração
            const LogAcao = 'ALTERARUNIDADE';
            const LogDetelhe = 'Foi alterada a unidade de ID (' + unidadeAtualizada.UnidadeId + '), dados antes da alteração (' + JSON.stringify(unidadeExistente) + '), dados depois da atualização (' + JSON.stringify(unidadeAtualizada) + ')';
            await gravarLog(String(req.usuario.usuarioId).trim(), LogAcao, req.usuario.usuarioTipo, LogDetelhe, String(unidadeAtualizada.UnidadeId).trim());
            // ---

            return res.status(200).json({
                message: 'Unidade atualizada com sucesso',
                data: unidadeAtualizada
            });

        } catch (error) {
            console.error('Erro ao alterar unidade:', error);
            return res.status(500).json({
                error: 'Erro ao alterar unidade'
            });
        }
    }

    // Listar todas as unidades (todos devido a necessidade de abertura de solicitação)
    async listarUnidades(req, res) {
        try {
            const { status, pagina = 1, limite = 10 } = req.query;

            // Construir filtro
            const filtro = {};

            // Filtrar por status se fornecido
            if (status) {
                const statusValidos = ['ATIVA', 'INATIVA', 'BLOQUEADA'];
                if (!statusValidos.includes(status)) {
                    return res.status(400).json({
                        error: 'Status inválido. Use: ATIVA, INATIVA ou BLOQUEADA'
                    });
                }
                filtro.UnidadeStatus = status;
            }

            // Calcular paginação
            const paginaAtual = parseInt(pagina);
            const limitePorPagina = parseInt(limite);
            const skip = (paginaAtual - 1) * limitePorPagina;

            // Buscar unidades
            const usuarioLogado = req.usuario;
            console.log('usuarioLogado = ', usuarioLogado);
            console.log('usuarioLogado = ', usuarioLogado);
            if (usuarioLogado) {
                if (usuarioLogado.usuarioTipo === 'ADMINISTRADOR') {
                    const [unidades, total] = await prisma.$transaction([
                        prisma.unidade.findMany({
                            where: filtro,
                            orderBy: {
                                UnidadeNome: 'asc'
                            },
                            skip: skip,
                            take: limitePorPagina,
                            include: {
                                _count: {
                                    select: {
                                        Departamento: true,
                                        Pessoa: true,
                                        Gestor: true,
                                        Tecnico: true,
                                        Chamado: true,
                                        TipoSuporteUnidade: {
                                            where: {
                                                TipSupUniStatus: 'ATIVO'
                                            }
                                        }
                                    }
                                }
                            }
                        }),
                        prisma.unidade.count({
                            where: filtro
                        })
                    ]);

                    return res.status(200).json({
                        data: unidades,
                        paginacao: {
                            paginaAtual,
                            limitePorPagina,
                            totalRegistros: total,
                            totalPaginas: Math.ceil(total / limitePorPagina)
                        }
                    });
                }
            } else {
                // Para outros tipos de usuários listtar somente o nome e as unidades ativas
                const unidades = await prisma.unidade.findMany({
                    where: { UnidadeStatus: 'ATIVA' },
                    orderBy: {
                        UnidadeNome: 'asc'
                    },
                    select: {
                        UnidadeId: true,
                        UnidadeNome: true
                    }
                });

                return res.status(200).json({
                    data: unidades
                });
            }

        } catch (error) {
            console.error('Erro ao listar unidades:', error);
            return res.status(500).json({
                error: 'Erro ao listar unidades'
            });
        }
    }

    // Buscar unidade por ID
    async buscarUnidadePorId(req, res) {
        try {
            const { id } = req.params;

            // Validar ID
            const unidadeId = parseInt(id);
            if (isNaN(unidadeId)) {
                return res.status(400).json({
                    error: 'ID da unidade inválido'
                });
            }

            // Buscar unidade com contagens
            const unidade = await prisma.unidade.findUnique({
                where: {
                    UnidadeId: unidadeId
                },
                include: {
                    _count: {
                        select: {
                            Departamento: true,
                            Pessoa: true,
                            TipoSuporte: true
                        }
                    },
                    Departamento: {
                        select: {
                            DepartamentoId: true,
                            DepartamentoNome: true,
                            DepartamentoStatus: true
                        }
                    },
                    TipoSuporte: {
                        select: {
                            TipSupId: true,
                            TipSupNom: true,
                            TipSupStatus: true
                        }
                    }
                }
            });

            if (!unidade) {
                return res.status(404).json({
                    error: 'Unidade não encontrada'
                });
            }

            return res.status(200).json({
                data: unidade
            });

        } catch (error) {
            console.error('Erro ao buscar unidade:', error);
            return res.status(500).json({
                error: 'Erro ao buscar unidade'
            });
        }
    }

    // Alterar apenas status da unidade (apenas ADMINISTRADOR)
    async alterarStatusUnidade(req, res) {
        try {
            const { id } = req.params;
            const { UnidadeStatus } = req.body;

            // Verificar se o usuário é ADMINISTRADOR
            if (req.usuario.usuarioTipo !== 'ADMINISTRADOR') {
                return res.status(403).json({
                    error: 'Apenas administradores podem alterar status de unidades'
                });
            }

            // Validar ID
            const unidadeId = parseInt(id);
            if (isNaN(unidadeId)) {
                return res.status(400).json({
                    error: 'ID da unidade inválido'
                });
            }

            // Validar status
            if (!UnidadeStatus) {
                return res.status(400).json({
                    error: 'Status é obrigatório'
                });
            }

            const statusValidos = ['ATIVA', 'INATIVA', 'BLOQUEADA'];
            if (!statusValidos.includes(UnidadeStatus)) {
                return res.status(400).json({
                    error: 'Status inválido. Use: ATIVA, INATIVA ou BLOQUEADA'
                });
            }

            // Verificar se unidade existe
            const unidadeExistente = await prisma.unidade.findUnique({
                where: {
                    UnidadeId: unidadeId
                }
            });

            if (!unidadeExistente) {
                return res.status(404).json({
                    error: 'Unidade não encontrada'
                });
            }

            // Atualizar apenas status
            const unidadeAtualizada = await prisma.unidade.update({
                where: {
                    UnidadeId: unidadeId
                },
                data: {
                    UnidadeStatus: UnidadeStatus
                }
            });

            // --- Gravar log de alteração
            const LogAcao = 'ALTERARSTATUSUNIDADE';
            const LogDetelhe = 'Foi alterado o status da unidade de ID (' + unidadeAtualizada.UnidadeId + '), status antes da alteração (' + unidadeExistente.UnidadeStatus + '), status depois da atualização (' + unidadeAtualizada.UnidadeStatus + ')';
            await gravarLog(String(req.usuario.usuarioId).trim(), LogAcao, req.usuario.usuarioTipo, LogDetelhe, String(unidadeAtualizada.UnidadeId).trim());
            // ---

            return res.status(200).json({
                message: 'Status da unidade atualizado com sucesso',
                data: unidadeAtualizada
            });

        } catch (error) {
            console.error('Erro ao alterar status da unidade:', error);
            return res.status(500).json({
                error: 'Erro ao alterar status da unidade'
            });
        }
    }

}

module.exports = new UnidadeController();