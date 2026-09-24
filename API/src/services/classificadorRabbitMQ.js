// src/services/classificadorRabbitMQ.js
const rabbitmq = require('../config/rabbitmq');
const prisma = require('../prisma.js');
const { getBrasilDateTime } = require('../utils/dataBrasilObter.js');
const { gravarLog } = require('../utils/logGrava.js');

async function atualizarChamadoComClassificacao(chamadoId, classificacao) {
    const chamadoAntes = await prisma.chamado.findUnique({
        where: { ChamadoId: chamadoId },
        select: { ChamadoStatus: true }
    });

    if (!chamadoAntes) {
        console.log(`⚠️ Chamado ${chamadoId} não encontrado para atualização`);
        // --- Gravar de falha na atualização de urgencia
        const LogAcao = 'FALHAATUALIZARURGENCIACHAMADOAUTOMATICA';
        const LogDetalhe = 'Falha ao atualizar chamado de ID (' + chamadoId + '), não encontrado';
        await gravarLog(chamadoId, LogAcao, 'SISTEMA', LogDetalhe, chamadoId);
        // ---
        return;
    }

    // Verificar se o chamado ainda está em um status que permite classificação
    const statusPermitidos = ['PROCESSAMENTO', 'FALTAINFORMACAO', 'PENDENTE'];
    if (!statusPermitidos.includes(chamadoAntes.ChamadoStatus)) {
        console.log(`⚠️ Chamado ${chamadoId} está com status ${chamadoAntes.ChamadoStatus}, não será atualizado`);
        // --- Gravar de falha na atualização de urgencia
        const LogAcao = 'FALHAATUALIZARURGENCIACHAMADOAUTOMATICA';
        const LogDetalhe = 'Falha ao atualizar chamado de ID (' + chamadoId + '), status atual não permite atualização (' + chamadoAntes.ChamadoStatus + ')';
        await gravarLog(chamadoId, LogAcao, 'SISTEMA', LogDetalhe, chamadoId);
        // ---
        return;
    }

    // Verificar se retornou uma urgencia válida
    if (classificacao.urgencia) {
        const urgenciasPermitidas = ['BAIXA', 'MEDIA', 'ALTA', 'URGENTE'];
        if (!urgenciasPermitidas.includes(classificacao.urgencia)) {
            console.log(`⚠️ Chamado ${chamadoId} retornou uma classificação de urgência inválida ${classificacao.urgencia}, não será atualizado`);
            // --- Gravar de falha na atualização de urgencia
            const LogAcao = 'FALHAATUALIZARURGENCIACHAMADOAUTOMATICA';
            const LogDetalhe = 'Falha ao atualizar chamado de ID (' + chamadoId + '), urgência inválida (' + classificacao.urgencia + ')';
            await gravarLog(chamadoId, LogAcao, 'SISTEMA', LogDetalhe, chamadoId);
            // ---
            return;
        }
    } else {
        console.log(`⚠️ Chamado ${chamadoId} não retornou uma classificação de urgência, não será atualizado`);
        // --- Gravar de falha na atualização de urgencia
        const LogAcao = 'FALHAATUALIZARURGENCIACHAMADOAUTOMATICA';
        const LogDetalhe = 'Falha ao atualizar chamado de ID (' + chamadoId + '), urgencia indefinida';
        await gravarLog(chamadoId, LogAcao, 'SISTEMA', LogDetalhe, chamadoId);
        // ---
        return;
    }

    let risco_vida_humana = false;
    let risco_vida_animal = false;
    let bloqueio_via = false;
    let tipo_chamanado = 22;

    if (!isNaN(parseInt(classificacao.risco_vida_humana))) {
        if (parseInt(classificacao.risco_vida_humana) === 1) {
            risco_vida_humana = true;
        }
    }

    if (!isNaN(parseInt(classificacao.risco_vida_animal))) {
        if (parseInt(classificacao.risco_vida_animal) === 1) {
            risco_vida_animal = true;
        }
    }

    if (!isNaN(parseInt(classificacao.bloqueio_via))) {
        if (parseInt(classificacao.bloqueio_via) === 1) {
            bloqueio_via = true;
        }
    }

    if (!isNaN(parseInt(classificacao.tipo_chamanado))) {
        tipo_chamanado = parseInt(classificacao.tipo_chamanado);
    }

    await prisma.chamado.update({
        where: { ChamadoId: chamadoId },
        data: {
            ChamadoUrgencia: classificacao.urgencia,
            ChamadoBloqueioVia: bloqueio_via,
            ChamadoRiscoVidaAnimal: risco_vida_animal,
            ChamadoRiscoVidaHumana: risco_vida_humana,
            TipSupId: tipo_chamanado,
            ChamadoStatus: 'PENDENTE'
        }
    });

    // Registrar no histórico
    await prisma.historicoChamado.create({
        data: {
            ChamadoId: chamadoId,
            HistChamadoDescricao: `Classificação automática: Urgência ${classificacao.urgencia}`,
            HistChamadoDt: getBrasilDateTime(),
            HistChamadoUsuarioVer: 'GESTEC'
        }
    });

    console.log(`✅ Chamado ${chamadoId} atualizado. Urgência: ${classificacao.urgencia}`);

}

class ClassificadorRabbitMQ {
    constructor() {
        this.isInitialized = false;
        this.processando = new Map();
    }

