// src/controllers/chamadoController.js
const prisma = require('../prisma.js');

const pool = require('../services/classificador');

const { getBrasilDateTime } = require('../utils/dataBrasilObter.js');

// Método separado para classificação em background
async function processarClassificacaoEmBackground(chamadoId, dadosClassificacao) {
    console.log(`[${new Date().toISOString()}] 🚀 Iniciando classificação para chamado ${chamadoId}...`);
    console.log('Dados recebidos:', dadosClassificacao);

    try {
        // Classificar usando o pool (retorna apenas { urgencia: '...' })
        const classificacao = await pool.classificar(dadosClassificacao);

        console.log(`✅ Classificação obtida para chamado ${chamadoId}:`, classificacao);

        // Atualizar SOMENTE os campos ChamadoUrgencia e ChamadoStatus
        const chamadoAntes = await prisma.chamado.findUnique({
            where: { ChamadoId: chamadoId },
            select: {
                ChamadoStatus: true
            }
        });

        if (chamadoAntes) {
            let chamadoStatus = 'PENDENTE'
            if (chamadoAntes.ChamadoStatus !== 'FALTAINFORMACAO' && chamadoAntes.ChamadoStatus !== 'PROCESSAMENTO') {
                chamadoStatus = chamadoAntes.ChamadoStatus
            }
            await prisma.chamado.update({
                where: { ChamadoId: chamadoId },
                data: {
                    ChamadoUrgencia: classificacao.urgencia,
                    ChamadoStatus: chamadoStatus
                }
            });
        }

        console.log(`✅ Chamado ${chamadoId} atualizado com sucesso! Urgência: ${classificacao.urgencia}`);

    } catch (error) {
        console.error(`❌ Erro ao classificar chamado ${chamadoId}:`, error);
    }
}


class ChamadoController {

    // Abrir novo chamado (apenas PESSOA)
    async abrirChamado(req, res) {
        try {
            const {
                ChamadoDescricaoInicial,
                ChamadoDiasComProblema,
                ChamadoRiscoVidaHumana,
                ChamadoRiscoVidaAnimal,
                ChamadoBloqueioVia,
                TipSupId
            } = req.body;
            const usuarioLogado = req.usuario;

            if (!ChamadoDescricaoInicial || !ChamadoDescricaoInicial.trim()) {
                return res.status(400).json({ error: 'Descrição inicial do chamado é obrigatória' });
            }

            if (!ChamadoDiasComProblema || isNaN(parseInt(ChamadoDiasComProblema)) || parseInt(ChamadoDiasComProblema) < 1) {
                return res.status(400).json({ error: 'Dias com problemas deve ser maior ou igual a um' });
            }

            if (!TipSupId || isNaN(parseInt(TipSupId)) || parseInt(TipSupId) <= 0) {
                return res.status(400).json({ error: 'Tipo de suporte é obrigatório' });
            }

            if (ChamadoRiscoVidaHumana === undefined || typeof ChamadoRiscoVidaHumana !== 'boolean') {
                return res.status(400).json({ error: 'Risco de vida humana é obrigatório' });
            }

            if (ChamadoRiscoVidaAnimal === undefined || typeof ChamadoRiscoVidaAnimal !== 'boolean') {
                return res.status(400).json({ error: 'Risco de vida animal é obrigatório' });
            }

            if (ChamadoBloqueioVia === undefined || typeof ChamadoBloqueioVia !== 'boolean') {
                return res.status(400).json({ error: 'Via bloqueada é obrigatório' });
            }

            // Verificar se o usuário é PESSOA
            if (usuarioLogado.usuarioTipo !== 'PESSOA') {
                return res.status(403).json({
                    error: 'Apenas pessoas podem abrir chamados'
                });
            }

            // Verificar se a pessoa logada é a mesma que está abrindo o chamado
            const PessoaId = usuarioLogado.usuarioId;

            // Buscar pessoa
            const pessoa = await prisma.pessoa.findUnique({
                where: { PessoaId: PessoaId },
                include: {
                    Unidade: true
                }
            });

            if (!pessoa) {
                return res.status(404).json({ error: 'Pessoa não encontrada' });
            }

            // Verificar se a pessoa está ativa
            if (pessoa.PessoaStatus !== 'ATIVA') {
                return res.status(403).json({
                    error: 'Sua conta está inativa ou bloqueada. Não é possível abrir chamados.'
                });
            }

            const UnidadeId = pessoa.UnidadeId;

            // Verificar se a unidade está ativa
            const unidade = await prisma.unidade.findUnique({
                where: { UnidadeId: parseInt(UnidadeId) }
            });

            if (!unidade) {
                return res.status(404).json({ error: 'Unidade não encontrada' });
            }

            if (unidade.UnidadeStatus !== 'ATIVA') {
                return res.status(400).json({
                    error: 'Não é possível abrir chamados em uma unidade inativa ou bloqueada'
                });
            }

            // Obter os números dos últimos chamados da unidade
            const ultimoChamado = await prisma.chamado.findFirst({
                where: {
                    UnidadeId: parseInt(UnidadeId)
                },
                orderBy: [
                    { ChamadoN1: 'desc' },
                    { ChamadoN2: 'desc' }
                ],
                select: {
                    ChamadoN1: true,
                    ChamadoN2: true
                }
            });

            // Calcular os próximos números
            let proximoN1 = 1;
            let proximoN2 = 1;

            if (ultimoChamado) {
                // Se o último N2 for 999999999 (ou algum limite máximo), incrementa N1 e reseta N2
                const LIMITE_N2 = 999999999; // ou 99999999, dependendo do formato desejado

                if (ultimoChamado.ChamadoN2 >= LIMITE_N2) {
                    proximoN1 = ultimoChamado.ChamadoN1 + 1;
                    proximoN2 = 1;
                } else {
                    proximoN1 = ultimoChamado.ChamadoN1;
                    proximoN2 = ultimoChamado.ChamadoN2 + 1;
                }
            }

            console.log(`Próximo número: ${proximoN1} - ${proximoN2}`);

            // Verificar se o tipo de suporte existe e tem vinculo com a unidade
            const tipoSuporte = await prisma.tipoSuporte.findFirst({
                where: {
                    TipSupId: parseInt(TipSupId),
                    TipSupStatus: 'ATIVO'
                }
            });

            if (!tipoSuporte) {
                return res.status(404).json({
                    error: 'Tipo de suporte não encontrado, está inativo'
                });
            }

            const tipoSuporteUni = await prisma.tipoSuporteUnidade.findFirst({
                where: {
                    TipSupId: parseInt(TipSupId),
                    UnidadeId: parseInt(UnidadeId),
                    TipSupUniStatus: 'ATIVO'
                }
            });

            if (!tipoSuporteUni) {
                return res.status(404).json({
                    error: 'Tipo de suporte não tem vinculo com a unidade ou está inativo'
                });
            }

            //console.log('Body = ', req.body);
            //console.log('UnidadeId = ', UnidadeId);
            //console.log('PessoaId = ', PessoaId);

            // ========== CRIAR CHAMADO SEM CLASSIFICAÇÃO ==========
            // Primeiro, criar o chamado com valores padrão
            const chamado = await prisma.chamado.create({
                data: {
                    ChamadoN1: proximoN1,
                    ChamadoN2: proximoN2,
                    PessoaId: PessoaId,
                    UnidadeId: parseInt(UnidadeId),
                    ChamadoDescricaoInicial: ChamadoDescricaoInicial.trim(),
                    ChamadoStatus: 'PENDENTE',
                    ChamadoDtAbertura: getBrasilDateTime(),
                    ChamadoBloqueioVia: ChamadoBloqueioVia,
                    ChamadoDiasComProblema: parseInt(ChamadoDiasComProblema),
                    ChamadoRiscoVidaHumana: ChamadoRiscoVidaHumana,
                    ChamadoRiscoVidaAnimal: ChamadoRiscoVidaAnimal,
                    TipSupId: parseInt(TipSupId),
                },
                include: {
                    Pessoa: {
                        select: {
                            PessoaId: true,
                            PessoaNome: true,
                            PessoaEmail: true,
                            PessoaTelefone: true
                        }
                    },
                    Unidade: {
                        select: {
                            UnidadeId: true,
                            UnidadeNome: true,
                            UnidadeStatus: true
                        }
                    }
                }
            });

            // ========== RESPONDER AO CLIENTE IMEDIATAMENTE ==========
            res.status(201).json({
                message: 'Chamado criado com sucesso',
                data: chamado,
            });

            let risco_vida_humana = 0;
            if (ChamadoRiscoVidaHumana) {
                risco_vida_humana = 1;
            }

            let risco_vida_animal = 0;
            if (ChamadoRiscoVidaAnimal) {
                risco_vida_animal = 1;
            }

            let bloqueio_via = 0;
            if (ChamadoBloqueioVia) {
                bloqueio_via = 1;
            }

            // ========== PROCESSAR CLASSIFICAÇÃO EM BACKGROUND ==========
            // Não usar await - deixa executar em segundo plano
            processarClassificacaoEmBackground(chamado.ChamadoId, {
                dias_problema: parseInt(ChamadoDiasComProblema),
                risco_vida_humana: risco_vida_humana,
                risco_vida_animal: risco_vida_animal,
                bloqueio_via: bloqueio_via,
                tipo_chamanado: parseInt(TipSupId)
            }).catch(error => {
                console.error(`Erro ao classificar chamado ${chamado.ChamadoId} em background:`, error);
            });

        } catch (error) {
            console.error('Erro ao abrir chamado:', error);
            res.status(500).json({ error: 'Erro ao abrir chamado' });
        }
    }

