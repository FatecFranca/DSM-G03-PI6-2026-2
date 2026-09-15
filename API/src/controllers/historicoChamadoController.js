// src/controllers/historicoChamadoController.js
const prisma = require('../prisma.js');

class HistoricoChamadoController {

    // Listar atividades de um chamado
    async historicoPorChamado(req, res) {
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

            let filtroHistorico = {
                ChamadoId: chamadoId
            };

            if (usuarioLogado.usuarioTipo === 'PESSOA') {
                // Pessoa só vê ações dos seus próprios chamados
                podeVisualizar = (chamado.PessoaId === usuarioLogado.usuarioId);

                const pessoa = await prisma.pessoa.findUnique({
                    where: { PessoaId: usuarioLogado.usuarioId, PessoaStatus: 'ATIVA' }
                });

                if (!pessoa) {
                    return res.status(404).json({
                        error: 'Pessoa não encontrada'
                    });
                }

                filtroHistorico.HistChamadoUsuarioVer = 'PESSOA'; // Pessoas só veem ações específicas para elas
            }
            else if (usuarioLogado.usuarioTipo === 'TECNICO') {
                // Técnico vê atividades se pertence à equipe responsável ou é da mesma unidade
                const tecnico = await prisma.tecnico.findUnique({
                    where: { TecnicoId: usuarioLogado.usuarioId, TecnicoStatus: 'ATIVO' }
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
                } else {
                    return res.status(404).json({
                        error: 'Técnico não encontrado'
                    });
                }

                filtroHistorico.HistChamadoUsuarioVer = 'GESTEC'; // Técnicos só veem ações específicas para eles e paragestores em comum
            }
            else if (usuarioLogado.usuarioTipo === 'GESTOR') {
                // Gestor vê atividades dos chamados da sua unidade
                const gestor = await prisma.gestor.findUnique({
                    where: { GestorId: usuarioLogado.usuarioId, GestorStatus: 'ATIVO' }
                });

                if (gestor && gestor.UnidadeId === chamado.UnidadeId) {
                    podeVisualizar = true;
                }

                filtroHistorico.HistChamadoUsuarioVer = 'GESTEC'; // Gestores só veem ações específicas para eles e para técnicos em comum
            }
            else if (usuarioLogado.usuarioTipo === 'ADMINISTRADOR') {
                podeVisualizar = true;
            }

            if (!podeVisualizar) {
                return res.status(403).json({
                    error: 'Você não tem permissão para visualizar as atividades deste chamado'
                });
            }

            //console.log('Filtro de histórico:', filtroHistorico);
            // Buscar histórico
            const historico = await prisma.historicoChamado.findMany({
                where: filtroHistorico,
                orderBy: {
                    HistChamadoDt: ordem === 'asc' ? 'asc' : 'desc'
                },
                include: {
                    Chamado: true
                }
            });

            //console.log('historico = ', historico);

            return res.status(200).json({
                data: historico,
                total: historico.length,
                chamado: {
                    ChamadoId: chamado.ChamadoId,
                    ChamadoTitulo: chamado.ChamadoTitulo,
                    ChamadoStatus: chamado.ChamadoStatus
                }
            });

        } catch (error) {
            console.error('Erro ao listar histórico do chamado:', error);
            return res.status(500).json({ error: 'Erro ao listar histórico do chamado' });
        }
    }

}

module.exports = new HistoricoChamadoController();