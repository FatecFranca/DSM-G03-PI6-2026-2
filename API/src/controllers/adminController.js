// src/controllers/adminController.js
const prisma = require('../prisma.js');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { gravarLog } = require('../utils/logGrava.js');

class AdminController {

    // Login do administrador
    async login(req, res) {
        try {
            //console.log('Body recebido:', req.body);
            const { AdministradorUsuario, AdministradorSenha } = req.body;

            // Validações básicas
            if (!AdministradorUsuario || !AdministradorUsuario.trim()) {
                return res.status(400).json({ error: 'Usuário é obrigatório' });
            }

            if (!AdministradorSenha || !AdministradorSenha.trim()) {
                return res.status(400).json({ error: 'Senha é obrigatória' });
            }

            // Sempre UPPERCASE
            const usuarioTrim = AdministradorUsuario.trim().toUpperCase();

            // Buscar administrador pelo usuário
            const administrador = await prisma.administrador.findUnique({
                where: { AdministradorUsuario: usuarioTrim, AdministradorStatus: 'ATIVO' }
            });

            if (!administrador) {
                return res.status(400).json({ error: 'Usuário ou senha inválidos' });
            }

            // Verificar senha (aplicando o pepper antes de comparar)
            const senhaComPepper = process.env.PEPPER_SENHA_ADMIN + AdministradorSenha.trim();
            const senhaValida = await bcrypt.compare(senhaComPepper, administrador.AdministradorSenha);

            if (!senhaValida) {
                return res.status(400).json({ error: 'Usuário ou senha inválidos' });
            }

            // Gerar token JWT
            const token = jwt.sign(
                {
                    usuarioId: administrador.AdministradorId,
                    usuarioTipo: 'ADMINISTRADOR',
                    usuarioEmail: administrador.AdministradorUsuario
                },
                process.env.JWT_SECRET,
                { expiresIn: '8h' }
            );

            // Retornar dados do admin (sem a senha)
            const adminSemSenha = {
                AdministradorId: administrador.AdministradorId,
                AdministradorUsuario: administrador.AdministradorUsuario,
                AdministradorNome: administrador.AdministradorNome
            };

            // --- Gravar alteração de status de vinculo de unidade e tipo de suporte
            const LogAcao = 'LOGINADMINISTRADOR';
            const LogDetelhe = 'Foi realizado login polo administrador de ID (' + adminSemSenha.AdministradorId + ')';
            await gravarLog('', LogAcao, 'SISTEMA', LogDetelhe, String(adminSemSenha.AdministradorId).trim());
            // ---

            return res.status(200).json({
                message: 'Login realizado com sucesso',
                data: {
                    usuario: adminSemSenha,
                    token,
                    tipo: 'ADMINISTRADOR'
                }
            });

        } catch (error) {
            console.error('Erro no login do administrador:', error);
            return res.status(500).json({ error: 'Erro no login do administrador' });
        }
    }

