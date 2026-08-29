// src/controllers/departamentoController.js
const prisma = require('../prisma.js');
const { getBrasilDateTime } = require('../utils/dataBrasilObter.js');

class DepartamentoController {

    // Cadastrar novo departamento (apenas gestores)
    async cadastrarDepartamento(req, res) {
        try {
            const { UnidadeId, DepartamentoNome, DepartamentoStatus } = req.body;
            const usuarioLogado = req.usuario;

            // Validações básicas
            if (!UnidadeId) {
                return res.status(400).json({ error: 'Unidade é obrigatória' });
            }

            if (!DepartamentoNome || !DepartamentoNome.trim()) {
                return res.status(400).json({ error: 'Nome do departamento é obrigatório' });
            }

            // Verificar se o usuário é GESTOR
            if (usuarioLogado.usuarioTipo !== 'GESTOR') {
                return res.status(403).json({
                    error: 'Apenas gestores podem cadastrar departamentos'
                });
            }

            // Buscar gestor logado para verificar nível e unidade
            const gestorLogado = await prisma.gestor.findUnique({
                where: { GestorId: usuarioLogado.usuarioId, GestorStatus: 'ATIVO' }
            });

            if (!gestorLogado) {
                return res.status(403).json({ error: 'Gestor não encontrado' });
            }

            // Verificar se o gestor pertence à unidade informada
            if (gestorLogado.UnidadeId !== parseInt(UnidadeId)) {
                return res.status(403).json({
                    error: 'Você só pode cadastrar departamentos na sua própria unidade'
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
                    error: 'Não é possível cadastrar departamentos em uma unidade inativa ou bloqueada'
                });
            }

            // Validar status se fornecido
            if (DepartamentoStatus) {
                const statusValidos = ['ATIVO', 'INATIVO', 'BLOQUEADO'];
                if (!statusValidos.includes(DepartamentoStatus)) {
                    return res.status(400).json({
                        error: 'Status inválido. Use: ATIVO, INATIVO ou BLOQUEADO'
                    });
                }
            }

            // Verificar se já existe departamento com o mesmo nome na mesma unidade
            const departamentoExistente = await prisma.departamento.findFirst({
                where: {
                    UnidadeId: parseInt(UnidadeId),
                    DepartamentoNome: {
                        equals: DepartamentoNome.trim(),
                        mode: 'insensitive'
                    }
                }
            });

            if (departamentoExistente) {
                return res.status(409).json({
                    error: 'Já existe um departamento com este nome nesta unidade'
                });
            }

            // Criar departamento
            const departamento = await prisma.departamento.create({
                data: {
                    UnidadeId: parseInt(UnidadeId),
                    DepartamentoNome: DepartamentoNome.trim(),
                    DepartamentoStatus: DepartamentoStatus || 'ATIVO', // Status padrão se não informado
                    DepartamentoDtCadastro: getBrasilDateTime()
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
                message: 'Departamento cadastrado com sucesso',
                data: departamento
            });

        } catch (error) {
            console.error('Erro ao cadastrar departamento:', error);
            res.status(500).json({ error: 'Erro ao cadastrar departamento' });
        }
    }

    // Alterar departamento (apenas gestores)
    async alterarDepartamento(req, res) {
        try {
            const { id } = req.params;
            const { DepartamentoNome, DepartamentoStatus } = req.body;
            const usuarioLogado = req.usuario;

            const departamentoId = id; //parseInt(id);
            if (!departamentoId) {
                return res.status(400).json({ error: 'ID do departamento é obrigatório' });
            }

            // Verificar se o usuário é GESTOR
            if (usuarioLogado.usuarioTipo !== 'GESTOR') {
                return res.status(403).json({
                    error: 'Apenas gestores podem alterar departamentos'
                });
            }

            // Buscar gestor logado
            const gestorLogado = await prisma.gestor.findUnique({
                where: { GestorId: usuarioLogado.usuarioId, GestorStatus: 'ATIVO' }
            });

            if (!gestorLogado) {
                return res.status(403).json({ error: 'Gestor não encontrado' });
            }

            // Buscar departamento a ser alterado
            const departamentoExistente = await prisma.departamento.findUnique({
                where: { DepartamentoId: departamentoId },
                include: {
                    Unidade: true
                }
            });

            if (!departamentoExistente) {
                return res.status(404).json({ error: 'Departamento não encontrado' });
            }

            // Verificar se o gestor pertence à mesma unidade do departamento
            if (gestorLogado.UnidadeId !== departamentoExistente.UnidadeId) {
                return res.status(403).json({
                    error: 'Você só pode alterar departamentos da sua própria unidade'
                });
            }

            // Verificar se a unidade está ativa
            if (departamentoExistente.Unidade.UnidadeStatus !== 'ATIVA') {
                return res.status(400).json({
                    error: 'Não é possível alterar departamentos de uma unidade inativa ou bloqueada'
                });
            }

            // Preparar dados para atualização
            const dadosAtualizacao = {};

            // Validar e adicionar nome se fornecido
            if (DepartamentoNome !== undefined) {
                if (!DepartamentoNome.trim()) {
                    return res.status(400).json({
                        error: 'Nome do departamento não pode ser vazio'
                    });
                }

                // Verificar se já existe outro departamento com o mesmo nome na mesma unidade
                if (DepartamentoNome.trim().toLowerCase() !== departamentoExistente.DepartamentoNome.toLowerCase()) {
                    const departamentoMesmoNome = await prisma.departamento.findFirst({
                        where: {
                            UnidadeId: departamentoExistente.UnidadeId,
                            DepartamentoNome: {
                                equals: DepartamentoNome.trim(),
                                mode: 'insensitive'
                            },
                            DepartamentoId: {
                                not: departamentoId
                            }
                        }
                    });

                    if (departamentoMesmoNome) {
                        return res.status(409).json({
                            error: 'Já existe outro departamento com este nome nesta unidade'
                        });
                    }
                }

                dadosAtualizacao.DepartamentoNome = DepartamentoNome.trim();
            }

            // Validar e adicionar status se fornecido
            if (DepartamentoStatus !== undefined) {
                const statusValidos = ['ATIVO', 'INATIVO', 'BLOQUEADO'];
                if (!statusValidos.includes(DepartamentoStatus)) {
                    return res.status(400).json({
                        error: 'Status inválido. Use: ATIVO, INATIVO ou BLOQUEADO'
                    });
                }
                dadosAtualizacao.DepartamentoStatus = DepartamentoStatus;
            }

            // Verificar se há dados para atualizar
            if (Object.keys(dadosAtualizacao).length === 0) {
                return res.status(400).json({
                    error: 'Nenhum dado fornecido para atualização'
                });
            }

            // Atualizar departamento
            const departamentoAtualizado = await prisma.departamento.update({
                where: { DepartamentoId: departamentoId },
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
                message: 'Departamento atualizado com sucesso',
                data: departamentoAtualizado
            });

        } catch (error) {
            console.error('Erro ao alterar departamento:', error);
            res.status(500).json({ error: 'Erro ao alterar departamento' });
        }
    }

    // Listar departamentos com filtros
    async listarDepartamentos(req, res) {
        try {
            const {
                unidadeId,
                status,
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
                    // Gestor só vê departamentos da sua unidade
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
                const statusValidos = ['ATIVO', 'INATIVO', 'BLOQUEADO'];
                if (!statusValidos.includes(status)) {
                    return res.status(400).json({
                        error: 'Status inválido. Use: ATIVO, INATIVO ou BLOQUEADO'
                    });
                }
                filtro.DepartamentoStatus = status;
            }

            // Calcular paginação
            const paginaAtual = parseInt(pagina);
            const limitePorPagina = parseInt(limite);
            const skip = (paginaAtual - 1) * limitePorPagina;

            // Buscar departamentos
            const [departamentos, total] = await prisma.$transaction([
                prisma.departamento.findMany({
                    where: filtro,
                    orderBy: [
                        { DepartamentoNome: 'asc' }
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
                                Tecnico: true
                            }
                        }
                    }
                }),
                prisma.departamento.count({ where: filtro })
            ]);

            res.status(200).json({
                data: departamentos,
                paginacao: {
                    paginaAtual,
                    limitePorPagina,
                    totalRegistros: total,
                    totalPaginas: Math.ceil(total / limitePorPagina)
                }
            });

        } catch (error) {
            console.error('Erro ao listar departamentos:', error);
            res.status(500).json({ error: 'Erro ao listar departamentos' });
        }
    }

    // Buscar departamento por ID  (pessoa, admin, gestor e técnico de mesma unidade)
    async buscarDepartamentoPorId(req, res) {
        try {
            const { id } = req.params;

            const usuarioLogado = req.usuario;

            const departamentoId = id; //parseInt(id);
            if (!departamentoId) {
                return res.status(400).json({ error: 'ID do departamento é obrigatório' });
            }

            if (isNaN(req.usuario.usuarioId)){
                return res.status(403).json({
                    error: 'Acesso negado'
                });
            }

            // Buscar departamento
            const departamento = await prisma.departamento.findUnique({
                where: { DepartamentoId: departamentoId, UnidadeId: Number(usuarioLogado.unidadeId)},
                include: {
                    Unidade: {
                        select: {
                            UnidadeId: true,
                            UnidadeNome: true,
                            UnidadeStatus: true
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

            if (!departamento) {
                return res.status(404).json({ error: 'Departamento não encontrado' });
            }

            // Verificar permissão de visualização para gestores
            if (usuarioLogado?.usuarioTipo === 'GESTOR') {
                const gestorLogado = await prisma.gestor.findUnique({
                    where: { GestorId: usuarioLogado.usuarioId, GestorStatus: 'ATIVO' }
                });

                if (gestorLogado && gestorLogado.UnidadeId !== departamento.UnidadeId) {
                    return res.status(403).json({
                        error: 'Você só pode visualizar departamentos da sua própria unidade'
                    });
                }
            }

            res.status(200).json({
                data: departamento
            });

        } catch (error) {
            console.error('Erro ao buscar departamento:', error);
            res.status(500).json({ error: 'Erro ao buscar departamento' });
        }
    }

    // Alterar apenas status do departamento (apenas ADMINUNIDADE)
    async alterarStatusDepartamento(req, res) {
        try {
            const { id } = req.params;
            const { DepartamentoStatus } = req.body;
            const usuarioLogado = req.usuario;

            const departamentoId = id; //parseInt(id);
            if (!departamentoId) {
                return res.status(400).json({ error: 'ID do departamento é obrigatório' });
            }

            // Validar status
            if (!DepartamentoStatus) {
                return res.status(400).json({ error: 'Status é obrigatório' });
            }

            const statusValidos = ['ATIVO', 'INATIVO', 'BLOQUEADO'];
            if (!statusValidos.includes(DepartamentoStatus)) {
                return res.status(400).json({
                    error: 'Status inválido. Use: ATIVO, INATIVO ou BLOQUEADO'
                });
            }

            // Verificar se o usuário é GESTOR
            if (usuarioLogado.usuarioTipo !== 'GESTOR') {
                return res.status(403).json({
                    error: 'Apenas gestores podem alterar status de departamentos'
                });
            }

            // Buscar gestor logado
            const gestorLogado = await prisma.gestor.findUnique({
                where: { GestorId: usuarioLogado.usuarioId, GestorStatus: 'ATIVO' }
            });

            if (!gestorLogado) {
                return res.status(403).json({ error: 'Gestor não encontrado' });
            }

            // Buscar departamento a ser alterado
            const departamentoExistente = await prisma.departamento.findUnique({
                where: { DepartamentoId: departamentoId },
                include: {
                    Unidade: true
                }
            });

            if (!departamentoExistente) {
                return res.status(404).json({ error: 'Departamento não encontrado' });
            }

            // Verificar se o gestor pertence à mesma unidade do departamento
            if (gestorLogado.UnidadeId !== departamentoExistente.UnidadeId) {
                return res.status(403).json({
                    error: 'Você só pode alterar status de departamentos da sua própria unidade'
                });
            }

            // Verificar se a unidade está ativa
            if (departamentoExistente.Unidade.UnidadeStatus !== 'ATIVA') {
                return res.status(400).json({
                    error: 'Não é possível alterar departamentos de uma unidade inativa ou bloqueada'
                });
            }

            // Se for inativar, verificar se existem técnicos ativos no departamento
            if (DepartamentoStatus === 'INATIVO' || DepartamentoStatus === 'BLOQUEADO') {
                const tecnicosAtivos = await prisma.tecnico.count({
                    where: {
                        DepartamentoId: departamentoId,
                        TecnicoStatus: 'ATIVO'
                    }
                });

                if (tecnicosAtivos > 0) {
                    return res.status(400).json({
                        error: 'Não é possível inativar/bloquear um departamento com técnicos ativos'
                    });
                }
            }

            // Atualizar apenas status
            const departamentoAtualizado = await prisma.departamento.update({
                where: { DepartamentoId: departamentoId },
                data: { DepartamentoStatus: DepartamentoStatus },
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
                message: 'Status do departamento atualizado com sucesso',
                data: departamentoAtualizado
            });

        } catch (error) {
            console.error('Erro ao alterar status do departamento:', error);
            res.status(500).json({ error: 'Erro ao alterar status do departamento' });
        }
    }

}

module.exports = new DepartamentoController();