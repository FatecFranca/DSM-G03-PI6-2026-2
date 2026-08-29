// src/controllers/gestorController.js
const prisma = require('../prisma.js');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { gravarLog } = require('../utils/logGrava.js');
const { getBrasilDateTime } = require('../utils/dataBrasilObter.js');

/**
 * Gera usuário para Gestor ADMINUNIDADE
 * Formato: GM + {letrasUnidade} + {numeroUnidade} + {letrasContador} + {numeroContador}
 * 
 * Exemplos:
 * - Unidade 1, 1º ADMIN: GMAA001AAA001
 * - Unidade 1, 2º ADMIN: GMAA001AAA002
 * - Unidade 1, 999º ADMIN: GMAA001AAA999
 * - Unidade 1, 1000º ADMIN: GMAA001AAB001
 * - Unidade 1000, 1º ADMIN: GMAB001AAA001
 */
async function gerarUsuarioAdmUnidade(unidadeId) {
    // 1. Calcular a parte fixa da UNIDADE (ex: AA001, AB001, ...)
    const letrasUnidade = await calcularLetrasParaUnidade(unidadeId);
    const numeroUnidade = await formatarNumero(unidadeId);
    const parteUnidade = `${letrasUnidade}${numeroUnidade}`;

    // 2. Buscar todos os gestores ADMINUNIDADE da unidade para determinar o próximo contador
    const gestoresAdm = await prisma.gestor.findMany({
        where: {
            UnidadeId: unidadeId,
            GestorNivel: 'ADMINUNIDADE'
        },
        orderBy: {
            GestorId: 'asc'
        }
    });

    // 3. Calcular o próximo número de contador (baseado na quantidade existente)
    const contador = gestoresAdm.length + 1;

    // 4. Calcular a parte do CONTADOR
    const letrasContador = await calcularLetrasParaNumero(contador, 3);
    const numeroContador = await calcularNumeroContador(contador);
    const parteContador = `${letrasContador}${numeroContador}`;

    // 5. Montar o usuário final
    return `GM${parteUnidade}${parteContador}`;
}

/**
 * Gera usuário para Gestor COMUM
 * Formato: G + {letrasUnidade} + {numeroUnidade} + {letrasContador} + {numeroContador}
 * 
 * Exemplos:
 * - Unidade 1, 1º gestor: GAA001AAA001
 * - Unidade 1, 2º gestor: GAA001AAA002
 * - Unidade 1, 999º gestor: GAA001AAA999
 * - Unidade 1, 1000º gestor: GAA001AAB001
 * - Unidade 1, 1001º gestor: GAA001AAB002
 * - Unidade 1, 1999º gestor: GAA001AAB999
 * - Unidade 1, 2000º gestor: GAA001AAC001
 */
async function gerarUsuarioGestorComum(unidadeId) {
    // 1. Calcular a parte fixa da UNIDADE (ex: AA001, AB001, ...)
    const letrasUnidade = await calcularLetrasParaUnidade(unidadeId);
    const numeroUnidade = await formatarNumero(unidadeId);
    const parteUnidade = `${letrasUnidade}${numeroUnidade}`;

    // 2. Buscar todos os gestores COMUM da unidade para determinar o próximo contador
    const gestoresComum = await prisma.gestor.findMany({
        where: {
            UnidadeId: unidadeId,
            GestorNivel: 'COMUM'
        },
        orderBy: {
            GestorId: 'asc'
        }
    });

    // 3. Calcular o próximo número de contador (baseado na quantidade existente)
    const contador = gestoresComum.length + 1;

    // 4. Calcular a parte do CONTADOR
    // As letras são baseadas no contador (1, 2, 3, ...)
    const letrasContador = await calcularLetrasParaNumero(contador, 3);
    // O número é o resto da divisão por 999 (vai de 1 a 999)
    const numeroContador = await calcularNumeroContador(contador);
    const parteContador = `${letrasContador}${numeroContador}`;

    // 5. Montar o usuário final
    return `G${parteUnidade}${parteContador}`;
}

/**
 * Calcula as letras para a UNIDADE (AA, AB, AC, ..., ZZ)
 * Baseado no ID da unidade
 * 
 * Exemplos:
 * - Unidade 1: AA
 * - Unidade 999: AA (ainda é AA, pois 999 < 1000)
 * - Unidade 1000: AB
 * - Unidade 1999: AB
 * - Unidade 2000: AC
 * - Unidade 25999: AA (25999 / 999 = 26, mas AA é 0)
 * - Unidade 26000: AB (26000 / 999 = 26, mas AB é 1)
 */