    // Alterar chamado (gestor OU pessoa que abriu - com restrições)
    async alterarChamado(req, res) {
        try {
            const { id } = req.params;
            const {
                TipSupId,
                EquipeId,
                ChamadoTitulo,
                ChamadoDescricaoInicial,
                ChamadoPrioridade,
                ChamadoUrgencia,
                ChamadoDiasComProblema,
                ChamadoRiscoVidaHumana,
                ChamadoRiscoVidaAnimal,
                ChamadoBloqueioVia,
            } = req.body;

            const usuarioLogado = req.usuario;
            const chamadoId = id;

            // Preparar dados para atualização
            const dadosAtualizacao = {};

            if (!chamadoId) {
                return res.status(400).json({ error: 'ID do chamado inválido' });
            }

            // Buscar chamado
            const chamadoExistente = await prisma.chamado.findUnique({
                where: { ChamadoId: chamadoId, ChamadoStatus: { notIn: ['ATRIBUIDO', 'CANCELADO', 'CONCLUIDO', 'EMATENDIMENTO', 'RECUSADO'] } },
                include: {
                    Pessoa: true,
                    Unidade: true,
                    Equipe: {
                        include: {
                            TecnicoEquipe: {
                                where: {
                                    TecEquStatus: 'ATIVO'
                                },
                                include: {
                                    Tecnico: true
                                }
                            }
                        }
                    }
                }
            });

            if (!chamadoExistente) {
                return res.status(404).json({ error: 'Chamado não encontrado, ou com status não permitido para alteração' });
            }

            // Verificar permissões
            let podeAlterar = false;
            let tipoAcesso = '';

            // Flag para saber se precisa reclassificar
            let precisaReclassificar = false;
            let dadosParaReclassificacao = null;

            // Caso 1: Pessoa que abriu o chamado
            if (usuarioLogado.usuarioTipo === 'PESSOA' && usuarioLogado.usuarioId === chamadoExistente.PessoaId) {
                podeAlterar = true;
                tipoAcesso = 'PESSOA';

                // Pessoa não pode alterar campos restritos
                if (EquipeId !== undefined || ChamadoPrioridade !== undefined ||
                    ChamadoUrgencia !== undefined) {
                    return res.status(403).json({
                        error: 'Você não pode alterar equipe, prioridade ou urgência'
                    });
                }

                // Caso o status já não seja mais pendentes, não se pode alterar
                if (chamadoExistente.ChamadoStatus !== 'PENDENTE' && chamadoExistente.ChamadoStatus !== 'FALTAINFORMACAO') {
                    return res.status(403).json({
                        error: 'Chamado já não está mais pendente, não permitido alterar.'
                    })
                } else if (chamadoExistente.ChamadoStatus === 'FALTAINFORMACAO') {
                    // Após alterar a descrição inicial, o status volta para pendente para nova análise
                    dadosAtualizacao.ChamadoStatus = 'PENDENTE';
                }

                // Dados que somente a pessoa pode alterar
                if (tipoAcesso === 'PESSOA') {
                    if (!ChamadoDiasComProblema || isNaN(parseInt(ChamadoDiasComProblema)) || parseInt(ChamadoDiasComProblema) < 1) {
                        return res.status(400).json({ error: 'Dias com problemas deve ser maior ou igual a um' });
                    } else {
                        // Verificar se o valor mudou para reclassificar
                        if (chamadoExistente.ChamadoDiasComProblema !== parseInt(ChamadoDiasComProblema)) {
                            precisaReclassificar = true;
                        }
                        dadosAtualizacao.ChamadoDiasComProblema = parseInt(ChamadoDiasComProblema);
                    }

                    if (ChamadoRiscoVidaHumana === undefined || typeof ChamadoRiscoVidaHumana !== 'boolean') {
                        return res.status(400).json({ error: 'Risco de vida humana é obrigatório' });
                    } else {
                        if (chamadoExistente.ChamadoRiscoVidaHumana !== ChamadoRiscoVidaHumana) {
                            precisaReclassificar = true;
                        }
                        dadosAtualizacao.ChamadoRiscoVidaHumana = ChamadoRiscoVidaHumana;
                    }

                    if (ChamadoRiscoVidaAnimal === undefined || typeof ChamadoRiscoVidaAnimal !== 'boolean') {
                        return res.status(400).json({ error: 'Risco de vida animal é obrigatório' });
                    } else {
                        if (chamadoExistente.ChamadoRiscoVidaAnimal !== ChamadoRiscoVidaAnimal) {
                            precisaReclassificar = true;
                        }
                        dadosAtualizacao.ChamadoRiscoVidaAnimal = ChamadoRiscoVidaAnimal;
                    }

                    if (ChamadoBloqueioVia === undefined || typeof ChamadoBloqueioVia !== 'boolean') {
                        return res.status(400).json({ error: 'Via bloqueada é obrigatório' });
                    } else {
                        if (chamadoExistente.ChamadoBloqueioVia !== ChamadoBloqueioVia) {
                            precisaReclassificar = true;
                        }
                        dadosAtualizacao.ChamadoBloqueioVia = ChamadoBloqueioVia;
                    }

                    // Set status for FALTAINFORMACAO, volta para PROCESSAMENTO para nova análise
                    if (chamadoExistente.ChamadoStatus === 'FALTAINFORMACAO') {
                        dadosAtualizacao.ChamadoStatus = 'PROCESSAMENTO';
                    }
                }
            }

            // Caso 2: Gestor da unidade
            else if (usuarioLogado.usuarioTipo === 'GESTOR') {
                const gestorLogado = await prisma.gestor.findUnique({
                    where: { GestorId: usuarioLogado.usuarioId, GestorStatus: 'ATIVO' }
                });

                if (gestorLogado && gestorLogado.UnidadeId === chamadoExistente.UnidadeId) {
                    podeAlterar = true;
                    tipoAcesso = 'GESTOR';
                }

                console.log('Gestor logado = ', gestorLogado);
                if (chamadoExistente.ChamadoStatus === 'FALTAINFORMACAO') {
                    return res.status(403).json({
                        error: 'Você não tem permissão para alterar os dados deste chamado por causa do seu status'
                    });
                }
            }

            if (!podeAlterar) {
                return res.status(403).json({
                    error: 'Você não tem permissão para alterar este chamado'
                });
            }

            // Se for pessoa e houver alteração nos campos de classificação, preparar dados
            if (tipoAcesso === 'PESSOA' && precisaReclassificar) {
                // Buscar o tipo de suporte atual do chamado
                const tipSupIdAtual = dadosAtualizacao.TipSupId || chamadoExistente.TipSupId;

                dadosParaReclassificacao = {
                    dias_problema: dadosAtualizacao.ChamadoDiasComProblema || chamadoExistente.ChamadoDiasComProblema,
                    risco_vida_humana: dadosAtualizacao.ChamadoRiscoVidaHumana !== undefined ?
                        (dadosAtualizacao.ChamadoRiscoVidaHumana ? 1 : 0) :
                        (chamadoExistente.ChamadoRiscoVidaHumana ? 1 : 0),
                    risco_vida_animal: dadosAtualizacao.ChamadoRiscoVidaAnimal !== undefined ?
                        (dadosAtualizacao.ChamadoRiscoVidaAnimal ? 1 : 0) :
                        (chamadoExistente.ChamadoRiscoVidaAnimal ? 1 : 0),
                    bloqueio_via: dadosAtualizacao.ChamadoBloqueioVia !== undefined ?
                        (dadosAtualizacao.ChamadoBloqueioVia ? 1 : 0) :
                        (chamadoExistente.ChamadoBloqueioVia ? 1 : 0),
                    tipo_chamanado: tipSupIdAtual
                };

                console.log(`🔄 Chamado ${chamadoId} será reclassificado devido a alterações nos campos de classificação`);
            }

            // Validar e adicionar campos de acordo com o tipo de acesso
            if (TipSupId !== undefined && tipoAcesso === 'GESTOR') {
                // Verificar se o tipo de suporte existe e pertence à unidade
                if (!TipSupId || isNaN(parseInt(TipSupId)) || parseInt(TipSupId) <= 0) {
                    return res.status(400).json({ error: 'Tipo de suporte é obrigatório' });
                } else {
                    // Verificar se o tipo de suporte existe e tem vinculo com a unidade
                    const tipoSuporte = await prisma.tipoSuporte.findFirst({
                        where: {
                            TipSupId: parseInt(TipSupId),
                            TipSupStatus: 'ATIVO'
                        }
                    });

                    if (!tipoSuporte) {
                        return res.status(404).json({
                            error: 'Tipo de suporte não encontrado, está inativo'
                        });
                    }

                    const tipoSuporteUni = await prisma.tipoSuporteUnidade.findFirst({
                        where: {
                            TipSupId: parseInt(TipSupId),
                            UnidadeId: parseInt(UnidadeId),
                            TipSupUniStatus: 'ATIVO'
                        }
                    });

                    if (!tipoSuporteUni) {
                        return res.status(404).json({
                            error: 'Tipo de suporte não tem vinculo com a unidade ou está inativo'
                        });
                    }
                }
                dadosAtualizacao.TipSupId = TipSupId ? parseInt(TipSupId) : null;

                // Se o tipo de suporte mudou e é gestor, também pode precisar reclassificar
                if (chamadoExistente.TipSupId !== parseInt(TipSupId)) {
                    precisaReclassificar = true;
                    dadosParaReclassificacao = {
                        dias_problema: dadosAtualizacao.ChamadoDiasComProblema || chamadoExistente.ChamadoDiasComProblema,
                        risco_vida_humana: dadosAtualizacao.ChamadoRiscoVidaHumana !== undefined ?
                            (dadosAtualizacao.ChamadoRiscoVidaHumana ? 1 : 0) :
                            (chamadoExistente.ChamadoRiscoVidaHumana ? 1 : 0),
                        risco_vida_animal: dadosAtualizacao.ChamadoRiscoVidaAnimal !== undefined ?
                            (dadosAtualizacao.ChamadoRiscoVidaAnimal ? 1 : 0) :
                            (chamadoExistente.ChamadoRiscoVidaAnimal ? 1 : 0),
                        bloqueio_via: dadosAtualizacao.ChamadoBloqueioVia !== undefined ?
                            (dadosAtualizacao.ChamadoBloqueioVia ? 1 : 0) :
                            (chamadoExistente.ChamadoBloqueioVia ? 1 : 0),
                        tipo_chamanado: TipSupId
                    };
                }
            }

            console.log('EquipeId = ', EquipeId);
            if ((EquipeId !== undefined && EquipeId) && tipoAcesso === 'GESTOR') {
                // Verificar se a equipe existe e pertence à unidade
                const equipe = await prisma.equipe.findFirst({
                    where: {
                        EquipeId: EquipeId,
                        UnidadeId: chamadoExistente.UnidadeId,
                        EquipeStatus: 'ATIVA'
                    }
                });

                if (!equipe) {
                    return res.status(404).json({
                        error: 'Equipe não encontrada ou não pertence à unidade'
                    });
                }

                dadosAtualizacao.EquipeId = EquipeId;
            }

            // Verificar se o status está como em atendimento, se sim ser obrigatório a equipe
            if (chamadoExistente.ChamadoStatus === 'EMATENDIMENTO' && !dadosAtualizacao.EquipeId && !chamadoExistente.EquipeId) {
                return res.status(400).json({
                    error: 'Chamados em atendimento devem ter uma equipe atribuída'
                });
            }

            if (ChamadoTitulo !== undefined && tipoAcesso === 'GESTOR') {
                dadosAtualizacao.ChamadoTitulo = ChamadoTitulo.trim();
            }

            if (ChamadoDescricaoInicial !== undefined && ChamadoDescricaoInicial.trim() !== '') {
                // Gestor altera a descrição formatada
                if (tipoAcesso === 'GESTOR') {
                    dadosAtualizacao.ChamadoDescricaoFormatada = ChamadoDescricaoInicial.trim();
                } else if (chamadoExistente.ChamadoStatus === 'PENDENTE' || chamadoExistente.ChamadoStatus === 'FALTAINFORMACAO') {
                    dadosAtualizacao.ChamadoDescricaoInicial = ChamadoDescricaoInicial.trim();
                }
            } else if (ChamadoDescricaoInicial !== undefined && ChamadoDescricaoInicial.trim() === '') {
                if (tipoAcesso !== 'GESTOR') {
                    return res.status(400).json({ error: 'Descrição do chamado não pode ser vazia' });
                }
            }

            if (ChamadoPrioridade !== undefined && tipoAcesso !== 'PESSOA') {
                const prioridade = parseInt(ChamadoPrioridade);
                if (isNaN(prioridade) || prioridade < 1 || prioridade > 10) {
                    return res.status(400).json({
                        error: 'Prioridade deve ser um número entre 1 e 10'
                    });
                }
                dadosAtualizacao.ChamadoPrioridade = prioridade;
            }

            if (ChamadoUrgencia !== undefined && tipoAcesso !== 'PESSOA') {
                const urgenciasValidas = ['BAIXA', 'MEDIA', 'ALTA', 'URGENTE'];
                if (!urgenciasValidas.includes(ChamadoUrgencia)) {
                    return res.status(400).json({
                        error: 'Urgência inválida. Use: BAIXA, MEDIA, ALTA ou URGENTE'
                    });
                }
                dadosAtualizacao.ChamadoUrgencia = ChamadoUrgencia;
            }

            // Verificar se há dados para atualizar
            if (Object.keys(dadosAtualizacao).length === 0) {
                return res.status(400).json({ error: 'Nenhum dado fornecido para atualização' });
            }

            // Atualizar chamado
            const chamadoAtualizado = await prisma.chamado.update({
                where: { ChamadoId: chamadoId },
                data: dadosAtualizacao,
                include: {
                    Pessoa: {
                        select: {
                            PessoaId: true,
                            PessoaNome: true,
                            PessoaEmail: true,
                            PessoaTelefone: true
                        }
                    },
                    Unidade: {
                        select: {
                            UnidadeId: true,
                            UnidadeNome: true,
                            UnidadeStatus: true
                        }
                    },
                    TipoSuporte: {
                        select: {
                            TipSupId: true,
                            TipSupNom: true
                        }
                    },
                    Equipe: {
                        select: {
                            EquipeId: true,
                            EquipeNome: true
                        }
                    }
                }
            });

            // ========== RESPONDER AO CLIENTE ==========
            res.status(200).json({
                message: 'Chamado atualizado com sucesso',
                data: chamadoAtualizado,
                reclassificacao_solicitada: precisaReclassificar || false
            });

            // ========== PROCESSAR RECLASSIFICAÇÃO EM BACKGROUND ==========
            if (precisaReclassificar && dadosParaReclassificacao) {
                console.log(`🔄 Iniciando reclassificação em background para chamado ${chamadoId}...`);

                processarClassificacaoEmBackground(chamadoId, dadosParaReclassificacao).catch(error => {
                    console.error(`Erro ao reclassificar chamado ${chamadoId} em background:`, error);
                });
            } else {
                // Atualizar SOMENTE o campo ChamadoStatus
                await prisma.chamado.update({
                    where: { ChamadoId: chamadoAtualizado.ChamadoId },
                    data: {
                        ChamadoStatus: 'ANALISADO'
                    }
                });
            }

        } catch (error) {
            console.error('Erro ao alterar chamado:', error);
            res.status(500).json({ error: 'Erro ao alterar chamado' });
        }
    }

