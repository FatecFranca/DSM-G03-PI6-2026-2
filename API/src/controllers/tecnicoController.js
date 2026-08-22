// src/controllers/tecnicoController.js
const prisma = require('../prisma.js');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

class TecnicoController {

    // Login do técnico
    async login(req, res) {
        try {
            const { TecnicoUsuario, TecnicoSenha } = req.body;

            // Validações básicas
            if (!TecnicoUsuario || !TecnicoUsuario.trim()) {
                return res.status(400).json({
                    error: 'Usuário é obrigatório'
                });
            }

            if (!TecnicoSenha || !TecnicoSenha.trim()) {
                return res.status(400).json({
                    error: 'Senha é obrigatória'
                });
            }

            // Sempre UPPERCASE
            TecnicoUsuario.trim().toUpperCase();

            // Buscar técnico pelo usuário
            const tecnico = await prisma.tecnico.findUnique({
                where: {
                    TecnicoUsuario: TecnicoUsuario.trim()
                },
                include: {
                    Unidade: {
                        select: {
                            UnidadeId: true,
                            UnidadeNome: true,
                            UnidadeStatus: true
                        }
                    },
                    Departamento: {
                        select: {
                            DepartamentoId: true,
                            DepartamentoNome: true,
                            DepartamentoStatus: true
                        }
                    }
                }
            });

            // Verificar se técnico existe
            if (!tecnico) {
                return res.status(400).json({
                    error: 'Usuário ou senha inválidos'
                });
            }

            // Verificar se o técnico está ativo
            if (tecnico.TecnicoStatus !== 'ATIVO') {
                return res.status(403).json({
                    error: 'Sua conta está inativa ou bloqueada. Entre em contato com o gestor da sua unidade.'
                });
            }

            // Verificar se a unidade está ativa
            if (tecnico.Unidade.UnidadeStatus !== 'ATIVA') {
                return res.status(403).json({
                    error: 'A unidade está inativa ou bloqueada. Não é possível realizar login no momento.'
                });
            }

            // Verificar se o departamento está ativo
            if (tecnico.Departamento.DepartamentoStatus !== 'ATIVO') {
                return res.status(403).json({
                    error: 'O departamento está inativo ou bloqueado. Não é possível realizar login no momento.'
                });
            }

            // Verificar senha com pepper
            const senhaComPepper = process.env.PEPPER_SENHA_TECNICO + TecnicoSenha.trim();
            const senhaValida = await bcrypt.compare(senhaComPepper, tecnico.TecnicoSenha);

            if (!senhaValida) {
                return res.status(400).json({
                    error: 'Usuário ou senha inválidos'
                });
            }

            // Gerar token JWT
            const token = jwt.sign(
                {
                    usuarioId: tecnico.TecnicoId,
                    usuarioTipo: 'TECNICO',
                    usuarioEmail: tecnico.TecnicoEmail,
                    unidadeId: tecnico.UnidadeId,
                    departamentoId: tecnico.DepartamentoId
                },
                process.env.JWT_SECRET,
                { expiresIn: '8h' }
            );

            // Retornar dados do técnico (sem a senha)
            const { TecnicoSenha: _, ...tecnicoSemSenha } = tecnico;

            res.status(200).json({
                message: 'Login realizado com sucesso',
                data: {
                    usuario: tecnicoSemSenha,
                    token,
                    tipo: 'TECNICO'
                }
            });

        } catch (error) {
            console.error('Erro no login do técnico:', error);
            res.status(500).json({
                error: 'Erro no login do técnico'
            });
        }
    }