async function calcularLetrasParaUnidade(unidadeId) {
    const alfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const base = alfabeto.length;
    
    // Calcular quantos grupos de 999 já passaram
    const grupo = Math.floor((unidadeId - 1) / 999);
    let num = grupo;
    let letras = '';
    
    for (let i = 0; i < 2; i++) {
        const resto = num % base;
        letras = alfabeto[resto] + letras;
        num = Math.floor(num / base);
    }
    
    return letras;
}

/**
 * Calcula as letras para o CONTADOR (AAA, AAB, ..., ZZZ)
 * Baseado no bloco do contador (cada bloco tem 999 números)
 * 
 * Exemplos:
 * - 1º gestor (contador = 1): bloco = 0 → AAA, número = 001
 * - 999º gestor (contador = 999): bloco = 0 → AAA, número = 999
 * - 1000º gestor (contador = 1000): bloco = 1 → AAB, número = 001
 * - 1999º gestor (contador = 1999): bloco = 1 → AAB, número = 999
 * - 2000º gestor (contador = 2000): bloco = 2 → AAC, número = 001
 */
async function calcularLetrasParaNumero(contador, tamanho = 3) {
    const alfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const base = alfabeto.length;
    
    // Calcular o bloco: a cada 999 gestores, sobe 1 bloco
    // contador 1-999 → bloco 0
    // contador 1000-1999 → bloco 1
    // contador 2000-2999 → bloco 2
    const bloco = Math.floor((contador - 1) / 999);
    
    let num = bloco;
    let resultado = '';
    
    for (let i = 0; i < tamanho; i++) {
        const resto = num % base;
        resultado = alfabeto[resto] + resultado;
        num = Math.floor(num / base);
    }
    
    return resultado;
}

/**
 * Calcula o número formatado para o CONTADOR
 * O número vai de 001 a 999, resetando a cada bloco
 */
async function calcularNumeroContador(contador) {
    // O número vai de 1 a 999
    const numero = ((contador - 1) % 999) + 1;
    return formatarNumero(numero);
}

/**
 * Formata um número para 3 dígitos com zeros à esquerda
 */
async function formatarNumero(numero) {
    return String(numero).padStart(3, '0');
}

/**
 * Gera um usuário único (em caso de colisão)
 */
async function gerarUsuarioUnico(usuarioBase, nivel, unidadeId) {
    let tentativa = 1;
    let usuario = usuarioBase;
    let existe = await prisma.gestor.findUnique({
        where: { GestorUsuario: usuario }
    });

    while (existe) {
        if (nivel === 'ADMINUNIDADE') {
            // Para ADMINUNIDADE, tentar com número diferente
            const numeros = ['001', '002', '003', '004', '005', '006', '007', '008', '009'];
            if (tentativa <= numeros.length) {
                usuario = usuarioBase.substring(0, 7) + numeros[tentativa - 1];
            } else {
                // Se todas as tentativas falharem, usar timestamp
                usuario = `${usuarioBase}_${Date.now()}`;
            }
        } else {
            // Para COMUM, adicionar um sufixo
            usuario = `${usuarioBase}_${tentativa}`;
        }

        existe = await prisma.gestor.findUnique({
            where: { GestorUsuario: usuario }
        });
        tentativa++;
    }

    return usuario;
}

/**
 * Garante que o usuário gerado seja único
 */
