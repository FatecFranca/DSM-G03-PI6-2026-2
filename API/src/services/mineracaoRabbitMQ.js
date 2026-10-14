// src/services/mineracaoRabbitMQ.js
const rabbitmq = require('../config/rabbitmq');

class MineracaoRabbitMQ {
  constructor() {
    this.isInitialized = false;
  }

  async init() {
    if (this.isInitialized) return;
    try {
      await rabbitmq.connect();
      this.isInitialized = true;
      console.log('✅ Mineracao RabbitMQ inicializado (publisher)');
    } catch (error) {
      console.error('❌ Erro ao inicializar mineracao RabbitMQ:', error);
      throw error;
    }
  }

  async enfileirarExecucao(unidadeId, calibrar) {
    try {
      await this.init();

      const mensagem = {
        unidadeId,
        calibrar: !!calibrar,
        timestamp: new Date().toISOString(),
        tentativas: 0,
        maxTentativas: 1   // mineração normalmente NÃO deve repetir sozinha
      };

      const publicado = await rabbitmq.publish('mineracao_execucoes', mensagem);
      if (!publicado) {
        console.log(`⚠️ Falha ao publicar execução`);
        return false;
      }

      console.log(`✅ Execução na unidade ${unidadeId} enfileirada`);
      return true;
    } catch (error) {
      console.error(`❌ Erro ao enfileirar execução:`, error);
      return false;
    }
  }
}

const mineracaoRabbitMQ = new MineracaoRabbitMQ();
module.exports = { mineracaoRabbitMQ };