    // Cadastrar novo técnico (apenas gestores da mesma unidade)
    async cadastrarTecnico(req, res) {
        try {
            const {
                DepartamentoId,
                UnidadeId,
                TecnicoNome,
                TecnicoEmail,
                TecnicoTelefone,
                TecnicoCPF,
                TecnicoUsuario,
                TecnicoSenha,
                TecnicoStatus
            } = req.body;

            const usuarioLogado = req.usuario;

            // Validações básicas
            if (!DepartamentoId) {
                return res.status(400).json({ error: 'Departamento é obrigatório' });
            }

            if (!UnidadeId) {
                return res.status(400).json({ error: 'Unidade é obrigatória' });
            }

            if (!TecnicoNome || !TecnicoNome.trim()) {
                return res.status(400).json({ error: 'Nome do técnico é obrigatório' });
            }

            if (!TecnicoCPF || !TecnicoCPF.trim()) {
                return res.status(400).json({ error: 'CPF é obrigatório' });
            }

            if (!TecnicoUsuario || !TecnicoUsuario.trim()) {
                return res.status(400).json({ error: 'Usuário é obrigatório' });
            }

            if (!TecnicoSenha || !TecnicoSenha.trim()) {
                return res.status(400).json({ error: 'Senha é obrigatória' });
            }

            if (TecnicoSenha.trim().length < 6) {
                return res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres' });
            }

            // Verificar se o usuário logado é GESTOR
            if (usuarioLogado.usuarioTipo !== 'GESTOR') {
                return res.status(403).json({
                    error: 'Apenas gestores podem cadastrar técnicos'
                });
            }

            // Buscar gestor logado
            const gestorLogado = await prisma.gestor.findUnique({
                where: { GestorId: usuarioLogado.usuarioId }
            });

            if (!gestorLogado) {
                return res.status(403).json({ error: 'Gestor não encontrado' });
            }

            // Verificar se o gestor pertence à unidade informada
            if (gestorLogado.UnidadeId !== parseInt(UnidadeId)) {
                return res.status(403).json({
                    error: 'Você só pode cadastrar técnicos na sua própria unidade'
                });
            }

            // Verificar status do gestor
            if (gestorLogado.GestorStatus !== 'ATIVO') {
                return res.status(403).json({
                    error: 'Seu usuário gestor está inativo. Não é possível cadastrar técnicos.'
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
                    error: 'Não é possível cadastrar técnicos em uma unidade inativa ou bloqueada'
                });
            }

            // Verificar se o departamento existe e pertence à unidade
            const departamento = await prisma.departamento.findFirst({
                where: {
                    DepartamentoId: DepartamentoId,
                    UnidadeId: parseInt(UnidadeId)
                }
            });

            if (!departamento) {
                return res.status(404).json({ 
                    error: 'Departamento não encontrado ou não pertence à unidade informada' 
                });
            }

            if (departamento.DepartamentoStatus !== 'ATIVO') {
                return res.status(400).json({
                    error: 'Não é possível cadastrar técnicos em um departamento inativo ou bloqueado'
                });
            }

            // Validar status se fornecido
            if (TecnicoStatus) {
                const statusValidos = ['ATIVO', 'INATIVO', 'BLOQUEADO'];
                if (!statusValidos.includes(TecnicoStatus)) {
                    return res.status(400).json({
                        error: 'Status inválido. Use: ATIVO, INATIVO ou BLOQUEADO'
                    });
                }
            }

            // Verificar duplicidade de CPF na unidade
            const cpfExistente = await prisma.tecnico.findFirst({
                where: { TecnicoCPF: TecnicoCPF.trim(), UnidadeId: parseInt(UnidadeId) }
            });

            if (cpfExistente) {
                return res.status(409).json({ error: 'CPF já cadastrado' });
            }

            // Verificar duplicidade de usuário
            const usuarioExistente = await prisma.tecnico.findUnique({
                where: { TecnicoUsuario: TecnicoUsuario.trim() }
            });

            if (usuarioExistente) {
                return res.status(409).json({ error: 'Nome de usuário já está em uso' });
            }

            // Validar email se fornecido
            if (TecnicoEmail && TecnicoEmail.trim()) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(TecnicoEmail.trim())) {
                    return res.status(400).json({ error: 'E-mail inválido' });
                }
            }

            // Criptografar senha
            const salt = await bcrypt.genSalt(10);
            const senhaComPepper = process.env.PEPPER_SENHA_TECNICO + TecnicoSenha.trim();
            const senhaHash = await bcrypt.hash(senhaComPepper, salt);