    // Listar chamados com filtros
    async listarChamados(req, res) {
        try {
            const {
                unidadeId,
                pessoaId,
                equipeId,
                tipoSuporteId,
                status,
                urgencia,
                prioridadeMin,
                prioridadeMax,
                dataInicio,
                dataFim,
                pagina = 1,
                limite = 10
            } = req.query;

            const usuarioLogado = req.usuario;

            // Construir filtro base
            const filtro = {};

            // Aplicar filtros de acordo com permissão
            if (usuarioLogado.usuarioTipo === 'PESSOA') {
                // Pessoa só vê seus próprios chamados
                filtro.PessoaId = usuarioLogado.usuarioId;
            }
            else if (usuarioLogado.usuarioTipo === 'TECNICO') {
                // Técnico vê chamados da sua unidade OU atribuídos à sua equipe
                const tecnico = await prisma.tecnico.findUnique({
                    where: { TecnicoId: usuarioLogado.usuarioId },
                    include: {
                        TecnicoEquipe: {
                            where: {
                                TecEquStatus: 'ATIVO'
                            },
                            select: {
                                EquipeId: true
                            }
                        }
                    }
                });

                if (tecnico) {
                    filtro.AND = [
                        { UnidadeId: tecnico.UnidadeId },
                        { EquipeId: { in: tecnico.TecnicoEquipe.map(te => te.EquipeId) } }
                    ];
                }
            }
            else if (usuarioLogado.usuarioTipo === 'GESTOR') {
                const gestor = await prisma.gestor.findUnique({
                    where: { GestorId: usuarioLogado.usuarioId, GestorStatus: 'ATIVO' }
                });

                if (gestor) {
                    // Gestor vê chamados da sua unidade
                    filtro.UnidadeId = gestor.UnidadeId;
                }
            }

            // Aplicar filtros da query (sobrescrevem os automáticos se tiver permissão)
            if (usuarioLogado.usuarioTipo === 'ADMINISTRADOR' && unidadeId) {
                filtro.UnidadeId = parseInt(unidadeId);
            }

            if (pessoaId && (usuarioLogado.usuarioTipo === 'ADMINISTRADOR' || usuarioLogado.usuarioTipo === 'GESTOR')) {
                filtro.PessoaId = pessoaId;
            }

            if (equipeId && (usuarioLogado.usuarioTipo === 'ADMINISTRADOR' || usuarioLogado.usuarioTipo === 'GESTOR')) {
                filtro.EquipeId = equipeId;
            }

            if (tipoSuporteId) {
                filtro.TipSupId = parseInt(tipoSuporteId);
            }

            if (status) {
                const statusArray = status.split(',');
                filtro.ChamadoStatus = { in: statusArray };
            }

            if (urgencia) {
                const urgenciaArray = urgencia.split(',');
                filtro.ChamadoUrgencia = { in: urgenciaArray };
            }

            if (prioridadeMin || prioridadeMax) {
                filtro.ChamadoPrioridade = {};
                if (prioridadeMin) filtro.ChamadoPrioridade.gte = parseInt(prioridadeMin);
                if (prioridadeMax) filtro.ChamadoPrioridade.lte = parseInt(prioridadeMax);
            }

            if (dataInicio || dataFim) {
                filtro.ChamadoDtAbertura = {};
                if (dataInicio) {
                    const inicio = new Date(dataInicio);
                    inicio.setHours(0, 0, 0, 0);
                    filtro.ChamadoDtAbertura.gte = inicio;
                }
                if (dataFim) {
                    const fim = new Date(dataFim);
                    fim.setHours(23, 59, 59, 999);
                    filtro.ChamadoDtAbertura.lte = fim;
                }
            }

            // Calcular paginação
            const paginaAtual = parseInt(pagina);
            const limitePorPagina = parseInt(limite);
            const skip = (paginaAtual - 1) * limitePorPagina;

            // Buscar chamados
            const [chamados, total] = await prisma.$transaction([
                prisma.chamado.findMany({
                    where: filtro,
                    orderBy: [
                        { ChamadoDtAbertura: 'desc' }
                    ],
                    skip: skip,
                    take: limitePorPagina,
                    include: {
                        Pessoa: {
                            select: {
                                PessoaId: true,
                                PessoaNome: true,
                                PessoaEmail: true,
                                PessoaTelefone: true
                            }
                        },
                        Unidade: {
                            select: {
                                UnidadeId: true,
                                UnidadeNome: true
                            }
                        },
                        TipoSuporte: {
                            select: {
                                TipSupId: true,
                                TipSupNom: true
                            }
                        },
                        Equipe: {
                            select: {
                                EquipeId: true,
                                EquipeNome: true
                            }
                        },
                        _count: {
                            select: {
                                AtividadeChamado: true
                            }
                        }
                    }
                }),
                prisma.chamado.count({ where: filtro })
            ]);

            //console.log('Chamados encontrados:', chamados, 'Total:', chamados.length);

            res.status(200).json({
                data: chamados,
                paginacao: {
                    paginaAtual,
                    limitePorPagina,
                    totalRegistros: total,
                    totalPaginas: Math.ceil(total / limitePorPagina)
                }
            });

        } catch (error) {
            console.error('Erro ao listar chamados:', error);
            res.status(500).json({ error: 'Erro ao listar chamados' });
        }
    }

