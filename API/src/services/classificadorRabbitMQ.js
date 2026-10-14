// src/services/classificadorRabbitMQ.js
const rabbitmq = require('../config/rabbitmq');

class ClassificadorRabbitMQ {
  constructor() {
    this.isInitialized = false;
  }

  async init() {
    if (this.isInitialized) return;
    try {
      await rabbitmq.connect();
      this.isInitialized = true;
      console.log('✅ Classificador RabbitMQ inicializado (publisher)');
    } catch (error) {
      console.error('❌ Erro ao inicializar classificador RabbitMQ:', error);
      throw error;
    }
  }

  // Publica o chamado na fila de classificação. Assíncrono: não espera o resultado.
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

      console.log(`✅ Chamado ${chamadoId} enviado para fila de classificação`);
      return { status: 'enfileirado', chamadoId };
    } catch (error) {
      console.error(`❌ Erro ao enviar chamado ${chamadoId} para fila:`, error);
      return false;
    }
  }
}

const classificadorRabbitMQ = new ClassificadorRabbitMQ();
module.exports = { classificadorRabbitMQ };