            // Criar técnico
            const tecnico = await prisma.tecnico.create({
                data: {
                    DepartamentoId: DepartamentoId,
                    UnidadeId: parseInt(UnidadeId),
                    TecnicoNome: TecnicoNome.trim(),
                    TecnicoEmail: TecnicoEmail?.trim() || null,
                    TecnicoTelefone: TecnicoTelefone?.trim() || null,
                    TecnicoCPF: TecnicoCPF.trim(),
                    TecnicoUsuario: TecnicoUsuario.trim(),
                    TecnicoSenha: senhaHash,
                    TecnicoStatus: TecnicoStatus || 'ATIVO',
                    TecnicoDtCadastro: new Date()
                },
                include: {
                    Unidade: {
                        select: {
                            UnidadeId: true,
                            UnidadeNome: true,
                            UnidadeStatus: true
                        }
                    },
                    Departamento: {
                        select: {
                            DepartamentoId: true,
                            DepartamentoNome: true,
                            DepartamentoStatus: true
                        }
                    }
                }
            });

            // Remover senha do retorno
            const { TecnicoSenha: _, ...tecnicoSemSenha } = tecnico;

            res.status(201).json({
                message: 'Técnico cadastrado com sucesso',
                data: tecnicoSemSenha
            });

        } catch (error) {
            console.error('Erro ao cadastrar técnico:', error);
            res.status(500).json({ error: 'Erro ao cadastrar técnico' });
        }
    }

    // Alterar técnico (gestor da mesma unidade OU o próprio técnico)
    async alterarTecnico(req, res) {
        try {
            const { id } = req.params;
            const {
                DepartamentoId,
                UnidadeId,
                TecnicoNome,
                TecnicoEmail,
                TecnicoTelefone,
                TecnicoCPF,
                TecnicoUsuario,
                TecnicoSenha,
                TecnicoStatus
            } = req.body;

            const usuarioLogado = req.usuario;

            const tecnicoId = id;
            if (!tecnicoId) {
                return res.status(400).json({ error: 'ID do técnico é obrigatório' });
            }

            // Buscar técnico a ser alterado
            const tecnicoAlterar = await prisma.tecnico.findUnique({
                where: { TecnicoId: tecnicoId },
                include: {
                    Unidade: true,
                    Departamento: true
                }
            });

            if (!tecnicoAlterar) {
                return res.status(404).json({ error: 'Técnico não encontrado' });
            }

            // Verificar permissões
            let podeAlterar = false;
            let gestorLogado = null;

            // Caso 1: O próprio técnico alterando seus dados
            if (usuarioLogado.usuarioTipo === 'TECNICO' && usuarioLogado.usuarioId === tecnicoId) {
                podeAlterar = true;

                // Técnico não pode alterar próprio status (para não se inativar)
                if (TecnicoStatus !== undefined) {
                    return res.status(403).json({
                        error: 'Você não pode alterar seu próprio status'
                    });
                }

                // Técnico não pode alterar unidade
                if (UnidadeId !== undefined) {
                    return res.status(403).json({
                        error: 'Você não pode alterar sua unidade'
                    });
                }

                // Técnico não pode alterar departamento
                if (DepartamentoId !== undefined) {
                    return res.status(403).json({
                        error: 'Você não pode alterar seu departamento'
                    });
                }

                // Técnico não pode alterar CPF
                if (TecnicoCPF !== undefined) {
                    return res.status(403).json({
                        error: 'Você não pode alterar seu CPF'
                    });
                }

                // Técnico não pode alterar usuário
                if (TecnicoUsuario !== undefined) {
                    return res.status(403).json({
                        error: 'Você não pode alterar seu nome de usuário'
                    });
                }
            }

            // Caso 2: Gestor alterando
            else if (usuarioLogado.usuarioTipo === 'GESTOR') {
                gestorLogado = await prisma.gestor.findUnique({
                    where: { GestorId: usuarioLogado.usuarioId }
                });

                if (!gestorLogado) {
                    return res.status(403).json({ error: 'Gestor não encontrado' });
                }

                // Verificar se gestor está ativo
                if (gestorLogado.GestorStatus !== 'ATIVO') {
                    return res.status(403).json({
                        error: 'Seu usuário gestor está inativo. Não é possível alterar técnicos.'
                    });
                }

                // Gestor só pode alterar técnicos da sua unidade
                if (gestorLogado.UnidadeId !== tecnicoAlterar.UnidadeId) {
                    return res.status(403).json({
                        error: 'Você só pode alterar técnicos da sua própria unidade'
                    });
                }

                // Verificar se a unidade do gestor está ativa
                const unidadeGestor = await prisma.unidade.findUnique({
                    where: { UnidadeId: gestorLogado.UnidadeId }
                });

                if (unidadeGestor.UnidadeStatus !== 'ATIVA') {
                    return res.status(403).json({
                        error: 'Sua unidade está inativa. Não é possível alterar técnicos.'
                    });
                }

                podeAlterar = true;
            }

            if (!podeAlterar) {
                return res.status(403).json({
                    error: 'Você não tem permissão para alterar este técnico'
                });
            }

            // Preparar dados para atualização
            const dadosAtualizacao = {};

            // Validar e adicionar campos (apenas gestor pode alterar campos sensíveis)
            if (DepartamentoId !== undefined && usuarioLogado.usuarioTipo === 'GESTOR') {
                // Verificar se o departamento existe e pertence à unidade
                const departamento = await prisma.departamento.findFirst({
                    where: {
                        DepartamentoId: DepartamentoId,
                        UnidadeId: tecnicoAlterar.UnidadeId
                    }
                });

                if (!departamento) {
                    return res.status(404).json({ 
                        error: 'Departamento não encontrado ou não pertence à unidade do técnico' 
                    });
                }

                if (departamento.DepartamentoStatus !== 'ATIVO') {
                    return res.status(400).json({
                        error: 'Não é possível transferir técnico para um departamento inativo ou bloqueado'
                    });
                }

                dadosAtualizacao.DepartamentoId = DepartamentoId;
            }

            if (UnidadeId !== undefined && usuarioLogado.usuarioTipo === 'GESTOR') {
                // Apenas gestor pode alterar unidade
                if (gestorLogado.UnidadeId !== parseInt(UnidadeId)) {
                    return res.status(403).json({
                        error: 'Você só pode transferir técnicos para sua própria unidade'
                    });
                }

                // Verificar se a nova unidade existe e está ativa
                const novaUnidade = await prisma.unidade.findUnique({
                    where: { UnidadeId: parseInt(UnidadeId) }
                });

                if (!novaUnidade) {
                    return res.status(404).json({ error: 'Unidade não encontrada' });
                }

                if (novaUnidade.UnidadeStatus !== 'ATIVA') {
                    return res.status(400).json({
                        error: 'Não é possível transferir técnico para uma unidade inativa ou bloqueada'
                    });
                }

                dadosAtualizacao.UnidadeId = parseInt(UnidadeId);
            }

            if (TecnicoNome !== undefined) {
                if (!TecnicoNome.trim()) {
                    return res.status(400).json({ error: 'Nome do técnico não pode ser vazio' });
                }
                dadosAtualizacao.TecnicoNome = TecnicoNome.trim();
            }

            if (TecnicoEmail !== undefined) {
                if (TecnicoEmail && TecnicoEmail.trim()) {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(TecnicoEmail.trim())) {
                        return res.status(400).json({ error: 'E-mail inválido' });
                    }
                }
                dadosAtualizacao.TecnicoEmail = TecnicoEmail?.trim() || null;
            }

            if (TecnicoTelefone !== undefined) {
                dadosAtualizacao.TecnicoTelefone = TecnicoTelefone?.trim() || null;
            }

            if (TecnicoCPF !== undefined && usuarioLogado.usuarioTipo === 'GESTOR') {
                // Apenas gestor pode alterar CPF
                if (!TecnicoCPF.trim()) {
                    return res.status(400).json({ error: 'CPF não pode ser vazio' });
                }

                // Verificar se CPF já existe para outro técnico
                const cpfExistente = await prisma.tecnico.findFirst({
                    where: {
                        TecnicoCPF: TecnicoCPF.trim(),
                        TecnicoId: { not: tecnicoId }
                    }
                });

                if (cpfExistente) {
                    return res.status(409).json({ error: 'CPF já cadastrado para outro técnico' });
                }

                dadosAtualizacao.TecnicoCPF = TecnicoCPF.trim();
            }

            if (TecnicoUsuario !== undefined && usuarioLogado.usuarioTipo === 'GESTOR') {
                // Apenas gestor pode alterar usuário
                if (!TecnicoUsuario.trim()) {
                    return res.status(400).json({ error: 'Usuário não pode ser vazio' });
                }

                // Verificar se usuário já existe para outro técnico
                const usuarioExistente = await prisma.tecnico.findFirst({
                    where: {
                        TecnicoUsuario: TecnicoUsuario.trim(),
                        TecnicoId: { not: tecnicoId }
                    }
                });

                if (usuarioExistente) {
                    return res.status(409).json({ error: 'Nome de usuário já está em uso' });
                }

                dadosAtualizacao.TecnicoUsuario = TecnicoUsuario.trim();
            }

            if (TecnicoSenha !== undefined) {
                if (!TecnicoSenha.trim()) {
                    return res.status(400).json({ error: 'Senha não pode ser vazia' });
                }
                if (TecnicoSenha.trim().length < 6) {
                    return res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres' });
                }
                const salt = await bcrypt.genSalt(10);
                const senhaComPepper = process.env.PEPPER_SENHA_TECNICO + TecnicoSenha.trim();
                dadosAtualizacao.TecnicoSenha = await bcrypt.hash(senhaComPepper, salt);
            }

            if (TecnicoStatus !== undefined && usuarioLogado.usuarioTipo === 'GESTOR') {
                // Apenas gestor pode alterar status
                const statusValidos = ['ATIVO', 'INATIVO', 'BLOQUEADO'];
                if (!statusValidos.includes(TecnicoStatus)) {
                    return res.status(400).json({
                        error: 'Status inválido. Use: ATIVO, INATIVO ou BLOQUEADO'
                    });
                }
                dadosAtualizacao.TecnicoStatus = TecnicoStatus;
            }

            // Verificar se há dados para atualizar
            if (Object.keys(dadosAtualizacao).length === 0) {
                return res.status(400).json({ error: 'Nenhum dado fornecido para atualização' });
            }

            // Atualizar técnico
            const tecnicoAtualizado = await prisma.tecnico.update({
                where: { TecnicoId: tecnicoId },
                data: dadosAtualizacao,
                include: {
                    Unidade: {
                        select: {
                            UnidadeId: true,
                            UnidadeNome: true,
                            UnidadeStatus: true
                        }
                    },
                    Departamento: {
                        select: {
                            DepartamentoId: true,
                            DepartamentoNome: true,
                            DepartamentoStatus: true
                        }
                    }
                }
            });

            // Remover senha do retorno
            const { TecnicoSenha: _, ...tecnicoSemSenha } = tecnicoAtualizado;

            res.status(200).json({
                message: 'Técnico atualizado com sucesso',
                data: tecnicoSemSenha
            });

        } catch (error) {
            console.error('Erro ao alterar técnico:', error);
            res.status(500).json({ error: 'Erro ao alterar técnico' });
        }
    }

    // Listar técnicos com filtros
    async listarTecnicos(req, res) {
        try {
            const {
                unidadeId,
                departamentoId,
                status,
                nome,
                pagina = 1,
                limite = 10
            } = req.query;

            const usuarioLogado = req.usuario;

            // Construir filtro base
            const filtro = {};

            // Aplicar filtros de acordo com permissão
            if (usuarioLogado.usuarioTipo === 'TECNICO') {
                // Técnico só vê seus próprios dados
                filtro.TecnicoId = usuarioLogado.usuarioId;
            }
            else if (usuarioLogado.usuarioTipo === 'GESTOR') {
                const gestorLogado = await prisma.gestor.findUnique({
                    where: { GestorId: usuarioLogado.usuarioId }
                });

                if (gestorLogado) {
                    // Gestor só vê técnicos da sua unidade
                    filtro.UnidadeId = gestorLogado.UnidadeId;
                }
            }

            // Aplicar filtros da query (apenas para gestores)
            if (usuarioLogado.usuarioTipo === 'GESTOR') {
                if (unidadeId) {
                    // Verificar se o gestor tem permissão para esta unidade
                    const gestorLogado = await prisma.gestor.findUnique({
                        where: { GestorId: usuarioLogado.usuarioId }
                    });

                    if (gestorLogado && gestorLogado.UnidadeId === parseInt(unidadeId)) {
                        filtro.UnidadeId = parseInt(unidadeId);
                    }
                }

                if (departamentoId) {
                    filtro.DepartamentoId = departamentoId;
                }

                if (status) {
                    const statusValidos = ['ATIVO', 'INATIVO', 'BLOQUEADO'];
                    if (!statusValidos.includes(status)) {
                        return res.status(400).json({
                            error: 'Status inválido. Use: ATIVO, INATIVO ou BLOQUEADO'
                        });
                    }
                    filtro.TecnicoStatus = status;
                }

                if (nome) {
                    filtro.TecnicoNome = {
                        contains: nome,
                        mode: 'insensitive'
                    };
                }
            }

            // Calcular paginação
            const paginaAtual = parseInt(pagina);
            const limitePorPagina = parseInt(limite);
            const skip = (paginaAtual - 1) * limitePorPagina;

            // Buscar técnicos
            const [tecnicos, total] = await prisma.$transaction([
                prisma.tecnico.findMany({
                    where: filtro,
                    orderBy: [
                        { TecnicoNome: 'asc' }
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
                        Departamento: {
                            select: {
                                DepartamentoId: true,
                                DepartamentoNome: true,
                                DepartamentoStatus: true
                            }
                        },
                        _count: {
                            select: {
                                AtividadeChamado: true,
                                TecnicoEquipe: true
                            }
                        }
                    }
                }),
                prisma.tecnico.count({ where: filtro })
            ]);

            // Remover senhas
            const tecnicosSemSenha = tecnicos.map(tecnico => {
                const { TecnicoSenha: _, ...tecnicoSemSenha } = tecnico;
                return tecnicoSemSenha;
            });

            res.status(200).json({
                data: tecnicosSemSenha,
                paginacao: {
                    paginaAtual,
                    limitePorPagina,
                    totalRegistros: total,
                    totalPaginas: Math.ceil(total / limitePorPagina)
                }
            });

        } catch (error) {
            console.error('Erro ao listar técnicos:', error);
            res.status(500).json({ error: 'Erro ao listar técnicos' });
        }
    }

    // Buscar técnico por ID
    async buscarTecnicoPorId(req, res) {
        try {
            const { id } = req.params;
            const usuarioLogado = req.usuario;

            const tecnicoId = id;
            if (!tecnicoId) {
                return res.status(400).json({ error: 'ID do técnico é obrigatório' });
            }

            // Buscar técnico
            const tecnico = await prisma.tecnico.findUnique({
                where: { TecnicoId: tecnicoId },
                include: {
                    Unidade: {
                        select: {
                            UnidadeId: true,
                            UnidadeNome: true,
                            UnidadeStatus: true
                        }
                    },
                    Departamento: {
                        select: {
                            DepartamentoId: true,
                            DepartamentoNome: true,
                            DepartamentoStatus: true
                        }
                    },
                    TecnicoEquipe: {
                        include: {
                            Equipe: {
                                select: {
                                    EquipeId: true,
                                    EquipeNome: true,
                                    EquipeStatus: true
                                }
                            }
                        }
                    },
                    AtividadeChamado: {
                        select: {
                            AtividadeId: true,
                            ChamadoId: true,
                            AtividadeDescricao: true,
                            AtividadeDtRealizacao: true
                        },
                        orderBy: {
                            AtividadeDtRealizacao: 'desc'
                        },
                        take: 10 // Últimas 10 atividades
                    }
                }
            });

            if (!tecnico) {
                return res.status(404).json({ error: 'Técnico não encontrado' });
            }

            // Verificar permissão de visualização
            if (usuarioLogado.usuarioTipo === 'TECNICO') {
                // Técnico só pode ver seus próprios dados
                if (usuarioLogado.usuarioId !== tecnicoId) {
                    return res.status(403).json({
                        error: 'Você só pode visualizar seus próprios dados'
                    });
                }
            }
            else if (usuarioLogado.usuarioTipo === 'GESTOR') {
                const gestorLogado = await prisma.gestor.findUnique({
                    where: { GestorId: usuarioLogado.usuarioId }
                });

                if (gestorLogado && gestorLogado.UnidadeId !== tecnico.UnidadeId) {
                    return res.status(403).json({
                        error: 'Você só pode visualizar técnicos da sua própria unidade'
                    });
                }
            }

            // Remover senha do retorno
            const { TecnicoSenha: _, ...tecnicoSemSenha } = tecnico;

            res.status(200).json({
                data: tecnicoSemSenha
            });

        } catch (error) {
            console.error('Erro ao buscar técnico:', error);
            res.status(500).json({ error: 'Erro ao buscar técnico' });
        }
    }

    // Alterar apenas status do técnico (apenas gestor)
    async alterarStatusTecnico(req, res) {
        try {
            const { id } = req.params;
            const { TecnicoStatus } = req.body;
            const usuarioLogado = req.usuario;

            const tecnicoId = id;
            if (!tecnicoId) {
                return res.status(400).json({ error: 'ID do técnico é obrigatório' });
            }

            // Validar status
            if (!TecnicoStatus) {
                return res.status(400).json({ error: 'Status é obrigatório' });
            }

            const statusValidos = ['ATIVO', 'INATIVO', 'BLOQUEADO'];
            if (!statusValidos.includes(TecnicoStatus)) {
                return res.status(400).json({
                    error: 'Status inválido. Use: ATIVO, INATIVO ou BLOQUEADO'
                });
            }

            // Verificar se o usuário é GESTOR
            if (usuarioLogado.usuarioTipo !== 'GESTOR') {
                return res.status(403).json({
                    error: 'Apenas gestores podem alterar status de técnicos'
                });
            }

            // Buscar gestor logado
            const gestorLogado = await prisma.gestor.findUnique({
                where: { GestorId: usuarioLogado.usuarioId }
            });

            if (!gestorLogado) {
                return res.status(403).json({ error: 'Gestor não encontrado' });
            }

            // Verificar se gestor está ativo
            if (gestorLogado.GestorStatus !== 'ATIVO') {
                return res.status(403).json({
                    error: 'Seu usuário gestor está inativo. Não é possível alterar status.'
                });
            }

            // Buscar técnico a ser alterado
            const tecnicoExistente = await prisma.tecnico.findUnique({
                where: { TecnicoId: tecnicoId },
                include: {
                    Unidade: true
                }
            });

            if (!tecnicoExistente) {
                return res.status(404).json({ error: 'Técnico não encontrado' });
            }

            // Verificar se o gestor pertence à mesma unidade do técnico
            if (gestorLogado.UnidadeId !== tecnicoExistente.UnidadeId) {
                return res.status(403).json({
                    error: 'Você só pode alterar status de técnicos da sua própria unidade'
                });
            }

            // Verificar se a unidade está ativa
            if (tecnicoExistente.Unidade.UnidadeStatus !== 'ATIVA') {
                return res.status(400).json({
                    error: 'Não é possível alterar status de técnicos de uma unidade inativa ou bloqueada'
                });
            }

            // Se for inativar/bloquear, verificar se existem atividades em aberto
            if (TecnicoStatus === 'INATIVO' || TecnicoStatus === 'BLOQUEADO') {
                // Verificar se o técnico está em alguma equipe ativa
                const equipesAtivas = await prisma.tecnicoEquipe.count({
                    where: {
                        TecnicoId: tecnicoId,
                        TecEquStatus: 'ATIVO'
                    }
                });

                if (equipesAtivas > 0) {
                    return res.status(400).json({
                        error: 'Não é possível inativar/bloquear um técnico que está em equipes ativas'
                    });
                }

                // Verificar se existem chamados em andamento atribuídos a este técnico
                const chamadosEmAndamento = await prisma.atividadeChamado.count({
                    where: {
                        TecnicoId: tecnicoId,
                        Chamado: {
                            ChamadoStatus: {
                                in: ['ATRIBUIDO', 'EMATENDIMENTO']
                            }
                        }
                    }
                });

                if (chamadosEmAndamento > 0) {
                    return res.status(400).json({
                        error: 'Não é possível inativar/bloquear um técnico com chamados em andamento'
                    });
                }
            }

            // Atualizar apenas status
            const tecnicoAtualizado = await prisma.tecnico.update({
                where: { TecnicoId: tecnicoId },
                data: { TecnicoStatus: TecnicoStatus },
                include: {
                    Unidade: {
                        select: {
                            UnidadeId: true,
                            UnidadeNome: true,
                            UnidadeStatus: true
                        }
                    },
                    Departamento: {
                        select: {
                            DepartamentoId: true,
                            DepartamentoNome: true,
                            DepartamentoStatus: true
                        }
                    }
                }
            });

            // Remover senha do retorno
            const { TecnicoSenha: _, ...tecnicoSemSenha } = tecnicoAtualizado;

            res.status(200).json({
                message: 'Status do técnico atualizado com sucesso',
                data: tecnicoSemSenha
            });

        } catch (error) {
            console.error('Erro ao alterar status do técnico:', error);
            res.status(500).json({ error: 'Erro ao alterar status do técnico' });
        }
    }

    // Listar técnicos por unidade/departamento (para uso em selects)
    async listarTecnicosPorUnidade(req, res) {
        try {
            const { unidadeId } = req.params;
            const { departamentoId, apenasAtivos } = req.query;
            const usuarioLogado = req.usuario;

            const unidadeIdInt = parseInt(unidadeId);
            if (isNaN(unidadeIdInt)) {
                return res.status(400).json({ error: 'ID da unidade inválido' });
            }

            // Verificar permissão
            if (usuarioLogado.usuarioTipo === 'GESTOR') {
                const gestorLogado = await prisma.gestor.findUnique({
                    where: { GestorId: usuarioLogado.usuarioId }
                });

                if (gestorLogado && gestorLogado.UnidadeId !== unidadeIdInt) {
                    return res.status(403).json({
                        error: 'Você só pode visualizar técnicos da sua própria unidade'
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

            // Construir filtro
            const filtro = {
                UnidadeId: unidadeIdInt
            };

            if (departamentoId) {
                filtro.DepartamentoId = departamentoId;
            }

            if (apenasAtivos === 'true') {
                filtro.TecnicoStatus = 'ATIVO';
            }

            // Buscar técnicos
            const tecnicos = await prisma.tecnico.findMany({
                where: filtro,
                orderBy: {
                    TecnicoNome: 'asc'
                },
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
                    },
                    _count: {
                        select: {
                            AtividadeChamado: true,
                            TecnicoEquipe: true
                        }
                    }
                }
            });

            res.status(200).json({
                data: tecnicos
            });

        } catch (error) {
            console.error('Erro ao listar técnicos por unidade:', error);
            res.status(500).json({ error: 'Erro ao listar técnicos por unidade' });
        }
    }
    
}

module.exports = new TecnicoController();