// src/controllers/pessoaController.js
const prisma = require('../prisma.js');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const { getBrasilDateTime } = require('../utils/dataBrasilObter.js');

class PessoaController {

    // Login da pessoa
    async login(req, res) {
        try {
            const { PessoaUsuario, PessoaSenha } = req.body;

            // Validações básicas
            if (!PessoaUsuario || !PessoaUsuario.trim()) {
                return res.status(400).json({
                    error: 'Usuário é obrigatório'
                });
            }

            if (!PessoaSenha || !PessoaSenha.trim()) {
                return res.status(400).json({
                    error: 'Senha é obrigatória'
                });
            }

            // Buscar pessoa pelo usuário (CPF)
            const pessoa = await prisma.pessoa.findUnique({
                where: {
                    PessoaCPF: PessoaUsuario.trim()
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

            // Verificar se pessoa existe
            if (!pessoa) {
                return res.status(400).json({
                    error: 'Usuário ou senha inválidos'
                });
            }

            // Verificar se a pessoa está ativa
            if (pessoa.PessoaStatus !== 'ATIVA') {
                return res.status(403).json({
                    error: 'Sua conta está inativa ou bloqueada. Entre em contato com o gestor da sua unidade.'
                });
            }

            // Verificar se a unidade está ativa
            if (pessoa.Unidade.UnidadeStatus !== 'ATIVA') {
                return res.status(403).json({
                    error: 'A unidade está inativa ou bloqueada. Não é possível realizar login no momento.'
                });
            }

            // Verificar senha com pepper
            const senhaComPepper = process.env.PEPPER_SENHA_PESSOA + PessoaSenha.trim();
            const senhaValida = await bcrypt.compare(senhaComPepper, pessoa.PessoaSenha);

            if (!senhaValida) {
                return res.status(400).json({
                    error: 'Usuário ou senha inválidos'
                });
            }

            // Gerar token JWT
            const token = jwt.sign(
                {
                    usuarioId: pessoa.PessoaId,
                    usuarioTipo: 'PESSOA',
                    usuarioEmail: pessoa.PessoaEmail,
                    unidadeId: pessoa.UnidadeId
                },
                process.env.JWT_SECRET,
                { expiresIn: '8h' }
            );

            // Retornar dados da pessoa (sem a senha)
            const { PessoaSenha: _, ...pessoaSemSenha } = pessoa;

            res.status(200).json({
                message: 'Login realizado com sucesso',
                data: {
                    usuario: pessoaSemSenha,
                    token,
                    tipo: 'PESSOA'
                }
            });

        } catch (error) {
            console.error('Erro no login da pessoa:', error);
            res.status(500).json({
                error: 'Erro no login da pessoa'
            });
        }
    }

    // Cadastrar nova pessoa (apenas gestores da mesma unidade)
    async cadastrarPessoa(req, res) {
        try {
            const {
                UnidadeId,
                PessoaNome,
                PessoaEmail,
                PessoaTelefone,
                PessoaCPF,
                PessoaSenha,
                PessoaStatus
            } = req.body;

            const usuarioLogado = req.usuario;

            // Validações básicas
            if (!UnidadeId) {
                return res.status(400).json({ error: 'Unidade é obrigatória' });
            }

            if (!PessoaNome || !PessoaNome.trim()) {
                return res.status(400).json({ error: 'Nome da pessoa é obrigatório' });
            }

            if (!PessoaCPF || !PessoaCPF.trim()) {
                return res.status(400).json({ error: 'CPF é obrigatório' });
            }

            if (!PessoaSenha || !PessoaSenha.trim()) {
                return res.status(400).json({ error: 'Senha é obrigatória' });
            }

            if (PessoaSenha.trim().length < 6) {
                return res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres' });
            }

            // Verificar se o usuário logado é GESTOR
            if (usuarioLogado.usuarioTipo !== 'GESTOR') {
                return res.status(403).json({
                    error: 'Apenas gestores podem cadastrar pessoas'
                });
            }

            // Buscar gestor logado
            const gestorLogado = await prisma.gestor.findUnique({
                where: { GestorId: usuarioLogado.usuarioId, GestorStatus: 'ATIVO' }
            });

            if (!gestorLogado) {
                return res.status(403).json({ error: 'Gestor não encontrado' });
            }

            // Verificar se o gestor pertence à unidade informada
            if (gestorLogado.UnidadeId !== parseInt(UnidadeId)) {
                return res.status(403).json({
                    error: 'Você só pode cadastrar pessoas na sua própria unidade'
                });
            }

            // Verificar status do gestor
            if (gestorLogado.GestorStatus !== 'ATIVO') {
                return res.status(403).json({
                    error: 'Seu usuário gestor está inativo. Não é possível cadastrar pessoas.'
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
                    error: 'Não é possível cadastrar pessoas em uma unidade inativa ou bloqueada'
                });
            }

            // Verifica se o gestor é da mesma unidade
            if (gestorLogado.UnidadeId !== parseInt(UnidadeId)) {
                return res.status(400).json({
                    error: 'Você só pode cadastrar pessoas na sua própria unidade'
                });
            }

            // Validar status se fornecido
            if (PessoaStatus) {
                const statusValidos = ['ATIVA', 'INATIVA', 'BLOQUEADA'];
                if (!statusValidos.includes(PessoaStatus)) {
                    return res.status(400).json({
                        error: 'Status inválido. Use: ATIVA, INATIVA ou BLOQUEADA'
                    });
                }
            }

            // Verificar duplicidade de CPF na Unidade
            const cpfExistente = await prisma.pessoa.findFirst({
                where: { PessoaCPF: PessoaCPF.trim(), UnidadeId: parseInt(UnidadeId) }
            });

            if (cpfExistente) {
                return res.status(409).json({ error: 'CPF já cadastrado' });
            }

            // Validar email se fornecido (formato básico)
            if (PessoaEmail && PessoaEmail.trim()) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(PessoaEmail.trim())) {
                    return res.status(400).json({ error: 'E-mail inválido' });
                }
            }

            // Criptografar senha
            const salt = await bcrypt.genSalt(10);
            const senhaComPepper = process.env.PEPPER_SENHA_PESSOA + PessoaSenha.trim();
            const senhaHash = await bcrypt.hash(senhaComPepper, salt);

            // Criar pessoa
            const pessoa = await prisma.pessoa.create({
                data: {
                    UnidadeId: parseInt(UnidadeId),
                    PessoaNome: PessoaNome.trim(),
                    PessoaEmail: PessoaEmail?.trim() || null,
                    PessoaTelefone: PessoaTelefone?.trim() || null,
                    PessoaCPF: PessoaCPF.trim(),
                    PessoaSenha: senhaHash,
                    PessoaStatus: PessoaStatus || 'ATIVA',
                    PessoadtCadastro: getBrasilDateTime()
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
            const { PessoaSenha: _, ...pessoaSemSenha } = pessoa;

            res.status(201).json({
                message: 'Pessoa cadastrada com sucesso',
                data: pessoaSemSenha
            });

        } catch (error) {
            console.error('Erro ao cadastrar pessoa:', error);
            res.status(500).json({ error: 'Erro ao cadastrar pessoa' });
        }
    }

    // Alterar pessoa (gestor da mesma unidade OU a própria pessoa)
    async alterarPessoa(req, res) {
        try {
            const { id } = req.params;
            const {
                UnidadeId,
                PessoaNome,
                PessoaEmail,
                PessoaTelefone,
                PessoaCPF,
                PessoaSenha,
                PessoaStatus
            } = req.body;

            const usuarioLogado = req.usuario;
            const pessoaId = id;

            if (!pessoaId) {
                return res.status(400).json({ error: 'ID da pessoa é obrigatório' });
            }

            // Buscar pessoa a ser alterada
            const pessoaAlterar = await prisma.pessoa.findUnique({
                where: { PessoaId: pessoaId },
                include: {
                    Unidade: true
                }
            });

            if (!pessoaAlterar) {
                return res.status(404).json({ error: 'Pessoa não encontrada' });
            }

            // Verificar permissões
            let podeAlterar = false;
            let gestorLogado = null;

            // Caso 1: A própria pessoa alterando seus dados
            if (usuarioLogado.usuarioTipo === 'PESSOA' && usuarioLogado.usuarioId === pessoaId) {
                podeAlterar = true;

                // Pessoa não pode alterar próprio status (para não se inativar)
                if (PessoaStatus !== undefined) {
                    return res.status(403).json({
                        error: 'Você não pode alterar seu próprio status'
                    });
                }

                // Pessoa não pode alterar unidade
                if (UnidadeId !== undefined) {
                    return res.status(403).json({
                        error: 'Você não pode alterar sua unidade'
                    });
                }
            }

            // Caso 2: Gestor alterando
            else if (usuarioLogado.usuarioTipo === 'GESTOR') {
                gestorLogado = await prisma.gestor.findUnique({
                    where: { GestorId: usuarioLogado.usuarioId, GestorStatus: 'ATIVO' }
                });

                if (!gestorLogado) {
                    return res.status(403).json({ error: 'Gestor não encontrado' });
                }

                // Verificar se gestor está ativo
                if (gestorLogado.GestorStatus !== 'ATIVO') {
                    return res.status(403).json({
                        error: 'Seu usuário gestor está inativo. Não é possível alterar pessoas.'
                    });
                }

                // Gestor só pode alterar pessoas da sua unidade
                if (gestorLogado.UnidadeId !== pessoaAlterar.UnidadeId) {
                    return res.status(403).json({
                        error: 'Você só pode alterar pessoas da sua própria unidade'
                    });
                }

                // Verificar se a unidade do gestor está ativa
                const unidadeGestor = await prisma.unidade.findUnique({
                    where: { UnidadeId: gestorLogado.UnidadeId }
                });

                if (unidadeGestor.UnidadeStatus !== 'ATIVA') {
                    return res.status(403).json({
                        error: 'Sua unidade está inativa. Não é possível alterar pessoas.'
                    });
                }

                podeAlterar = true;
            }

            if (!podeAlterar) {
                return res.status(403).json({
                    error: 'Você não tem permissão para alterar esta pessoa'
                });
            }

            // Preparar dados para atualização
            const dadosAtualizacao = {};

            // Validar e adicionar campos
            if (UnidadeId !== undefined && usuarioLogado.usuarioTipo === 'GESTOR') {
                // Apenas gestor pode alterar unidade
                if (gestorLogado.UnidadeId !== parseInt(UnidadeId)) {
                    return res.status(403).json({
                        error: 'Você só pode transferir pessoas para sua própria unidade'
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
                        error: 'Não é possível transferir pessoa para uma unidade inativa ou bloqueada'
                    });
                }

                dadosAtualizacao.UnidadeId = parseInt(UnidadeId);
            }

            if (PessoaNome !== undefined) {
                if (!PessoaNome.trim()) {
                    return res.status(400).json({ error: 'Nome da pessoa não pode ser vazio' });
                }
                dadosAtualizacao.PessoaNome = PessoaNome.trim();
            }

            if (PessoaEmail !== undefined) {
                if (PessoaEmail && PessoaEmail.trim()) {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(PessoaEmail.trim())) {
                        return res.status(400).json({ error: 'E-mail inválido' });
                    }
                }
                dadosAtualizacao.PessoaEmail = PessoaEmail?.trim() || null;
            }

            if (PessoaTelefone !== undefined) {
                dadosAtualizacao.PessoaTelefone = PessoaTelefone?.trim() || null;
            }

            if (PessoaCPF !== undefined && usuarioLogado.usuarioTipo === 'GESTOR') {
                // Apenas gestor pode alterar CPF
                if (!PessoaCPF.trim()) {
                    return res.status(400).json({ error: 'CPF não pode ser vazio' });
                }

                // Verificar se CPF já existe para outra pessoa
                const cpfExistente = await prisma.pessoa.findFirst({
                    where: {
                        PessoaCPF: PessoaCPF.trim(),
                        PessoaId: { not: pessoaId }
                    }
                });

                if (cpfExistente) {
                    return res.status(409).json({ error: 'CPF já cadastrado para outra pessoa' });
                }

                dadosAtualizacao.PessoaCPF = PessoaCPF.trim();
            }

            if (PessoaSenha !== undefined) {
                if (!PessoaSenha.trim()) {
                    return res.status(400).json({ error: 'Senha não pode ser vazia' });
                }
                if (PessoaSenha.trim().length < 6) {
                    return res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres' });
                }
                const salt = await bcrypt.genSalt(10);
                const senhaComPepper = process.env.PEPPER_SENHA_PESSOA + PessoaSenha.trim();
                dadosAtualizacao.PessoaSenha = await bcrypt.hash(senhaComPepper, salt);
            }

            if (PessoaStatus !== undefined && usuarioLogado.usuarioTipo === 'GESTOR') {
                // Apenas gestor pode alterar status
                const statusValidos = ['ATIVA', 'INATIVA', 'BLOQUEADA'];
                if (!statusValidos.includes(PessoaStatus)) {
                    return res.status(400).json({
                        error: 'Status inválido. Use: ATIVA, INATIVA ou BLOQUEADA'
                    });
                }
                dadosAtualizacao.PessoaStatus = PessoaStatus;
            }

            // Verificar se há dados para atualizar
            if (Object.keys(dadosAtualizacao).length === 0) {
                return res.status(400).json({ error: 'Nenhum dado fornecido para atualização' });
            }

            // Atualizar pessoa
            const pessoaAtualizada = await prisma.pessoa.update({
                where: { PessoaId: pessoaId },
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
            const { PessoaSenha: _, ...pessoaSemSenha } = pessoaAtualizada;

            res.status(200).json({
                message: 'Pessoa atualizada com sucesso',
                data: pessoaSemSenha
            });

        } catch (error) {
            console.error('Erro ao alterar pessoa:', error);
            res.status(500).json({ error: 'Erro ao alterar pessoa' });
        }
    }

    // Listar pessoas com filtros (gestores veem todas da unidade, pessoa vê apenas seus dados)
    async listarPessoas(req, res) {
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
            if (usuarioLogado.usuarioTipo === 'PESSOA') {
                // Pessoa só vê seus próprios dados
                filtro.PessoaId = usuarioLogado.usuarioId;
            }
            else if (usuarioLogado.usuarioTipo === 'GESTOR') {
                const gestorLogado = await prisma.gestor.findUnique({
                    where: { GestorId: usuarioLogado.usuarioId, GestorStatus: 'ATIVO' }
                });

                if (gestorLogado) {
                    // Gestor só vê pessoas da sua unidade
                    filtro.UnidadeId = gestorLogado.UnidadeId;
                }
            }

            // Aplicar filtros da query (apenas para gestores)
            if (usuarioLogado.usuarioTipo === 'GESTOR') {
                if (unidadeId) {
                    // Verificar se o gestor tem permissão para esta unidade
                    const gestorLogado = await prisma.gestor.findUnique({
                        where: { GestorId: usuarioLogado.usuarioId, GestorStatus: 'ATIVO' }
                    });

                    if (gestorLogado && gestorLogado.UnidadeId === parseInt(unidadeId)) {
                        filtro.UnidadeId = parseInt(unidadeId);
                    }
                }

                if (status) {
                    const statusValidos = ['ATIVA', 'INATIVA', 'BLOQUEADA'];
                    if (!statusValidos.includes(status)) {
                        return res.status(400).json({
                            error: 'Status inválido. Use: ATIVA, INATIVA ou BLOQUEADA'
                        });
                    }
                    filtro.PessoaStatus = status;
                }

                if (nome) {
                    filtro.PessoaNome = {
                        contains: nome,
                        mode: 'insensitive'
                    };
                }
            }

            // Calcular paginação
            const paginaAtual = parseInt(pagina);
            const limitePorPagina = parseInt(limite);
            const skip = (paginaAtual - 1) * limitePorPagina;

            // Buscar pessoas
            const [pessoas, total] = await prisma.$transaction([
                prisma.pessoa.findMany({
                    where: filtro,
                    orderBy: [
                        { PessoaNome: 'asc' }
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
                                Chamado: true
                            }
                        }
                    }
                }),
                prisma.pessoa.count({ where: filtro })
            ]);

            // Remover senhas
            const pessoasSemSenha = pessoas.map(pessoa => {
                const { PessoaSenha: _, ...pessoaSemSenha } = pessoa;
                return pessoaSemSenha;
            });

            res.status(200).json({
                data: pessoasSemSenha,
                paginacao: {
                    paginaAtual,
                    limitePorPagina,
                    totalRegistros: total,
                    totalPaginas: Math.ceil(total / limitePorPagina)
                }
            });

        } catch (error) {
            console.error('Erro ao listar pessoas:', error);
            res.status(500).json({ error: 'Erro ao listar pessoas' });
        }
    }

    // Buscar pessoa por ID
    async buscarPessoaPorId(req, res) {
        try {
            const { id } = req.params;
            const usuarioLogado = req.usuario;

            const pessoaId = id;
            if (!pessoaId) {
                return res.status(400).json({ error: 'ID da pessoa é obrigatório' });
            }

            // Buscar pessoa
            const pessoa = await prisma.pessoa.findUnique({
                where: { PessoaId: pessoaId },
                include: {
                    Unidade: {
                        select: {
                            UnidadeId: true,
                            UnidadeNome: true,
                            UnidadeStatus: true
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
                        take: 10 // Últimos 10 chamados
                    }
                }
            });

            if (!pessoa) {
                return res.status(404).json({ error: 'Pessoa não encontrada' });
            }

            // Verificar permissão de visualização
            if (usuarioLogado.usuarioTipo === 'PESSOA') {
                // Pessoa só pode ver seus próprios dados
                if (usuarioLogado.usuarioId !== pessoaId) {
                    return res.status(403).json({
                        error: 'Você só pode visualizar seus próprios dados'
                    });
                }
            }
            else if (usuarioLogado.usuarioTipo === 'GESTOR') {
                const gestorLogado = await prisma.gestor.findUnique({
                    where: { GestorId: usuarioLogado.usuarioId, GestorStatus: 'ATIVO' }
                });

                if (gestorLogado && gestorLogado.UnidadeId !== pessoa.UnidadeId) {
                    return res.status(403).json({
                        error: 'Você só pode visualizar pessoas da sua própria unidade'
                    });
                }
            }

            // Remover senha do retorno
            const { PessoaSenha: _, ...pessoaSemSenha } = pessoa;

            res.status(200).json({
                data: pessoaSemSenha
            });

        } catch (error) {
            console.error('Erro ao buscar pessoa:', error);
            res.status(500).json({ error: 'Erro ao buscar pessoa' });
        }
    }

    // Alterar apenas status da pessoa (apenas gestor)
    async alterarStatusPessoa(req, res) {
        try {
            const { id } = req.params;
            const { PessoaStatus } = req.body;
            const usuarioLogado = req.usuario;

            const pessoaId = id;
            if (!pessoaId) {
                return res.status(400).json({ error: 'ID da pessoa é obrigatório' });
            }

            // Validar status
            if (!PessoaStatus) {
                return res.status(400).json({ error: 'Status é obrigatório' });
            }

            const statusValidos = ['ATIVA', 'INATIVA', 'BLOQUEADA'];
            if (!statusValidos.includes(PessoaStatus)) {
                return res.status(400).json({
                    error: 'Status inválido. Use: ATIVA, INATIVA ou BLOQUEADA'
                });
            }

            // Verificar se o usuário é GESTOR
            if (usuarioLogado.usuarioTipo !== 'GESTOR') {
                return res.status(403).json({
                    error: 'Apenas gestores podem alterar status de pessoas'
                });
            }

            // Buscar gestor logado
            const gestorLogado = await prisma.gestor.findUnique({
                where: { GestorId: usuarioLogado.usuarioId, GestorStatus: 'ATIVO' }
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

            // Buscar pessoa a ser alterada
            const pessoaExistente = await prisma.pessoa.findUnique({
                where: { PessoaId: pessoaId },
                include: {
                    Unidade: true
                }
            });

            if (!pessoaExistente) {
                return res.status(404).json({ error: 'Pessoa não encontrada' });
            }

            // Verificar se o gestor pertence à mesma unidade da pessoa
            if (gestorLogado.UnidadeId !== pessoaExistente.UnidadeId) {
                return res.status(403).json({
                    error: 'Você só pode alterar status de pessoas da sua própria unidade'
                });
            }

            // Verificar se a unidade está ativa
            if (pessoaExistente.Unidade.UnidadeStatus !== 'ATIVA') {
                return res.status(400).json({
                    error: 'Não é possível alterar status de pessoas de uma unidade inativa ou bloqueada'
                });
            }

            // Se for inativar/bloquear, verificar se existem chamados em aberto
            if (PessoaStatus === 'INATIVA' || PessoaStatus === 'BLOQUEADA') {
                const chamadosAbertos = await prisma.chamado.count({
                    where: {
                        PessoaId: pessoaId,
                        ChamadoStatus: {
                            in: ['PROCESSAMENTO', 'PENDENTE', 'ANALISADO', 'ATRIBUIDO', 'EMATENDIMENTO']
                        }
                    }
                });

                if (chamadosAbertos > 0) {
                    return res.status(400).json({
                        error: 'Não é possível inativar/bloquear uma pessoa com chamados em aberto'
                    });
                }
            }

            // Atualizar apenas status
            const pessoaAtualizada = await prisma.pessoa.update({
                where: { PessoaId: pessoaId },
                data: { PessoaStatus: PessoaStatus },
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
            const { PessoaSenha: _, ...pessoaSemSenha } = pessoaAtualizada;

            res.status(200).json({
                message: 'Status da pessoa atualizado com sucesso',
                data: pessoaSemSenha
            });

        } catch (error) {
            console.error('Erro ao alterar status da pessoa:', error);
            res.status(500).json({ error: 'Erro ao alterar status da pessoa' });
        }
    }

    // Listar pessoas por unidade (para uso em selects)
    async listarPessoasPorUnidade(req, res) {
        try {
            const { unidadeId } = req.params;
            const { apenasAtivos } = req.query;
            const usuarioLogado = req.usuario;

            const unidadeIdInt = parseInt(unidadeId);
            if (isNaN(unidadeIdInt)) {
                return res.status(400).json({ error: 'ID da unidade inválido' });
            }

            // Verificar permissão
            if (usuarioLogado.usuarioTipo === 'GESTOR') {
                const gestorLogado = await prisma.gestor.findUnique({
                    where: { GestorId: usuarioLogado.usuarioId, GestorStatus: 'ATIVO' }
                });

                if (gestorLogado && gestorLogado.UnidadeId !== unidadeIdInt) {
                    return res.status(403).json({
                        error: 'Você só pode visualizar pessoas da sua própria unidade'
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

            if (apenasAtivos === 'true') {
                filtro.PessoaStatus = 'ATIVA';
            }

            // Buscar pessoas
            const pessoas = await prisma.pessoa.findMany({
                where: filtro,
                orderBy: {
                    PessoaNome: 'asc'
                },
                select: {
                    PessoaId: true,
                    PessoaNome: true,
                    PessoaEmail: true,
                    PessoaTelefone: true,
                    PessoaStatus: true,
                    _count: {
                        select: {
                            Chamado: true
                        }
                    }
                }
            });

            res.status(200).json({
                data: pessoas
            });

        } catch (error) {
            console.error('Erro ao listar pessoas por unidade:', error);
            res.status(500).json({ error: 'Erro ao listar pessoas por unidade' });
        }
    }
}

module.exports = new PessoaController();