    // Buscar chamado por ID
    async buscarChamadoPorId(req, res) {
        try {
            const { id } = req.params;
            const usuarioLogado = req.usuario;

            const chamadoId = id;
            if (!chamadoId) {
                return res.status(400).json({ error: 'ID do chamado inválido' });
            }

            //console.log('chamadoId = ', chamadoId);

            // Buscar chamado
            const chamado = await prisma.chamado.findUnique({
                where: { ChamadoId: chamadoId },
                include: {
                    Pessoa: {
                        select: {
                            PessoaId: true,
                            PessoaNome: true,
                            PessoaEmail: true,
                            PessoaTelefone: true
                        }
                    },
                    Unidade: {
                        select: {
                            UnidadeId: true,
                            UnidadeNome: true,
                            UnidadeStatus: true
                        }
                    },
                    TipoSuporte: {
                        select: {
                            TipSupId: true,
                            TipSupNom: true,
                            TipSupStatus: true
                        }
                    },
                    Equipe: {
                        select: {
                            EquipeId: true,
                            EquipeNome: true,
                            EquipeStatus: true,
                            TecnicoEquipe: {
                                where: {
                                    TecEquStatus: 'ATIVO'
                                },
                                include: {
                                    Tecnico: {
                                        select: {
                                            TecnicoId: true,
                                            TecnicoNome: true,
                                            TecnicoEmail: true
                                        }
                                    }
                                }
                            }
                        }
                    },
                    AtividadeChamado: {
                        orderBy: {
                            AtividadeDtRealizacao: 'asc'
                        },
                        include: {
                            Tecnico: {
                                select: {
                                    TecnicoId: true,
                                    TecnicoNome: true
                                }
                            }
                        }
                    }
                }
            });

            if (!chamado) {
                return res.status(404).json({ error: 'Chamado não encontrado' });
            }

            // Verificar permissão de visualização
            let podeVisualizar = false;

            if (usuarioLogado.usuarioTipo === 'PESSOA') {
                podeVisualizar = (usuarioLogado.usuarioId === chamado.PessoaId);
            }
            else if (usuarioLogado.usuarioTipo === 'TECNICO') {
                // Técnico pode ver se é da mesma unidade OU da equipe responsável
                const tecnico = await prisma.tecnico.findUnique({
                    where: { TecnicoId: usuarioLogado.usuarioId },
                    include: {
                        TecnicoEquipe: {
                            where: {
                                TecEquStatus: 'ATIVO'
                            },
                            select: {
                                EquipeId: true
                            }
                        }
                    }
                });

                if (tecnico) {
                    podeVisualizar = (tecnico.UnidadeId === chamado.UnidadeId) ||
                        (chamado.EquipeId && tecnico.TecnicoEquipe.some(te => te.EquipeId === chamado.EquipeId));
                }
            }
            else if (usuarioLogado.usuarioTipo === 'GESTOR') {
                const gestor = await prisma.gestor.findUnique({
                    where: { GestorId: usuarioLogado.usuarioId, GestorStatus: 'ATIVO' }
                });

                if (gestor) {
                    podeVisualizar = (gestor.UnidadeId === chamado.UnidadeId);
                }
            }
            else if (usuarioLogado.usuarioTipo === 'ADMINISTRADOR') {
                podeVisualizar = true;
            }

            if (!podeVisualizar) {
                return res.status(403).json({
                    error: 'Você não tem permissão para visualizar este chamado'
                });
            }

            //console.log('Chamado encontrado:', chamado);

            res.status(200).json({
                data: chamado
            });

        } catch (error) {
            console.error('Erro ao buscar chamado:', error);
            res.status(500).json({ error: 'Erro ao buscar chamado' });
        }
    }