    // Alterar dados do admin
    async alterarAdmin(req, res) {
        try {
            const { AdministradorUsuario, AdministradorSenha, AdministradorSenhaAtual, AdministradorNome } = req.body;

            // Verificar se o usuário é ADMINISTRADOR
            if (req.usuario.usuarioTipo !== 'ADMINISTRADOR') {
                return res.status(403).json({ error: 'Apenas administradores podem acessar esta rota' });
            }

            const usuarioId = req.usuario.usuarioId;

            if (!usuarioId) {
                return res.status(401).json({ error: 'Usuário não autenticado' });
            }

            // Validações
            if (!AdministradorUsuario || !AdministradorUsuario.trim()) {
                return res.status(400).json({ error: 'Usuário é obrigatório' });
            }

            if (!AdministradorSenhaAtual || !AdministradorSenhaAtual.trim()) {
                return res.status(400).json({ error: 'Senha atual é obrigatória' });
            }

            // Buscar admin atual para verificar senha
            const adminAtual = await prisma.administrador.findUnique({
                where: { AdministradorId: usuarioId }
            });

            if (!adminAtual) {
                return res.status(404).json({ error: 'Administrador não encontrado' });
            }

            // Verificar se a senha atual está correta (aplicando o pepper)
            const senhaAtualComPepper = process.env.PEPPER_SENHA_ADMIN + AdministradorSenhaAtual.trim();
            const senhaAtualValida = await bcrypt.compare(senhaAtualComPepper, adminAtual.AdministradorSenha);

            if (!senhaAtualValida) {
                return res.status(400).json({ error: 'Senha atual incorreta' });
            }

            // Verificar se o novo usuário já existe (se for diferente do atual)
            if (AdministradorUsuario.trim().toUpperCase() !== adminAtual.AdministradorUsuario) {
                const usuarioExistente = await prisma.administrador.findUnique({
                    where: { AdministradorUsuario: AdministradorUsuario.trim().toUpperCase() }
                });

                if (usuarioExistente) {
                    return res.status(409).json({ error: 'Nome de usuário já está em uso' });
                }
            }

            // Preparar dados para atualização
            const dadosAtualizacao = {
                AdministradorUsuario: AdministradorUsuario.trim().toUpperCase()
            };

            // Se uma nova senha foi fornecida, atualizar
            if (AdministradorSenha && AdministradorSenha.trim()) {
                if (AdministradorSenha.trim().length < 6) {
                    return res.status(400).json({ error: 'A nova senha deve ter no mínimo 6 caracteres' });
                }

                const senhaComPepper = process.env.PEPPER_SENHA_ADMIN + AdministradorSenha.trim();
                const salt = await bcrypt.genSalt(10);
                dadosAtualizacao.AdministradorSenha = await bcrypt.hash(senhaComPepper, salt);
            }

            // Sem validação de nulicidade pois pode ser nulo
            dadosAtualizacao.AdministradorNome = AdministradorNome;

            // Atualizar admin
            const administradorAtualizado = await prisma.administrador.update({
                where: { AdministradorId: usuarioId },
                data: dadosAtualizacao
            });

            // Retornar dados sem senha
            const { AdministradorSenha: removerSenha1, ...adminSemSenha } = administradorAtualizado;
            const { AdministradorSenha: removerSenha2, ...adminAntesSemSenha } = adminAtual;

            // --- Gravar alteração de status de vinculo de unidade e tipo de suporte
            const LogAcao = 'ALTERARADMINISTRADOR';
            const LogDetelhe = 'Foram alterados os dados do administrador de ID (' + adminSemSenha.AdministradorId + '), dados antes da alteração (' + JSON.stringify(adminAntesSemSenha) + '), dados depois da alteração (' + JSON.stringify(adminSemSenha) + ')';
            await gravarLog('', LogAcao, 'SISTEMA', LogDetelhe, String(adminSemSenha.AdministradorId).trim());
            // ---

            return res.status(200).json({
                message: 'Dados atualizados com sucesso',
                data: adminSemSenha
            });

        } catch (error) {
            console.error('Erro ao alterar administrador:', error);
            return res.status(500).json({ error: 'Erro ao alterar administrador' });
        }
    }

    // Dashboard para o administrado
    async dashboard(req, res) {
        try {
            // Verificar se o usuário é ADMINISTRADOR
            if (req.usuario.usuarioTipo !== 'ADMINISTRADOR') {
                return res.status(403).json({
                    error: 'Apenas administradores podem acessar essa rota'
                });
            }

            // Verificar se o usuário está cadastrado
            const usuarioId = req.usuario.usuarioId;
            if (!usuarioId) {
                return res.status(401).json({
                    error: 'Usuário não autenticado'
                });
            }

            const administrador = await prisma.administrador.findFirst({
                where: {
                    AdministradorId: usuarioId
                }
            });

            if (!administrador) {
                return res.status(404).json({
                    error: 'Usuário não encontrado'
                });
            }


            // Contar o total de unidades ativas
            const totalUnidadesAtivas = await prisma.unidade.count({
                where: {
                    UnidadeStatus: 'ATIVA'
                }
            });

            // Contar o total de unidades inativas
            const totalUnidadesInativas = await prisma.unidade.count({
                where: {
                    OR:
                    [
                        {
                            UnidadeStatus: 'INATIVA'
                        },
                        {
                            UnidadeStatus: 'BLOQUEADA'
                        }
                    ]
                }
            });

            const totalPessoas = await prisma.pessoa.count();

            const totalTecnicos = await prisma.tecnico.count();

            const totalEquipes = await prisma.equipe.count();

            const totalGestores = await prisma.gestor.count();

            const totalChamados = await prisma.chamado.count();

            const totalAtividades = await prisma.atividadeChamado.count();

            const totalTiposSuporte = await prisma.tipoSuporte.count();

            const totalDepartamentos = await prisma.departamento.count();

            return res.status(200).json({
                data: {
                    totalUnidadesAtivas,
                    totalUnidadesInativas,
                    totalPessoas,
                    totalTecnicos,
                    totalChamados,
                    totalAtividades,
                    totalTiposSuporte,
                    totalDepartamentos,
                    totalEquipes,
                    totalGestores
                }
            });


        } catch (error) {
            console.error('Erro ao montar dashboardo administrador:', error);
            return res.status(500).json({
                error: 'Erro ao montar dashboardo administrador'
            });
        }

    }

}

module.exports = new AdminController();