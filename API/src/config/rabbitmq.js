// src/config/rabbitmq.js
const amqp = require('amqplib');

class RabbitMQConfig {
  constructor() {
    this.connection = null;
    this.channel = null;              // canal principal: setup + publish
    this.consumerChannels = new Map(); // fila → canal dedicado
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 5000;
  }

  async connect() {
    try {
      const url = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
      console.log(`🔌 Conectando ao RabbitMQ em ${url}...`);

      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();

      await this.setupQueues();

      this.isConnected = true;
      this.reconnectAttempts = 0;

      console.log('✅ Conectado ao RabbitMQ com sucesso!');

      this.connection.on('close', () => {
        console.log('⚠️ Conexão com RabbitMQ fechada. Tentando reconectar...');
        this.isConnected = false;
        this.consumerChannels.clear();  // os canais morreram junto
        this.reconnect();
      });

      this.connection.on('error', (err) => {
        console.error('❌ Erro na conexão RabbitMQ:', err);
      });

      return this.channel;
    } catch (error) {
      console.error('❌ Erro ao conectar ao RabbitMQ:', error);
      this.reconnect();
      throw error;
    }
  }

  async setupQueues() {
    await this.channel.assertQueue('classificacao_chamados', {
      durable: true,
      arguments: {
        'x-message-ttl': 60000,
        'x-max-retries': 3
      }
    });

    await this.channel.assertQueue('mineracao_execucoes', { durable: true });

    await this.channel.assertExchange('classificacao_exchange', 'direct', {
      durable: true
    });

    await this.channel.bindQueue('classificacao_chamados', 'classificacao_exchange', 'classificar');

    console.log('✅ Filas e exchanges configuradas');
  }

  async reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Número máximo de tentativas de reconexão atingido');
      return;
    }
    this.reconnectAttempts++;
    console.log(`🔄 Tentando reconectar em ${this.reconnectDelay}ms... (tentativa ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        console.error('❌ Falha na reconexão:', error);
        this.reconnect();
      }
    }, this.reconnectDelay);
  }

  async publish(queue, message) {
    if (!this.isConnected) {
      console.log('⏳ Aguardando reconexão...');
      await this.connect();
    }
    try {
      this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
        persistent: true,
        contentType: 'application/json'
      });
      return true;
    } catch (error) {
      console.error('❌ Erro ao publicar mensagem:', error);
      return false;
    }
  }

  /**
   * Consome uma fila com canal dedicado.
   *
   * @param {string}   queue     Nome da fila
   * @param {Function} callback  async (content) => void
   * @param {number}   prefetch  Máximo de mensagens não-confirmadas (default 1)
   *
   * Cada chamada cria um canal próprio. Isso isola o prefetch e evita que
   * um erro em uma fila derrube o consumidor de outra.
   */
  async consume(queue, callback, prefetch = 1) {
    if (!this.isConnected) {
      await this.connect();
    }

    // Se já existe canal para esta fila, reusa
    if (this.consumerChannels.has(queue)) {
      console.log(`ℹ️ Consumidor para ${queue} já registrado. Ignorando.`);
      return;
    }

    try {
      const consumerChannel = await this.connection.createChannel();

      //await consumerChannel.assertQueue(queue, { durable: true });
      await consumerChannel.prefetch(prefetch);

      consumerChannel.on('error', (err) => {
        console.error(`❌ Erro no canal do consumidor de ${queue}:`, err);
        this.consumerChannels.delete(queue);
      });

      consumerChannel.on('close', () => {
        console.warn(`⚠️ Canal do consumidor de ${queue} fechado`);
        this.consumerChannels.delete(queue);
      });

      await consumerChannel.consume(queue, async (msg) => {
        if (!msg) return;

        let content;
        try {
          content = JSON.parse(msg.content.toString());
        } catch (e) {
          console.error(`❌ Payload inválido em ${queue}, descartando:`, e);
          consumerChannel.nack(msg, false, false);
          return;
        }

        try {
          await callback(content);
          consumerChannel.ack(msg);
        } catch (error) {
          console.error(`❌ Erro ao processar mensagem de ${queue}:`, error);
          // Descarta — o worker já tem sua própria lógica de retry via publish
          consumerChannel.nack(msg, false, false);
        }
      }, { noAck: false });

      this.consumerChannels.set(queue, consumerChannel);
      console.log(`✅ Escutando fila: ${queue} (prefetch=${prefetch}, canal dedicado)`);
    } catch (error) {
      console.error(`❌ Erro ao consumir fila ${queue}:`, error);
      throw error;
    }
  }

  async close() {
    try {
      for (const [queue, ch] of this.consumerChannels) {
        try { await ch.close(); } catch (e) { /* ignore */ }
      }
      this.consumerChannels.clear();

      if (this.channel) await this.channel.close();
      if (this.connection) await this.connection.close();

      this.isConnected = false;
      console.log('🔌 Conexão RabbitMQ fechada');
    } catch (error) {
      console.error('❌ Erro ao fechar conexão:', error);
    }
  }
}

module.exports = new RabbitMQConfig();