    // Atribuir chamado a uma equipe (apenas gestor)
    async atribuirEquipe(req, res) {
        try {
            const { id } = req.params;
            const { EquipeId } = req.body;
            const usuarioLogado = req.usuario;

            const chamadoId = id;
            if (!chamadoId) {
                return res.status(400).json({ error: 'ID do chamado inválido' });
            }

            if (!EquipeId) {
                return res.status(400).json({ error: 'ID da equipe é obrigatório' });
            }

            // Verificar se é gestor
            if (usuarioLogado.usuarioTipo !== 'GESTOR') {
                return res.status(403).json({
                    error: 'Apenas gestores podem atribuir equipes a chamados'
                });
            }

            // Buscar gestor
            const gestor = await prisma.gestor.findUnique({
                where: { GestorId: usuarioLogado.usuarioId, GestorStatus: 'ATIVO' }
            });

            if (!gestor || gestor.GestorStatus !== 'ATIVO') {
                return res.status(403).json({ error: 'Gestor não encontrado ou inativo' });
            }

            // Buscar chamado
            const chamado = await prisma.chamado.findUnique({
                where: { ChamadoId: chamadoId }
            });

            if (!chamado) {
                return res.status(404).json({ error: 'Chamado não encontrado' });
            }

            // Verificar se o chamado é da unidade do gestor
            if (chamado.UnidadeId !== gestor.UnidadeId) {
                return res.status(403).json({
                    error: 'Você só pode atribuir equipes a chamados da sua unidade'
                });
            }

            // Verificar se a equipe existe e pertence à unidade
            const equipe = await prisma.equipe.findFirst({
                where: {
                    EquipeId: EquipeId,
                    UnidadeId: gestor.UnidadeId,
                    EquipeStatus: 'ATIVA'
                }
            });

            if (!equipe) {
                return res.status(404).json({
                    error: 'Equipe não encontrada ou não pertence à unidade'
                });
            }

            // Atualizar chamado
            const chamadoAtualizado = await prisma.chamado.update({
                where: { ChamadoId: chamadoId },
                data: {
                    EquipeId: EquipeId,
                    ChamadoStatus: 'ATRIBUIDO'
                },
                include: {
                    Equipe: {
                        select: {
                            EquipeId: true,
                            EquipeNome: true
                        }
                    }
                }
            });

            res.status(200).json({
                message: 'Equipe atribuída ao chamado com sucesso',
                data: chamadoAtualizado
            });

        } catch (error) {
            console.error('Erro ao atribuir equipe:', error);
            res.status(500).json({ error: 'Erro ao atribuir equipe' });
        }
    }

