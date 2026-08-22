// src/controllers/gestorController.js
const prisma = require('../prisma.js');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

class GestorController {

    // Login do gestor
    async loginGestor(req, res) {
        try {
            //console.log('Body recebido:', req.body);
            const { GestorUsuario, GestorSenha } = req.body;

            // Validações básicas
            if (!GestorUsuario || !GestorUsuario.trim()) {
                return res.status(400).json({
                    error: 'Usuário é obrigatório'
                });
            }

            if (!GestorSenha || !GestorSenha.trim()) {
                return res.status(400).json({
                    error: 'Senha é obrigatória'
                });
            }

            // Buscar gestor pelo usuário
            const gestor = await prisma.gestor.findUnique({
                where: {
                    GestorUsuario: GestorUsuario.toUpperCase().trim()
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

            // Verificar se gestor existe
            if (!gestor) {
                return res.status(400).json({
                    error: 'Usuário ou senha inválidos'
                });
            }

            // Verificar se gestor está ativo
            if (gestor.GestorStatus !== 'ATIVO') {
                return res.status(403).json({
                    error: 'Usuário inativo ou bloqueado. Entre em contato com o administrador.'
                });
            }

            // Verificar se a unidade está ativa
            if (gestor.Unidade.UnidadeStatus !== 'ATIVA') {
                return res.status(403).json({
                    error: 'Sua unidade está inativa ou bloqueada. Entre em contato com o administrador.'
                });
            }

            // Verificar senha com pepper
            const senhaComPepper = process.env.PEPPER_SENHA_GESTOR + GestorSenha.trim();
            const senhaValida = await bcrypt.compare(senhaComPepper, gestor.GestorSenha);

            if (!senhaValida) {
                return res.status(400).json({
                    error: 'Usuário ou senha inválidos'
                });
            }

            // Gerar token JWT
            const token = jwt.sign(
                {
                    usuarioId: gestor.GestorId,
                    usuarioTipo: 'GESTOR',
                    usuarioEmail: gestor.GestorEmail,
                    unidadeId: gestor.UnidadeId,
                    gestorNivel: gestor.GestorNivel
                },
                process.env.JWT_SECRET,
                { expiresIn: '8h' }
            );

            // Retornar dados do gestor (sem a senha)
            const { GestorSenha: _, ...gestorSemSenha } = gestor;

            res.status(200).json({
                message: 'Login realizado com sucesso',
                data: {
                    usuario: gestorSemSenha,
                    token,
                    tipo: 'GESTOR'
                }
            });

        } catch (error) {
            console.error('Erro no login do gestor:', error);
            res.status(500).json({
                error: 'Erro no login do gestor'
            });
        }
    }

    // Cadastrar novo gestor
    async cadastrarGestor(req, res) {
        try {
            const {
                UnidadeId,
                GestorNome,
                GestorEmail,
                GestorTelefone,
                GestorCPF,
                GestorUsuario,
                GestorSenha,
                GestorNivel,
                GestorStatus
            } = req.body;

            const usuarioLogado = req.usuario;

            // Validações básicas
            if (!UnidadeId) {
                return res.status(400).json({ error: 'Unidade é obrigatória' });
            }

            if (!GestorNome || !GestorNome.trim()) {
                return res.status(400).json({ error: 'Nome do gestor é obrigatório' });
            }

            if (!GestorCPF || !GestorCPF.trim()) {
                return res.status(400).json({ error: 'CPF é obrigatório' });
            }

            if (!GestorUsuario || !GestorUsuario.trim()) {
                return res.status(400).json({ error: 'Usuário é obrigatório' });
            }

            if (!GestorSenha || !GestorSenha.trim()) {
                return res.status(400).json({ error: 'Senha é obrigatória' });
            }

            if (GestorSenha.trim().length < 6) {
                return res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres' });
            }

            if (!GestorNivel) {
                return res.status(400).json({ error: 'Nível do gestor é obrigatório' });
            }

            const niveisValidos = ['COMUM', 'ADMINUNIDADE'];
            if (!niveisValidos.includes(GestorNivel)) {
                return res.status(400).json({
                    error: 'Nível inválido. Use: COMUM ou ADMINUNIDADE'
                });
            }

            // Validar status se fornecido
            if (GestorStatus) {
                const statusValidos = ['ATIVO', 'INATIVO', 'BLOQUEADO'];
                if (!statusValidos.includes(GestorStatus)) {
                    return res.status(400).json({
                        error: 'Status inválido. Use: ATIVO, INATIVO ou BLOQUEADO'
                    });
                }
            }

            // Verificar regras de permissão baseado no tipo de usuário logado
            if (usuarioLogado.usuarioTipo === 'ADMINISTRADOR') {
                // ADMINISTRADOR pode cadastrar qualquer nível
                // Não precisa de validação adicional
            }
            else if (usuarioLogado.usuarioTipo === 'GESTOR') {
                // Buscar gestor logado para verificar nível e unidade
                const gestorLogado = await prisma.gestor.findUnique({
                    where: { GestorId: usuarioLogado.usuarioId, GestorStatus: 'ATIVO' }
                });

                if (!gestorLogado) {
                    return res.status(403).json({
                        error: 'Gestor não encontrado'
                    });
                }

                // Verificar se é ADMINUNIDADE
                if (gestorLogado.GestorNivel !== 'ADMINUNIDADE') {
                    return res.status(403).json({
                        error: 'Apenas gestores ADMINUNIDADE podem cadastrar novos gestores'
                    });
                }

                // ADMINUNIDADE não pode cadastrar outro ADMINUNIDADE
                if (GestorNivel === 'ADMINUNIDADE') {
                    return res.status(403).json({
                        error: 'Gestores ADMINUNIDADE não podem cadastrar outros administradores de unidade'
                    });
                }

                // ADMINUNIDADE só pode cadastrar gestores da sua própria unidade
                if (gestorLogado.UnidadeId !== parseInt(UnidadeId)) {
                    return res.status(403).json({
                        error: 'Você só pode cadastrar gestores na sua própria unidade'
                    });
                }
            }
            else {
                return res.status(403).json({
                    error: 'Apenas administradores e gestores ADMINUNIDADE podem cadastrar gestores'
                });
            }

            // Verificar se a unidade existe
            const unidade = await prisma.unidade.findUnique({
                where: { UnidadeId: parseInt(UnidadeId) }
            });

            if (!unidade) {
                return res.status(404).json({ error: 'Unidade não encontrada' });
            }

            // Verificar se a unidade está ativa
            if (unidade.UnidadeStatus !== 'ATIVA') {
                return res.status(400).json({
                    error: 'Não é possível cadastrar gestores em uma unidade inativa ou bloqueada'
                });
            }

            // Verificar duplicidade de CPF na Unidade
            const cpfExistente = await prisma.gestor.findFirst({
                where: { GestorCPF: GestorCPF.trim(), UnidadeId: parseInt(UnidadeId) }
            });

            if (cpfExistente) {
                return res.status(409).json({ error: 'CPF para Gestor já cadastrado nessa unidade' });
            }

            // Verificar duplicidade de usuário
            const usuarioExistente = await prisma.gestor.findUnique({
                where: { GestorUsuario: GestorUsuario.trim() }
            });

            if (usuarioExistente) {
                return res.status(409).json({ error: 'Nome de usuário já está em uso' });
            }

            // Criptografar senha
            const salt = await bcrypt.genSalt(10);
            const senhaComPepper = process.env.PEPPER_SENHA_GESTOR + GestorSenha.trim();
            const senhaHash = await bcrypt.hash(senhaComPepper, salt);

            // Criar gestor
            const gestor = await prisma.gestor.create({
                data: {
                    UnidadeId: parseInt(UnidadeId),
                    GestorNome: GestorNome.trim(),
                    GestorEmail: GestorEmail?.trim() || null,
                    GestorTelefone: GestorTelefone?.trim() || null,
                    GestorCPF: GestorCPF.trim(),
                    GestorUsuario: GestorUsuario.trim(),
                    GestorSenha: senhaHash,
                    GestorNivel: GestorNivel,
                    GestorStatus: GestorStatus || 'ATIVO'
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

            // Remover senha do retorno
            const { GestorSenha: _, ...gestorSemSenha } = gestor;

            res.status(201).json({
                message: 'Gestor cadastrado com sucesso',
                data: gestorSemSenha
            });

        } catch (error) {
            console.error('Erro ao cadastrar gestor:', error);
            res.status(500).json({ error: 'Erro ao cadastrar gestor' });
        }
    }

    // Alterar gestor
    async alterarGestor(req, res) {
        try {
            const { id } = req.params;
            const {
                UnidadeId,
                GestorNome,
                GestorEmail,
                GestorTelefone,
                GestorCPF,
                GestorUsuario,
                GestorSenha,
                GestorSenhaAtual,
                GestorNivel,
                GestorStatus
            } = req.body;

            const usuarioLogado = req.usuario;
            const gestorId = id;
            const isProprioGestor = usuarioLogado.usuarioTipo === 'GESTOR' && usuarioLogado.usuarioId === gestorId;

            if (!gestorId) {
                return res.status(400).json({ error: 'ID do gestor inválido' });
            }

            // Buscar gestor a ser alterado
            const gestorAlterar = await prisma.gestor.findUnique({
                where: { GestorId: gestorId },
                include: {
                    Unidade: true
                }
            });

            if (!gestorAlterar) {
                return res.status(404).json({ error: 'Gestor não encontrado' });
            }

            // =============================================
            // VERIFICAÇÕES DE PERMISSÃO
            // =============================================
            let podeAlterar = false;
            let gestorLogado = null;

            // CASO 1: ADMINISTRADOR - pode alterar qualquer gestor
            if (usuarioLogado.usuarioTipo === 'ADMINISTRADOR') {
                podeAlterar = true;
            }
            // CASO 2: GESTOR tentando alterar
            else if (usuarioLogado.usuarioTipo === 'GESTOR') {
                // Buscar gestor logado (apenas se estiver ativo)
                gestorLogado = await prisma.gestor.findUnique({
                    where: {
                        GestorId: usuarioLogado.usuarioId,
                        GestorStatus: 'ATIVO'
                    }
                });

                if (!gestorLogado) {
                    return res.status(403).json({
                        error: 'Seu usuário não está ativo. Entre em contato com o administrador.'
                    });
                }

                // CASO 2.1: Gestor alterando a si mesmo
                if (isProprioGestor) {
                    podeAlterar = true; // Pode alterar, mas com restrições
                }
                // CASO 2.2: Gestor alterando outro gestor
                else {
                    // Gestor COMUM não pode alterar ninguém
                    if (gestorLogado.GestorNivel === 'COMUM') {
                        return res.status(403).json({
                            error: 'Gestores comuns não podem alterar dados de outros gestores'
                        });
                    }

                    // ADMINUNIDADE pode alterar desde que:
                    if (gestorLogado.GestorNivel === 'ADMINUNIDADE') {
                        // 1. Seja da mesma unidade
                        if (gestorLogado.UnidadeId !== gestorAlterar.UnidadeId) {
                            return res.status(403).json({
                                error: 'Você só pode alterar gestores da sua própria unidade'
                            });
                        }

                        // 2. Não pode alterar outro ADMINUNIDADE
                        if (gestorAlterar.GestorNivel === 'ADMINUNIDADE') {
                            return res.status(403).json({
                                error: 'Gestores ADMINUNIDADE não podem alterar outros administradores de unidade'
                            });
                        }

                        podeAlterar = true;
                    }
                }
            }
            else {
                return res.status(403).json({
                    error: 'Acesso negado'
                });
            }

            if (!podeAlterar) {
                return res.status(403).json({
                    error: 'Você não tem permissão para alterar este gestor'
                });
            }

            // =============================================
            // VALIDAÇÕES ESPECÍFICAS PARA AUTO-ALTERAÇÃO
            // =============================================
            if (isProprioGestor) {
                // Gestor alterando a si mesmo precisa confirmar senha atual
                if (!GestorSenhaAtual || !GestorSenhaAtual.trim()) {
                    return res.status(400).json({
                        error: 'Senha atual é obrigatória para alterar seus dados'
                    });
                }

                // Verificar senha atual com pepper
                const senhaAtualComPepper = process.env.PEPPER_SENHA_GESTOR + GestorSenhaAtual.trim();
                const senhaAtualValida = await bcrypt.compare(senhaAtualComPepper, gestorAlterar.GestorSenha);

                if (!senhaAtualValida) {
                    return res.status(400).json({
                        error: 'Senha atual incorreta'
                    });
                }

                // Gestor NÃO pode alterar próprio nível
                if (GestorNivel !== undefined && GestorNivel !== gestorAlterar.GestorNivel) {
                    return res.status(403).json({
                        error: 'Você não pode alterar seu próprio nível de acesso'
                    });
                }

                // Gestor NÃO pode alterar próprio status (ativar/inativar-se)
                if (GestorStatus !== undefined && GestorStatus !== gestorAlterar.GestorStatus) {
                    return res.status(403).json({
                        error: 'Você não pode alterar seu próprio status'
                    });
                }

                // Gestor NÃO pode alterar própria unidade
                if (UnidadeId !== undefined && UnidadeId !== gestorAlterar.UnidadeId) {
                    return res.status(403).json({
                        error: 'Você não pode alterar sua própria unidade'
                    });
                }
            }

            // =============================================
            // PREPARAR DADOS PARA ATUALIZAÇÃO
            // =============================================
            const dadosAtualizacao = {};

            // Unidade (apenas ADMIN alterando outros)
            if (UnidadeId !== undefined && UnidadeId !== gestorAlterar.UnidadeId) {
                // Se não for admin, não pode
                if (usuarioLogado.usuarioTipo !== 'ADMINISTRADOR') {
                    return res.status(403).json({
                        error: 'Você não tem permissão para alterar a unidade'
                    });
                }

                const unidade = await prisma.unidade.findUnique({
                    where: { UnidadeId: parseInt(UnidadeId) }
                });

                if (!unidade) {
                    return res.status(404).json({ error: 'Unidade não encontrada' });
                }

                if (unidade.UnidadeStatus !== 'ATIVA') {
                    return res.status(400).json({
                        error: 'Não é possível transferir gestor para uma unidade inativa ou bloqueada'
                    });
                }

                dadosAtualizacao.UnidadeId = parseInt(UnidadeId);
            }

            // Nome
            if (GestorNome !== undefined) {
                if (!GestorNome.trim()) {
                    return res.status(400).json({ error: 'Nome do gestor não pode ser vazio' });
                }
                dadosAtualizacao.GestorNome = GestorNome.trim();
            }

            // Email
            if (GestorEmail !== undefined) {
                dadosAtualizacao.GestorEmail = GestorEmail?.trim() || null;
            }

            // Telefone
            if (GestorTelefone !== undefined) {
                dadosAtualizacao.GestorTelefone = GestorTelefone?.trim() || null;
            }

            if (usuarioLogado.usuarioTipo === 'ADMINISTRADOR') {
                // CPF
                if (GestorCPF !== undefined && gestorAlterar.GestorCPF !== GestorCPF.trim()) {
                    if (!GestorCPF.trim()) {
                        return res.status(400).json({ error: 'CPF não pode ser vazio' });
                    }

                    const cpfExistente = await prisma.gestor.findFirst({
                        where: {
                            GestorCPF: GestorCPF.trim(),
                            GestorId: { not: gestorId }
                        }
                    });

                    if (cpfExistente) {
                        return res.status(409).json({ error: 'CPF já cadastrado para outro gestor' });
                    }

                    dadosAtualizacao.GestorCPF = GestorCPF.trim();
                }

                // Usuário
                if (GestorUsuario !== undefined && gestorAlterar.GestorUsuario !== GestorUsuario.trim()) {
                    if (!GestorUsuario.trim()) {
                        return res.status(400).json({ error: 'Usuário não pode ser vazio' });
                    }

                    const usuarioExistente = await prisma.gestor.findFirst({
                        where: {
                            GestorUsuario: GestorUsuario.trim(),
                            GestorId: { not: gestorId }
                        }
                    });

                    if (usuarioExistente) {
                        return res.status(409).json({ error: 'Nome de usuário já está em uso' });
                    }

                    dadosAtualizacao.GestorUsuario = GestorUsuario.trim();
                }
            } else if (usuarioLogado.usuarioTipo !== 'GESTOR' && gestorLogado.GestorNivel === 'ADMINUNIDADE' && !isProprioGestor) {

                // CPF
                if (GestorCPF !== undefined && gestorAlterar.GestorCPF !== GestorCPF.trim()) {
                    if (!GestorCPF.trim()) {
                        return res.status(400).json({ error: 'CPF não pode ser vazio' });
                    }

                    const cpfExistente = await prisma.gestor.findFirst({
                        where: {
                            GestorCPF: GestorCPF.trim(),
                            GestorId: { not: gestorId }
                        }
                    });

                    if (cpfExistente) {
                        return res.status(409).json({ error: 'CPF já cadastrado para outro gestor' });
                    }

                    dadosAtualizacao.GestorCPF = GestorCPF.trim();
                }

                // Usuário
                if (GestorUsuario !== undefined && gestorAlterar.GestorUsuario !== GestorUsuario.trim()) {
                    if (!GestorUsuario.trim()) {
                        return res.status(400).json({ error: 'Usuário não pode ser vazio' });
                    }

                    const usuarioExistente = await prisma.gestor.findFirst({
                        where: {
                            GestorUsuario: GestorUsuario.trim(),
                            GestorId: { not: gestorId }
                        }
                    });

                    if (usuarioExistente) {
                        return res.status(409).json({ error: 'Nome de usuário já está em uso' });
                    }

                    dadosAtualizacao.GestorUsuario = GestorUsuario.trim();
                }
            } else {
                dadosAtualizacao.GestorCPF = gestorAlterar.GestorCPF;
            }

            // Senha (com pepper)
            if (GestorSenha !== undefined && GestorSenha.trim()) {
                if (GestorSenha.trim().length < 6) {
                    return res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres' });
                }

                // Se for auto-alteração, já validou a senha atual
                // Se for admin alterando outro, não precisa validar senha atual
                if (!isProprioGestor && usuarioLogado.usuarioTipo !== 'ADMINISTRADOR') {
                    // ADMINUNIDADE alterando gestor comum precisa da senha atual?
                    // Por segurança, vamos exigir confirmação
                    if (!GestorSenhaAtual || !GestorSenhaAtual.trim()) {
                        return res.status(400).json({
                            error: 'Senha atual do gestor é obrigatória para alterar a senha'
                        });
                    }

                    const senhaAtualComPepper = process.env.PEPPER_SENHA_GESTOR + GestorSenhaAtual.trim();
                    const senhaAtualValida = await bcrypt.compare(senhaAtualComPepper, gestorAlterar.GestorSenha);

                    if (!senhaAtualValida) {
                        return res.status(400).json({
                            error: 'Senha atual do gestor incorreta'
                        });
                    }
                }

                const salt = await bcrypt.genSalt(10);
                const senhaComPepper = process.env.PEPPER_SENHA_GESTOR + GestorSenha.trim();
                dadosAtualizacao.GestorSenha = await bcrypt.hash(senhaComPepper, salt);
            }

            // Nível (apenas ADMIN pode alterar)
            if (GestorNivel !== undefined) {
                if (usuarioLogado.usuarioTipo !== 'ADMINISTRADOR' && gestorAlterar.GestorNivel !== GestorNivel) {
                    return res.status(403).json({
                        error: 'Apenas administradores podem alterar o nível do gestor'
                    });
                }

                const niveisValidos = ['COMUM', 'ADMINUNIDADE'];
                if (!niveisValidos.includes(GestorNivel)) {
                    return res.status(400).json({
                        error: 'Nível inválido. Use: COMUM ou ADMINUNIDADE'
                    });
                }

                dadosAtualizacao.GestorNivel = GestorNivel;
            }

            // Status (apenas ADMIN pode alterar)
            if (GestorStatus !== undefined) {
                if (usuarioLogado.usuarioTipo !== 'ADMINISTRADOR' && gestorAlterar.GestorNivel !== GestorNivel) {
                    return res.status(403).json({
                        error: 'Apenas administradores podem alterar o status do gestor'
                    });
                }

                const statusValidos = ['ATIVO', 'INATIVO', 'BLOQUEADO'];
                if (!statusValidos.includes(GestorStatus)) {
                    return res.status(400).json({
                        error: 'Status inválido. Use: ATIVO, INATIVO ou BLOQUEADO'
                    });
                }
                dadosAtualizacao.GestorStatus = GestorStatus;
            }

            // Verificar se há dados para atualizar
            if (Object.keys(dadosAtualizacao).length === 0) {
                return res.status(400).json({ error: 'Nenhum dado fornecido para atualização' });
            }

            // Atualizar gestor
            const gestorAtualizado = await prisma.gestor.update({
                where: { GestorId: gestorId },
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

            // Remover senha do retorno
            const { GestorSenha: _, ...gestorSemSenha } = gestorAtualizado;

            res.status(200).json({
                message: 'Gestor atualizado com sucesso',
                data: gestorSemSenha
            });

        } catch (error) {
            console.error('Erro ao alterar gestor:', error);
            res.status(500).json({ error: 'Erro ao alterar gestor' });
        }
    }

    // Listar gestores com filtros
    async listarGestores(req, res) {
        try {
            const {
                unidadeId,
                nivel,
                status,
                pagina = 1,
                limite = 10
            } = req.query;

            const usuarioLogado = req.usuario;

            // Construir filtro base
            const filtro = {};

            // Aplicar filtros de acordo com permissão
            if (usuarioLogado.usuarioTipo === 'GESTOR') {
                const gestorLogado = await prisma.gestor.findUnique({
                    where: { GestorId: usuarioLogado.usuarioId }
                });

                if (gestorLogado) {
                    // Gestor só vê gestores da sua unidade
                    filtro.UnidadeId = gestorLogado.UnidadeId;
                }
            }

            // Aplicar filtros da query (sobrescrevem os automáticos se for admin)
            if (usuarioLogado.usuarioTipo === 'ADMINISTRADOR' && unidadeId) {
                filtro.UnidadeId = parseInt(unidadeId);
            }

            if (nivel) {
                const niveisValidos = ['COMUM', 'ADMINUNIDADE'];
                if (!niveisValidos.includes(nivel)) {
                    return res.status(400).json({
                        error: 'Nível inválido. Use: COMUM ou ADMINUNIDADE'
                    });
                }
                filtro.GestorNivel = nivel;
            }

            if (status) {
                const statusValidos = ['ATIVO', 'INATIVO', 'BLOQUEADO'];
                if (!statusValidos.includes(status)) {
                    return res.status(400).json({
                        error: 'Status inválido. Use: ATIVO, INATIVO ou BLOQUEADO'
                    });
                }
                filtro.GestorStatus = status;
            }

            // Calcular paginação
            const paginaAtual = parseInt(pagina);
            const limitePorPagina = parseInt(limite);
            const skip = (paginaAtual - 1) * limitePorPagina;

            // Buscar gestores
            const [gestores, total] = await prisma.$transaction([
                prisma.gestor.findMany({
                    where: filtro,
                    orderBy: [
                        { GestorNivel: 'desc' },
                        { GestorNome: 'asc' }
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
                        }
                    }
                }),
                prisma.gestor.count({ where: filtro })
            ]);

            // Remover senhas dos gestores
            const gestoresSemSenha = gestores.map(gestor => {
                const { GestorSenha: _, ...gestorSemSenha } = gestor;
                return gestorSemSenha;
            });

            res.status(200).json({
                data: gestoresSemSenha,
                paginacao: {
                    paginaAtual,
                    limitePorPagina,
                    totalRegistros: total,
                    totalPaginas: Math.ceil(total / limitePorPagina)
                }
            });

        } catch (error) {
            console.error('Erro ao listar gestores:', error);
            res.status(500).json({ error: 'Erro ao listar gestores' });
        }
    }

    // Buscar gestor por ID
    async buscarGestorPorId(req, res) {
        try {
            const { id } = req.params;
            const usuarioLogado = req.usuario;

            const gestorId = id;
            if (!gestorId) {
                return res.status(400).json({ error: 'ID do gestor inválido' });
            }

            // Buscar gestor
            const gestor = await prisma.gestor.findUnique({
                where: { GestorId: gestorId },
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

            if (!gestor) {
                return res.status(404).json({ error: 'Gestor não encontrado' });
            }

            // Verificar permissão de visualização
            if (usuarioLogado.usuarioTipo === 'GESTOR') {
                const gestorLogado = await prisma.gestor.findUnique({
                    where: { GestorId: usuarioLogado.usuarioId }
                });

                if (gestorLogado && gestorLogado.UnidadeId !== gestor.UnidadeId) {
                    return res.status(403).json({
                        error: 'Você só pode visualizar gestores da sua própria unidade'
                    });
                }
            } else if (usuarioLogado.usuarioTipo === 'ADMINISTRADOR') {
                // ADMINISTRADOR pode ver qualquer gestor
            } else {
                return res.status(403).json({
                    error: 'Apenas administradores e gestores podem acessar este recurso'
                });
            }

            // Remover senha do retorno
            const { GestorSenha: _, ...gestorSemSenha } = gestor;

            res.status(200).json({
                data: gestorSemSenha
            });

        } catch (error) {
            console.error('Erro ao buscar gestor:', error);
            res.status(500).json({ error: 'Erro ao buscar gestor' });
        }
    }

    // Alterar apenas status do gestor
    async alterarStatusGestor(req, res) {
        try {
            const { id } = req.params;
            const { GestorStatus } = req.body;
            const usuarioLogado = req.usuario;

            const gestorId = id;
            if (!gestorId) {
                return res.status(400).json({ error: 'ID do gestor inválido' });
            }

            // Validar status
            if (!GestorStatus) {
                return res.status(400).json({ error: 'Status é obrigatório' });
            }

            const statusValidos = ['ATIVO', 'INATIVO', 'BLOQUEADO'];
            if (!statusValidos.includes(GestorStatus)) {
                return res.status(400).json({
                    error: 'Status inválido. Use: ATIVO, INATIVO ou BLOQUEADO'
                });
            }

            // Buscar gestor a ser alterado
            const gestorAlterar = await prisma.gestor.findUnique({
                where: { GestorId: gestorId }
            });

            if (!gestorAlterar) {
                return res.status(404).json({ error: 'Gestor não encontrado' });
            }

            // Verificar permissões (mesma lógica da alteração completa)
            let podeAlterar = false;
            let gestorLogado = null;

            if (usuarioLogado.usuarioTipo === 'ADMINISTRADOR') {
                podeAlterar = true;
            }
            else if (usuarioLogado.usuarioTipo === 'GESTOR') {
                gestorLogado = await prisma.gestor.findUnique({
                    where: { GestorId: usuarioLogado.usuarioId }
                });

                if (!gestorLogado) {
                    return res.status(403).json({ error: 'Gestor não encontrado' });
                }

                if (gestorLogado.GestorNivel === 'COMUM') {
                    return res.status(403).json({
                        error: 'Gestores comuns não podem alterar status de outros gestores'
                    });
                }

                if (gestorLogado.GestorNivel === 'ADMINUNIDADE') {
                    if (gestorLogado.UnidadeId !== gestorAlterar.UnidadeId) {
                        return res.status(403).json({
                            error: 'Você só pode alterar status de gestores da sua própria unidade'
                        });
                    }

                    if (gestorAlterar.GestorNivel === 'ADMINUNIDADE') {
                        return res.status(403).json({
                            error: 'Gestores ADMINUNIDADE não podem alterar status de outros administradores de unidade'
                        });
                    }

                    podeAlterar = true;
                }
            }

            if (!podeAlterar) {
                return res.status(403).json({
                    error: 'Você não tem permissão para alterar o status deste gestor'
                });
            }

            // Atualizar apenas status
            const gestorAtualizado = await prisma.gestor.update({
                where: { GestorId: gestorId },
                data: { GestorStatus: GestorStatus },
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

            // Remover senha do retorno
            const { GestorSenha: _, ...gestorSemSenha } = gestorAtualizado;

            res.status(200).json({
                message: 'Status do gestor atualizado com sucesso',
                data: gestorSemSenha
            });

        } catch (error) {
            console.error('Erro ao alterar status do gestor:', error);
            res.status(500).json({ error: 'Erro ao alterar status do gestor' });
        }
    }

    // Dashboard Gestor
    async dashboard(req, res) {
        try {
            // Verificar se o usuário é ADMINISTRADOR

            // DEBUG: verificar o conteúdo do req.usuario
            //console.log('req.usuario:', req.usuario);

            if (req.usuario.usuarioTipo !== 'GESTOR') {
                return res.status(403).json({
                    error: 'Apenas gestores podem acessar essa rota'
                });
            }

            const gestorLogado = await prisma.gestor.findUnique({
                where: { GestorId: req.usuario.usuarioId }
            });

            const totalPessoas = await prisma.pessoa.count({
                where: {
                    PessoaStatus: 'ATIVA',
                    UnidadeId: gestorLogado.UnidadeId
                }
            });

            const totalTecnicos = await prisma.tecnico.count({
                where: {
                    TecnicoStatus: 'ATIVO',
                    UnidadeId: gestorLogado.UnidadeId
                }
            });

            const totalEquipes = await prisma.equipe.count({
                where: {
                    EquipeStatus: 'ATIVA',
                    UnidadeId: gestorLogado.UnidadeId
                }
            });

            let totalGestoresComuns
            if (gestorLogado.GestorNivel === 'ADMINUNIDADE') {
                totalGestoresComuns = await prisma.gestor.count({
                    where: {
                        GestorStatus: 'ATIVO',
                        UnidadeId: gestorLogado.UnidadeId,
                        GestorNivel: 'COMUM'
                    }
                });
            } else {
                totalGestoresComuns = 0;
            }


            let totalGestoresADM;
            if (gestorLogado.GestorNivel === 'ADMINUNIDADE') {
                totalGestoresADM = await prisma.gestor.count({
                    where: {
                        GestorStatus: 'ATIVO',
                        UnidadeId: gestorLogado.UnidadeId,
                        GestorNivel: 'ADMINUNIDADE'
                    }
                });
            } else {
                totalGestoresADM = 0;
            }

            const totalTiposSuporte = await prisma.tipoSuporteUnidade.count({
                where: {
                    TipSupUniStatus: 'ATIVO',
                    UnidadeId: gestorLogado.UnidadeId
                }
            });

            const totalDepartamentos = await prisma.departamento.count({
                where: {
                    DepartamentoStatus: 'ATIVO',
                    UnidadeId: gestorLogado.UnidadeId
                }
            });

            const totalChamadosPendentes = await prisma.chamado.count({
                where: {
                    ChamadoStatus: 'PENDENTE',
                    UnidadeId: gestorLogado.UnidadeId
                }
            });

            const totalChamadosAnalisados = await prisma.chamado.count({
                where: {
                    ChamadoStatus: 'ANALISADO',
                    UnidadeId: gestorLogado.UnidadeId
                }
            });

            const totalChamadosAtribuidos = await prisma.chamado.count({
                where: {
                    ChamadoStatus: 'ATRIBUIDO',
                    UnidadeId: gestorLogado.UnidadeId
                }
            });

            const totalChamadosAtendimento = await prisma.chamado.count({
                where: {
                    ChamadoStatus: 'EMATENDIMENTO',
                    UnidadeId: gestorLogado.UnidadeId
                }
            });

            const totalChamadosFaltandoInformacao = await prisma.chamado.count({
                where: {
                    ChamadoStatus: 'FALTAINFORMACAO',
                    UnidadeId: gestorLogado.UnidadeId
                }
            });

            const totalChamadosRecusados = await prisma.chamado.count({
                where: {
                    ChamadoStatus: 'RECUSADO',
                    UnidadeId: gestorLogado.UnidadeId
                }
            });

            // Status Chamados
            /*
            PROCESSAMENTO   // Pessoa acabou de abrir, em processamento sistema (Tipo, Riscos e Urgência)
            PENDENTE        // Sistema clasisifocu informações base, pensente de análise de gestor
            ANALISADO       // Gestor analisou
            ATRIBUIDO       // Gestor atribuiu a uma equipe
            EMATENDIMENTO   // Equipe iniciou o atendimento
            CONCLUIDO       // Equipe concluiu o trabalho
            CANCELADO       // Pessoa que abriu cancelou
            RECUSADO        // Gestor Recusou
            FALTAINFORMACAO // Gestor Identifivou que falta informação, gestor precisa solitar detalhes para pessoa que abriu
            */

            res.status(200).json({
                data: {
                    totalChamadosAnalisados,
                    totalChamadosAtribuidos,
                    totalChamadosAtendimento,
                    totalChamadosFaltandoInformacao,
                    totalChamadosPendentes,
                    totalChamadosRecusados,
                    totalDepartamentos,
                    totalEquipes,
                    totalGestoresADM,
                    totalGestoresComuns,
                    totalPessoas,
                    totalTecnicos,
                    totalTiposSuporte
                }
            });


        } catch (error) {
            console.error('Erro ao montar dashboardo gestor:', error);
            res.status(500).json({
                error: 'Erro ao montar dashboardo gestor'
            });
        }

    }
}

module.exports = new GestorController();