async function garantirUsuarioUnico(usuarioBase, gestorIdIgnorar = null) {
    let usuario = usuarioBase;
    let tentativa = 1;
    let existe = await prisma.gestor.findFirst({
        where: {
            GestorUsuario: usuario,
            ...(gestorIdIgnorar && { GestorId: { not: gestorIdIgnorar } })
        }
    });

    while (existe) {
        // Tentar com variações
        if (usuarioBase.includes('GM')) {
            // ADMINUNIDADE: tentar números alternativos
            const numeros = ['001', '002', '003', '004', '005', '006', '007', '008', '009'];
            if (tentativa <= numeros.length) {
                usuario = usuarioBase.substring(0, 7) + numeros[tentativa - 1];
            } else {
                usuario = `${usuarioBase}_${tentativa}`;
            }
        } else {
            usuario = `${usuarioBase}_${tentativa}`;
        }

        existe = await prisma.gestor.findFirst({
            where: {
                GestorUsuario: usuario,
                ...(gestorIdIgnorar && { GestorId: { not: gestorIdIgnorar } })
            }
        });
        tentativa++;
    }

    return usuario;
}

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
                    GestorUsuario: GestorUsuario.toUpperCase().trim(), GestorStatus: 'ATIVO'
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

            // --- Gravar log de alteração
            const LogAcao = 'LOGINGESTOR';
            const LogDetelhe = 'Foi realizado login com o usuário gestor (' + gestorSemSenha.GestorUsuario + ')';
            await gravarLog('', LogAcao, 'SISTEMA', LogDetelhe, gestorSemSenha.GestorId);
            // ---

            return res.status(200).json({
                message: 'Login realizado com sucesso',
                data: {
                    usuario: gestorSemSenha,
                    token,
                    tipo: 'GESTOR'
                }
            });

        } catch (error) {
            console.error('Erro no login do gestor:', error);
            return res.status(500).json({
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
            }
            else if (usuarioLogado.usuarioTipo === 'GESTOR') {
                const gestorLogado = await prisma.gestor.findUnique({
                    where: { GestorId: usuarioLogado.usuarioId, GestorStatus: 'ATIVO' }
                });

                if (!gestorLogado) {
                    return res.status(403).json({
                        error: 'Gestor não encontrado'
                    });
                }

                if (gestorLogado.GestorNivel !== 'ADMINUNIDADE') {
                    return res.status(403).json({
                        error: 'Apenas gestores ADMINUNIDADE podem cadastrar novos gestores'
                    });
                }

                if (GestorNivel === 'ADMINUNIDADE') {
                    return res.status(403).json({
                        error: 'Gestores ADMINUNIDADE não podem cadastrar outros administradores de unidade'
                    });
                }

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

            // ========== GERAR USUÁRIO AUTOMATICAMENTE ==========
            let gestorUsuario = '';
            const unidadeId = parseInt(UnidadeId);

            if (GestorNivel === 'ADMINUNIDADE') {
                gestorUsuario = await gerarUsuarioAdmUnidade(unidadeId);
            } else {
                // Gestor COMUM
                gestorUsuario = await gerarUsuarioGestorComum(unidadeId);
            }

            // Verificar se o usuário gerado já existe (evitar colisão)
            const usuarioExistente = await prisma.gestor.findUnique({
                where: { GestorUsuario: gestorUsuario }
            });

            if (usuarioExistente) {
                // Se já existe, gerar outro (recursivo ou com tentativa)
                gestorUsuario = await await gerarUsuarioUnico(gestorUsuario, GestorNivel, unidadeId);
            }

            // Criptografar senha
            const salt = await bcrypt.genSalt(10);
            const senhaComPepper = process.env.PEPPER_SENHA_GESTOR + GestorSenha.trim();
            const senhaHash = await bcrypt.hash(senhaComPepper, salt);

            // Criar gestor
            const gestor = await prisma.gestor.create({
                data: {
                    UnidadeId: unidadeId,
                    GestorNome: GestorNome.trim(),
                    GestorEmail: GestorEmail?.trim() || null,
                    GestorTelefone: GestorTelefone?.trim() || null,
                    GestorCPF: GestorCPF.trim(),
                    GestorUsuario: gestorUsuario,
                    GestorSenha: senhaHash,
                    GestorNivel: GestorNivel,
                    GestorStatus: GestorStatus || 'ATIVO',
                    GestorDtCadastro: getBrasilDateTime()
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

            // --- Gravar log de criação
            let LogAcao;
            if (GestorNivel === 'ADMINUNIDADE'){
                LogAcao = 'CADASTRARGESTORADM'
            } else {
                LogAcao = 'CADASTRARGESTORCOMUM'
            }
            const LogDetelhe = 'Foi cadastrado o gestor (' + gestorSemSenha.GestorUsuario + ') de ID (' + gestorSemSenha.GestorId + ')';
            await gravarLog(String(usuarioLogado.usuarioId).trim(), LogAcao, usuarioLogado.usuarioTipo, LogDetelhe, gestorSemSenha.GestorId);
            // ---

            return res.status(201).json({
                message: 'Gestor cadastrado com sucesso',
                data: gestorSemSenha,
                usuarioGerado: gestorUsuario
            });

        } catch (error) {
            console.error('Erro ao cadastrar gestor:', error);
            return res.status(500).json({ error: 'Erro ao cadastrar gestor' });
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
                GestorUsuario, // Será ignorado se a unidade mudar
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

                if (isProprioGestor) {
                    podeAlterar = true;
                }
                else {
                    if (gestorLogado.GestorNivel === 'COMUM') {
                        return res.status(403).json({
                            error: 'Gestores comuns não podem alterar dados de outros gestores'
                        });
                    }

                    if (gestorLogado.GestorNivel === 'ADMINUNIDADE') {
                        if (gestorLogado.UnidadeId !== gestorAlterar.UnidadeId) {
                            return res.status(403).json({
                                error: 'Você só pode alterar gestores da sua própria unidade'
                            });
                        }

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
                if (!GestorSenhaAtual || !GestorSenhaAtual.trim()) {
                    return res.status(400).json({
                        error: 'Senha atual é obrigatória para alterar seus dados'
                    });
                }

                const senhaAtualComPepper = process.env.PEPPER_SENHA_GESTOR + GestorSenhaAtual.trim();
                const senhaAtualValida = await bcrypt.compare(senhaAtualComPepper, gestorAlterar.GestorSenha);

                if (!senhaAtualValida) {
                    return res.status(400).json({
                        error: 'Senha atual incorreta'
                    });
                }

                if (GestorNivel !== undefined && GestorNivel !== gestorAlterar.GestorNivel) {
                    return res.status(403).json({
                        error: 'Você não pode alterar seu próprio nível de acesso'
                    });
                }

                if (GestorStatus !== undefined && GestorStatus !== gestorAlterar.GestorStatus) {
                    return res.status(403).json({
                        error: 'Você não pode alterar seu próprio status'
                    });
                }

                if (UnidadeId !== undefined && UnidadeId !== gestorAlterar.UnidadeId) {
                    return res.status(403).json({
                        error: 'Você não pode alterar sua própria unidade'
                    });
                }
            }

            // =============================================
            // VERIFICAR SE A UNIDADE VAI MUDAR
            // =============================================
            const unidadeVaiMudar = UnidadeId !== undefined && UnidadeId !== gestorAlterar.UnidadeId;
            let novaUnidadeId = gestorAlterar.UnidadeId;

            if (unidadeVaiMudar) {
                // Apenas ADMIN pode mudar unidade
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

                novaUnidadeId = parseInt(UnidadeId);
            }

            // =============================================
            // PREPARAR DADOS PARA ATUALIZAÇÃO
            // =============================================
            const dadosAtualizacao = {};

            // =============================================
            // RECALCULAR USUÁRIO SE A UNIDADE MUDOU
            // =============================================
            let novoUsuarioGerado = null;

            if (unidadeVaiMudar) {
                // Se a unidade mudou, recalcular o usuário automaticamente
                dadosAtualizacao.UnidadeId = novaUnidadeId;

                // Gerar novo usuário baseado na nova unidade e nível
                if (gestorAlterar.GestorNivel === 'ADMINUNIDADE') {
                    novoUsuarioGerado = await gerarUsuarioAdmUnidade(novaUnidadeId);
                } else {
                    // Gestor COMUM
                    novoUsuarioGerado = await gerarUsuarioGestorComum(novaUnidadeId);
                }

                // Verificar se o novo usuário já existe (evitar colisão)
                const usuarioExistente = await prisma.gestor.findFirst({
                    where: {
                        GestorUsuario: novoUsuarioGerado,
                        GestorId: { not: gestorId }
                    }
                });

                if (usuarioExistente) {
                    // Se já existe, gerar outro
                    novoUsuarioGerado = await gerarUsuarioUnico(novoUsuarioGerado, gestorAlterar.GestorNivel, novaUnidadeId);
                }

                dadosAtualizacao.GestorUsuario = novoUsuarioGerado;
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

            // CPF (apenas ADMIN e ADMINUNIDADE podem alterar)
            if (usuarioLogado.usuarioTipo === 'ADMINISTRADOR' ||
                (gestorLogado && gestorLogado.GestorNivel === 'ADMINUNIDADE' && !isProprioGestor)) {

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
            }

            // Usuário (apenas ADMIN pode alterar manualmente)
            if (usuarioLogado.usuarioTipo === 'ADMINISTRADOR' && !unidadeVaiMudar) {
                // Se a unidade NÃO mudou, pode alterar o usuário manualmente
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
            }

            // Senha (com pepper)
            if (GestorSenha !== undefined && GestorSenha.trim()) {
                if (GestorSenha.trim().length < 6) {
                    return res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres' });
                }

                if (!isProprioGestor && usuarioLogado.usuarioTipo !== 'ADMINISTRADOR') {
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
                if (usuarioLogado.usuarioTipo !== 'ADMINISTRADOR') {
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

                // Se o nível mudou, recalcular o usuário também
                if (GestorNivel !== gestorAlterar.GestorNivel) {
                    if (GestorNivel === 'ADMINUNIDADE') {
                        const novoUsuario = await gerarUsuarioAdmUnidade(dadosAtualizacao.UnidadeId || novaUnidadeId);
                        dadosAtualizacao.GestorUsuario = await garantirUsuarioUnico(novoUsuario, gestorId);
                    } else {
                        // Mudou para COMUM
                        const novoUsuario = await gerarUsuarioGestorComum(dadosAtualizacao.UnidadeId || novaUnidadeId);
                        dadosAtualizacao.GestorUsuario = await garantirUsuarioUnico(novoUsuario, gestorId);
                    }
                }
            }

            // Status (apenas ADMIN pode alterar)
            if (GestorStatus !== undefined) {
                if (usuarioLogado.usuarioTipo !== 'ADMINISTRADOR') {
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
            const { GestorSenha: semSenha1, ...gestorSemSenha } = gestorAtualizado;
            const { GestorSenha: semSenha2, ...gestorAntesSemSenha } = gestorAlterar;

            const { GestorId: semID1, ...gestorAntesSemSenhaID } = gestorAntesSemSenha;
            const { GestorId: semID2, ...gestorSemSenhaID } = gestorSemSenha;

            // --- Gravar log de alteração
            const LogAcao = 'ALTERARGESTOR';
            const LogDetelhe = 'Foi alterado o Gestor de Usuário Antes da Alteração (' + gestorAntesSemSenhaID.GestorUsuario + ') / Usuário depois da alteração (' + gestorSemSenhaID.GestorUsuario + '), dados antes da alteração (' + JSON.stringify(gestorAntesSemSenhaID) + ')' + ', dados depois da alteração (' + JSON.stringify(gestorSemSenhaID) +  ')';
            await gravarLog(String(usuarioLogado.usuarioId).trim(), LogAcao, usuarioLogado.usuarioTipo, LogDetelhe, gestorSemSenha.GestorId);
            // ---

            return res.status(200).json({
                message: 'Gestor atualizado com sucesso',
                data: gestorSemSenha,
                ...(novoUsuarioGerado && { usuarioRecalculado: novoUsuarioGerado })
            });

        } catch (error) {
            console.error('Erro ao alterar gestor:', error);
            return res.status(500).json({ error: 'Erro ao alterar gestor' });
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
                    where: { GestorId: usuarioLogado.usuarioId, GestorStatus: 'ATIVO' }
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

            return res.status(200).json({
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
            return res.status(500).json({ error: 'Erro ao listar gestores' });
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
                    where: { GestorId: usuarioLogado.usuarioId, GestorStatus: 'ATIVO' }
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

            return res.status(200).json({
                data: gestorSemSenha
            });

        } catch (error) {
            console.error('Erro ao buscar gestor:', error);
            return res.status(500).json({ error: 'Erro ao buscar gestor' });
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
                    where: { GestorId: usuarioLogado.usuarioId, GestorStatus: 'ATIVO' }
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

            // --- Gravar log de alteração
            const LogAcao = 'ALTERARSTATUSGESTOR';
            const LogDetelhe = 'Foi alterado o status do Gestor (' + gestorSemSenha.GestorUsuario + '), de ('+ gestorAlterar.GestorStatus + ' para ' + gestorSemSenha.GestorStatus + ')';
            await gravarLog(String(usuarioLogado.usuarioId), LogAcao, usuarioLogado.usuarioTipo, LogDetelhe, gestorAtualizado.GestorId);
            // ---

            return res.status(200).json({
                message: 'Status do gestor atualizado com sucesso',
                data: gestorSemSenha
            });

        } catch (error) {
            console.error('Erro ao alterar status do gestor:', error);
            return res.status(500).json({ error: 'Erro ao alterar status do gestor' });
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
                where: { GestorId: req.usuario.usuarioId, GestorStatus: 'ATIVO' }
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

            return res.status(200).json({
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
            return res.status(500).json({
                error: 'Erro ao montar dashboardo gestor'
            });
        }

    }
    
}

module.exports = new GestorController();