    // Alterar status do chamado (com validações de fluxo)
    async alterarStatus(req, res) {
        try {
            const { id } = req.params;
            const { ChamadoStatus, ChamadoDescricaoFormatada, ChamadoEquipeId } = req.body;
            const usuarioLogado = req.usuario;

            const chamadoId = id;
            if (!chamadoId) {
                return res.status(400).json({ error: 'ID do chamado inválido' });
            }

            // Validar status
            if (!ChamadoStatus) {
                return res.status(400).json({ error: 'Status é obrigatório' });
            }

            const statusValidos = ['PROCESSAMENTO', 'PENDENTE', 'ANALISADO', 'ATRIBUIDO', 'EMATENDIMENTO', 'CONCLUIDO', 'CANCELADO', 'RECUSADO', 'FALTAINFORMACAO'];
            if (!statusValidos.includes(ChamadoStatus)) {
                return res.status(400).json({ error: 'Status inválido' });
            }

            // Buscar chamado
            const chamado = await prisma.chamado.findUnique({
                where: { ChamadoId: chamadoId },
                include: {
                    Equipe: {
                        include: {
                            TecnicoEquipe: {
                                where: {
                                    TecEquStatus: 'ATIVO'
                                }
                            }
                        }
                    }
                }
            });

            if (!chamado) {
                return res.status(404).json({ error: 'Chamado não encontrado' });
            }

            // Verificar permissões
            let podeAlterarStatus = false;

            // Gestor pode alterar qualquer status
            if (usuarioLogado.usuarioTipo === 'GESTOR') {
                const gestor = await prisma.gestor.findUnique({
                    where: { GestorId: usuarioLogado.usuarioId, GestorStatus: 'ATIVO' }
                });

                if (gestor && gestor.UnidadeId === chamado.UnidadeId) {
                    podeAlterarStatus = true;
                }

                if (ChamadoStatus === 'EMATENDIMENTO') {
                    return res.status(403).json({
                        error: 'Gestores não podem alterar o status para em atendimento, somente técnicos'
                    });
                }

                if (ChamadoStatus === 'CANCELADO') {
                    return res.status(403).json({
                        error: 'Gestores não podem alterar o status para cancelado, somente o cidadão que abriu o chamado'
                    });
                }
            }
            // Técnico da equipe responsável pode alterar (exceto cancelar/recusar/faltainformação)
            else if (usuarioLogado.usuarioTipo === 'TECNICO' && chamado.EquipeId) {
                const tecnicoEquipe = await prisma.tecnicoEquipe.findFirst({
                    where: {
                        TecnicoId: usuarioLogado.usuarioId,
                        EquipeId: chamado.EquipeId,
                        TecEquStatus: 'ATIVO'
                    }
                });

                if (tecnicoEquipe) {
                    // Técnico não pode cancelar reportar falta de informação ou recusar o chamado
                    if (ChamadoStatus !== 'EMATENDIMENTO' && ChamadoStatus !== 'CONCLUIDO' && ChamadoStatus !== 'ATRIBUIDO') {
                        return res.status(403).json({
                            error: 'Técnicos não podem alterar para esse status ' + ChamadoStatus
                        });
                    }
                    podeAlterarStatus = true;
                }
            } else if (usuarioLogado.usuarioTipo === 'PESSOA') {
                if (ChamadoStatus !== 'CANCELADO') {
                    return res.status(403).json({
                        error: 'Pessoas só podem cancelar chamados e que estão pendentes'
                    });
                }

                if (chamado.PessoaId === usuarioLogado.usuarioId) {
                    podeAlterarStatus = true;
                }
            }

            if (!podeAlterarStatus) {
                return res.status(403).json({
                    error: 'Você não tem permissão para alterar o status deste chamado'
                });
            }

            // Validar transições de status
            const transicoesValidas = {
                'PENDENTE': ['ANALISADO', 'CANCELADO', 'FALTAINFORMACAO', 'RECUSADO'],
                'PROCESSAMENTO': ['PENDENTE', 'ANALISADO', 'CANCELADO', 'FALTAINFORMACAO', 'RECUSADO'],
                'ANALISADO': ['ATRIBUIDO', 'PENDENTE', 'RECUSADO', 'FALTAINFORMACAO'],
                'ATRIBUIDO': ['EMATENDIMENTO', 'ANALISADO'],
                'EMATENDIMENTO': ['CONCLUIDO', 'ANALISADO'],
                'FALTAINFORMACAO': ['RECUSADO', 'CANCELADO', 'PENDENTE', 'ANALISADO', 'PROCESSAMENTO'],
                'CONCLUIDO': [],
                'CANCELADO': [],
                'RECUSADO': []
            };

            if (!transicoesValidas[chamado.ChamadoStatus].includes(ChamadoStatus)) {
                return res.status(400).json({
                    error: `Não é possível mudar de ${chamado.ChamadoStatus} para ${ChamadoStatus}`
                });
            }

            // Preparar dados para atualização
            const dadosAtualizacao = { ChamadoStatus };

            // Se for concluir, adicionar data de encerramento
            if (ChamadoStatus === 'CONCLUIDO' && chamado.ChamadoStatus !== 'CONCLUIDO') {
                dadosAtualizacao.ChamadoDtEncerramento = new Date();
            }

            // Se for cancelar/recusar, adicionar data de encerramento
            if ((ChamadoStatus === 'CANCELADO' || ChamadoStatus === 'RECUSADO') &&
                chamado.ChamadoStatus !== 'CANCELADO' &&
                chamado.ChamadoStatus !== 'RECUSADO') {
                dadosAtualizacao.ChamadoDtEncerramento = new Date();
            }

            // Se for recusar, informar motivo na descrição formatada
            if (ChamadoStatus === 'RECUSADO' || ChamadoStatus === 'FALTAINFORMACAO') {
                if (!ChamadoDescricaoFormatada || !ChamadoDescricaoFormatada.trim()) {
                    return res.status(400).json({
                        error: 'Motivo da recusa ou falta de informação é obrigatório'
                    });
                }
                dadosAtualizacao.ChamadoDescricaoFormatada = ChamadoDescricaoFormatada.trim();
            }

            // Se for do status FALTAINFORMACAO para outro, limpar a descrição formatada
            if (chamado.ChamadoStatus === 'FALTAINFORMACAO' && ChamadoStatus !== 'FALTAINFORMACAO') {
                dadosAtualizacao.ChamadoDescricaoFormatada = null;
            }

            // Se for atribuir a equipe, validar equipe e adicionar
            if (ChamadoStatus === 'ATRIBUIDO') {
                if (!ChamadoEquipeId) {
                    return res.status(400).json({
                        error: 'ID da equipe é obrigatório para atribuir o chamado'
                    });
                }
                const equipe = await prisma.equipe.findFirst({
                    where: {
                        EquipeId: ChamadoEquipeId,
                        UnidadeId: chamado.UnidadeId,
                        EquipeStatus: 'ATIVA'
                    }
                });
                if (!equipe) {
                    return res.status(404).json({
                        error: 'Equipe não encontrada ou não pertence à unidade'
                    });
                }
                dadosAtualizacao.EquipeId = ChamadoEquipeId;
                dadosAtualizacao.ChamadoStatus = 'ATRIBUIDO';
            }

            // Se for voltar para pendente, remover equipe atribuída, titulo, descricao formatada, prioridade e data planejada
            if (ChamadoStatus === 'PENDENTE') {
                dadosAtualizacao.EquipeId = null;
                dadosAtualizacao.ChamadoDtPlanejada = null;
                dadosAtualizacao.ChamadoPrioridade = null;
                dadosAtualizacao.ChamadoDescricaoFormatada = null;
                dadosAtualizacao.ChamadoTitulo = null;
            }

            // Se for voltar para analisado, remover equipe atribuída
            if (ChamadoStatus === 'ANALISADO' || ChamadoStatus === 'FALTAINFORMACAO' || ChamadoStatus === 'CANCELADO' || ChamadoStatus === 'RECUSADO') {
                dadosAtualizacao.EquipeId = null;
            }

            // Atualizar chamado
            const chamadoAtualizado = await prisma.chamado.update({
                where: { ChamadoId: chamadoId },
                data: dadosAtualizacao,
                include: {
                    Pessoa: {
                        select: {
                            PessoaId: true,
                            PessoaNome: true
                        }
                    },
                    Equipe: {
                        select: {
                            EquipeId: true,
                            EquipeNome: true
                        }
                    }
                }
            });

            res.status(200).json({
                message: 'Status do chamado atualizado com sucesso',
                data: chamadoAtualizado
            });

        } catch (error) {
            console.error('Erro ao alterar status:', error);
            res.status(500).json({ error: 'Erro ao alterar status' });
        }
    }