    async init() {
        if (this.isInitialized) return;

        try {
            await rabbitmq.connect();

            // Consumir resultados da classificação
            await rabbitmq.consume('classificacao_resultados', async (message) => {
                await this.processarResultado(message);
            });

            this.isInitialized = true;
            console.log('✅ Classificador RabbitMQ inicializado');
        } catch (error) {
            console.error('❌ Erro ao inicializar classificador RabbitMQ:', error);
            throw error;
        }
    }

    // Envia chamado para classificação - ASSÍNCRONO
    // Não espera o resultado, apenas publica na fila
    async classificar(chamadoId, dadosClassificacao) {
        try {
            await this.init();

            const mensagem = {
                chamadoId,
                dados: dadosClassificacao,
                timestamp: new Date().toISOString(),
                tentativas: 0,
                maxTentativas: 3
            };

            console.log(`📤 Enviando chamado ${chamadoId} para classificação...`);

            const publicado = await rabbitmq.publish('classificacao_chamados', mensagem);

            if (!publicado) {
                console.log(`⚠️ Falha ao publicar mensagem para ${chamadoId}`);
                return false;
            }

            // ✅ Retornar apenas uma confirmação, não o resultado
            console.log(`✅ Chamado ${chamadoId} enviado para fila de classificação`);
            return { status: 'enfileirado', chamadoId };

        } catch (error) {
            console.error(`❌ Erro ao enviar chamado ${chamadoId} para fila:`, error);
            return false;
        }
    }

    // Processa o resultado da classificação (consumido da fila)
    async processarResultado(message) {
        try {
            const { chamadoId, resultado, erro, tentativas } = message;

            console.log(`📥 Resultado recebido para chamado ${chamadoId}:`, resultado);

            if (resultado && !erro) {
                // Usar a função do service para atualizar
                await atualizarChamadoComClassificacao(chamadoId, resultado);
                console.log(`✅ Chamado ${chamadoId} atualizado com classificação`);
            } else if (erro) {
                console.log(`❌ Erro na classificação do chamado ${chamadoId}: ${erro}`);

                if (tentativas < 3) {
                    console.log(`🔄 Reenfileirando chamado ${chamadoId} (tentativa ${tentativas + 1}/3)`);
                    await rabbitmq.publish('classificacao_chamados', {
                        ...message,
                        tentativas: tentativas + 1
                    });
                } else {
                    console.log(`💀 Chamado ${chamadoId} excedeu limite de tentativas. Descartando.`);
                    await this.registrarFalha(chamadoId, erro);
                }
            }

        } catch (error) {
            console.error(`❌ Erro ao processar resultado:`, error);
        }
    }

    // Atualiza o chamado com a classificação
    async atualizarChamado(chamadoId, classificacao) {
        try {
            const chamadoAntes = await prisma.chamado.findUnique({
                where: { ChamadoId: chamadoId },
                select: { ChamadoStatus: true }
            });

            if (!chamadoAntes) {
                console.log(`⚠️ Chamado ${chamadoId} não encontrado para atualização`);
                return;
            }

            // Verificar se o chamado ainda está em um status que permite classificação
            const statusPermitidos = ['PROCESSAMENTO', 'PENDENTE', 'FALTAINFORMACAO'];
            if (!statusPermitidos.includes(chamadoAntes.ChamadoStatus)) {
                console.log(`⚠️ Chamado ${chamadoId} está com status ${chamadoAntes.ChamadoStatus}, não será atualizado`);
                return;
            }

            let chamadoStatus = 'PENDENTE';
            if (chamadoAntes.ChamadoStatus !== 'FALTAINFORMACAO' &&
                chamadoAntes.ChamadoStatus !== 'PROCESSAMENTO') {
                chamadoStatus = chamadoAntes.ChamadoStatus;
            }

            await prisma.chamado.update({
                where: { ChamadoId: chamadoId },
                data: {
                    ChamadoUrgencia: classificacao.urgencia,
                    ChamadoStatus: chamadoStatus
                }
            });

            console.log(`✅ Chamado ${chamadoId} atualizado. Urgência: ${classificacao.urgencia}`);

            // Registrar no histórico
            await prisma.historicoChamado.create({
                data: {
                    ChamadoId: chamadoId,
                    HistChamadoDescricao: `Classificação automática: Urgência ${classificacao.urgencia}`,
                    HistChamadoDt: new Date(),
                    HistChamadoUsuario: 'Sistema',
                    HistChamadoAcao: 'CLASSIFICACAO',
                    HistChamadoUsuarioVer: 'GESTEC'
                }
            });

        } catch (error) {
            console.error(`❌ Erro ao atualizar chamado ${chamadoId}:`, error);
        }
    }

    // Registra falha na classificação
    async registrarFalha(chamadoId, erro) {
        try {
            await prisma.historicoChamado.create({
                data: {
                    ChamadoId: chamadoId,
                    HistChamadoDescricao: `Falha na classificação automática: ${erro}`,
                    HistChamadoDt: new Date(),
                    HistChamadoUsuario: 'Sistema',
                    HistChamadoAcao: 'ERRO_CLASSIFICACAO',
                    HistChamadoUsuarioVer: 'GESTEC'
                }
            });
            console.log(`📝 Falha registrada no histórico do chamado ${chamadoId}`);
        } catch (error) {
            console.error(`❌ Erro ao registrar falha:`, error);
        }
    }
}

const classificadorRabbitMQ = new ClassificadorRabbitMQ()
module.exports = { classificadorRabbitMQ, atualizarChamadoComClassificacao };