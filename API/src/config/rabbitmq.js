// src/config/rabbitmq.js
const amqp = require('amqplib');

class RabbitMQConfig {
    constructor() {
        this.connection = null;
        this.channel = null;
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
            
            // Criar filas e exchanges
            await this.setupQueues();
            
            this.isConnected = true;
            this.reconnectAttempts = 0;
            
            console.log('✅ Conectado ao RabbitMQ com sucesso!');
            
            // Configurar reconexão automática
            this.connection.on('close', () => {
                console.log('⚠️ Conexão com RabbitMQ fechada. Tentando reconectar...');
                this.isConnected = false;
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
        // Fila para classificação de chamados
        await this.channel.assertQueue('classificacao_chamados', {
            durable: true,
            arguments: {
                'x-message-ttl': 60000, // 1 minuto de TTL
                'x-max-retries': 3
            }
        });
        
        // Fila para resultados da classificação
        await this.channel.assertQueue('classificacao_resultados', {
            durable: true
        });
        
        // Exchange para roteamento
        await this.channel.assertExchange('classificacao_exchange', 'direct', {
            durable: true
        });
        
        // Bind das filas
        await this.channel.bindQueue('classificacao_chamados', 'classificacao_exchange', 'classificar');
        await this.channel.bindQueue('classificacao_resultados', 'classificacao_exchange', 'resultado');
        
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

    async consume(queue, callback) {
        if (!this.isConnected) {
            await this.connect();
        }
        
        try {
            await this.channel.consume(queue, async (msg) => {
                if (msg) {
                    try {
                        const content = JSON.parse(msg.content.toString());
                        await callback(content);
                        this.channel.ack(msg);
                    } catch (error) {
                        console.error('❌ Erro ao processar mensagem:', error);
                        // Rejeitar e reenfileirar
                        this.channel.nack(msg, false, true);
                    }
                }
            }, { noAck: false });
            
            console.log(`✅ Escutando fila: ${queue}`);
        } catch (error) {
            console.error(`❌ Erro ao consumir fila ${queue}:`, error);
        }
    }

    async close() {
        try {
            if (this.channel) {
                await this.channel.close();
            }
            if (this.connection) {
                await this.connection.close();
            }
            this.isConnected = false;
            console.log('🔌 Conexão RabbitMQ fechada');
        } catch (error) {
            console.error('❌ Erro ao fechar conexão:', error);
        }
    }
}

module.exports = new RabbitMQConfig();