    // Estatísticas de chamados
    async estatisticas(req, res) {
        try {
            const { unidadeId, periodo } = req.query;
            const usuarioLogado = req.usuario;

            // Definir período (padrão: últimos 30 dias)
            const dataFim = new Date();
            const dataInicio = new Date();

            if (periodo === '7d') {
                dataInicio.setDate(dataInicio.getDate() - 7);
            } else if (periodo === '30d') {
                dataInicio.setDate(dataInicio.getDate() - 30);
            } else if (periodo === '90d') {
                dataInicio.setDate(dataInicio.getDate() - 90);
            } else {
                dataInicio.setDate(dataInicio.getDate() - 30); // padrão 30 dias
            }

            dataInicio.setHours(0, 0, 0, 0);
            dataFim.setHours(23, 59, 59, 999);

            // Construir filtro base
            const filtro = {
                ChamadoDtAbertura: {
                    gte: dataInicio,
                    lte: dataFim
                }
            };

            // Aplicar filtros de acordo com permissão
            if (usuarioLogado.usuarioTipo === 'GESTOR') {
                const gestor = await prisma.gestor.findUnique({
                    where: { GestorId: usuarioLogado.usuarioId, GestorStatus: 'ATIVO' }
                });

                if (gestor) {
                    filtro.UnidadeId = gestor.UnidadeId;
                }
            } else if (usuarioLogado.usuarioTipo === 'TECNICO') {
                const tecnico = await prisma.tecnico.findUnique({
                    where: { TecnicoId: usuarioLogado.usuarioId }
                });

                if (tecnico) {
                    // Buscar equipes que o técnico faz parte
                    const equipes = await prisma.tecnicoEquipe.findMany({
                        where: {
                            TecnicoId: usuarioLogado.usuarioId,
                            TecEquStatus: 'ATIVO' // Considerar apenas vínculos ativos
                        },
                        select: {
                            EquipeId: true
                        }
                    });

                    // Extrair apenas os IDs das equipes
                    const equipeIds = equipes.map(e => e.EquipeId);

                    // Se o técnico não estiver em nenhuma equipe, retornar nenhum chamado
                    if (equipeIds.length === 0) {
                        // Opção 1: Retornar lista vazia
                        /*
                        return res.status(200).json({
                            data: {
                                periodo: {
                                    dataInicio,
                                    dataFim
                                },
                                total: 0,
                                porStatus: {},
                                porUrgencia: {}
                            }
                        });
                        */

                    }

                    // Adicionar filtro para buscar chamados das equipes do técnico
                    filtro.UnidadeId = tecnico.UnidadeId;

                    console.log('equipeIds = ', equipeIds);
                    filtro.EquipeId = {
                        in: equipeIds
                    };

                }
            }

            // Aplicar filtro de unidade se fornecido (apenas admin)
            if (unidadeId && usuarioLogado.usuarioTipo === 'ADMINISTRADOR') {
                filtro.UnidadeId = parseInt(unidadeId);
            }

            console.log('filtro = ', filtro);

            // Buscar estatísticas
            const [
                totalChamados,
                porStatus,
                porUrgencia,
                chamadosConcluidos
            ] = await Promise.all([
                // Total de chamados no período
                prisma.chamado.count({ where: filtro }),

                // Chamados por status
                prisma.chamado.groupBy({
                    by: ['ChamadoStatus'],
                    where: filtro,
                    _count: true
                }),

                // Chamados por urgência
                prisma.chamado.groupBy({
                    by: ['ChamadoUrgencia'],
                    where: {
                        ...filtro,
                        ChamadoUrgencia: { not: null }, ChamadoStatus: { not: 'CANCELADO', not: 'RECUSADO' }
                    },
                    _count: true
                }),

                // Buscar chamados concluídos para calcular tempo médio
                prisma.chamado.findMany({
                    where: {
                        ...filtro,
                        ChamadoStatus: 'CONCLUIDO',
                        ChamadoDtEncerramento: { not: null }
                    },
                    select: {
                        ChamadoDtAbertura: true,
                        ChamadoDtEncerramento: true
                    }
                })
            ]);

            // Calcular tempo médio de resolução (em horas)
            let tempoMedioResolucao = null;
            if (chamadosConcluidos.length > 0) {
                const totalHoras = chamadosConcluidos.reduce((acc, chamado) => {
                    const diffHoras = (chamado.ChamadoDtEncerramento - chamado.ChamadoDtAbertura) / (1000 * 60 * 60);
                    return acc + diffHoras;
                }, 0);
                tempoMedioResolucao = totalHoras / chamadosConcluidos.length;
            }

            // Calcular prioridade média
            let prioridadeMedia = null;
            const prioridadeResult = await prisma.chamado.aggregate({
                where: {
                    ...filtro,
                    ChamadoPrioridade: { not: null }
                },
                _avg: {
                    ChamadoPrioridade: true
                }
            });
            prioridadeMedia = prioridadeResult._avg.ChamadoPrioridade;


            const data = {
                periodo: {
                    dataInicio,
                    dataFim
                },
                total: totalChamados,
                porStatus: porStatus.reduce((acc, curr) => {
                    acc[curr.ChamadoStatus] = curr._count;
                    return acc;
                }, {}),
                porUrgencia: porUrgencia.reduce((acc, curr) => {
                    acc[curr.ChamadoUrgencia] = curr._count;
                    return acc;
                }, {})
            }

            console.log('data = ', data);

            return res.status(200).json({
                data: data
            });

        } catch (error) {
            console.error('Erro ao buscar estatísticas:', error);
            res.status(500).json({ error: 'Erro ao buscar estatísticas' });
        }
    }

}

module.exports = new ChamadoController();