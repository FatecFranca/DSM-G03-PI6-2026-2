// src/workers/classificadorWorker.js
const { PythonShell } = require('python-shell');
const path = require('path');
const rabbitmq = require('../config/rabbitmq');

class ClassificadorWorker {
    constructor() {
        this.scriptPath = path.join(__dirname, '..', 'ia');
        this.scriptName = 'classificadorUrgencia.py';
        this.classificador = null;
        this.isReady = false;
    }

    async iniciar() {
        console.log('🚀 Iniciando Worker de Classificação...');
        
        // Inicializar o classificador Python
        await this.inicializarClassificador();
        
        // Conectar ao RabbitMQ
        await rabbitmq.connect();
        
        // Consumir fila de classificação
        await rabbitmq.consume('classificacao_chamados', async (message) => {
            await this.processarClassificacao(message);
        });
        
        console.log('✅ Worker de Classificação pronto');
    }

    async inicializarClassificador() {
        return new Promise((resolve, reject) => {
            const options = {
                mode: 'text',
                pythonPath: process.env.PYTHON || 'python',
                pythonOptions: ['-u'],
                scriptPath: this.scriptPath,
                args: []
            };
            
            this.classificador = new PythonShell(this.scriptName, options);
            
            const timeout = setTimeout(() => {
                reject(new Error('Timeout ao inicializar classificador'));
            }, 20000);
            
            this.classificador.once('message', (message) => {
                clearTimeout(timeout);
                if (message === 'READY') {
                    this.isReady = true;
                    console.log('✅ Classificador Python pronto');
                    resolve();
                } else {
                    reject(new Error(`Resposta inesperada: ${message}`));
                }
            });
            
            this.classificador.once('error', (err) => {
                clearTimeout(timeout);
                reject(err);
            });
        });
    }

    async processarClassificacao(message) {
        const { chamadoId, dados, tentativas = 0 } = message;
        
        console.log(`🔨 Processando classificação do chamado ${chamadoId} (tentativa ${tentativas + 1})`);
        
        try {
            if (!this.isReady) {
                await this.inicializarClassificador();
            }
            
            const resultado = await this.classificar(dados);
            
            // Publicar resultado
            await rabbitmq.publish('classificacao_resultados', {
                chamadoId,
                resultado,
                timestamp: new Date().toISOString()
            });
            
            console.log(`✅ Chamado ${chamadoId} classificado: ${resultado.urgencia}`);
            
        } catch (error) {
            console.error(`❌ Erro ao classificar chamado ${chamadoId}:`, error);
            
            // Tentar novamente se não excedeu o limite
            if (tentativas < 3) {
                console.log(`🔄 Reenfileirando chamado ${chamadoId} (tentativa ${tentativas + 2})`);
                await rabbitmq.publish('classificacao_chamados', {
                    ...message,
                    tentativas: tentativas + 1
                });
            } else {
                // Publicar erro
                await rabbitmq.publish('classificacao_resultados', {
                    chamadoId,
                    erro: error.message || 'Erro na classificação',
                    timestamp: new Date().toISOString()
                });
            }
        }
    }

    classificar(dados) {
        return new Promise((resolve, reject) => {
            const dadosStr = JSON.stringify(dados);
            
            const messageHandler = (message) => {
                try {
                    const result = JSON.parse(message);
                    if (result.error) {
                        reject(new Error(result.error));
                    } else {
                        resolve(result);
                    }
                } catch (e) {
                    reject(new Error(`Erro ao parsear JSON: ${e.message}`));
                }
                this.classificador.off('message', messageHandler);
                this.classificador.off('error', errorHandler);
            };
            
            const errorHandler = (err) => {
                reject(err);
                this.classificador.off('message', messageHandler);
                this.classificador.off('error', errorHandler);
            };
            
            this.classificador.once('message', messageHandler);
            this.classificador.once('error', errorHandler);
            
            this.classificador.send(dadosStr);
        });
    }
}

// Executar o worker
if (require.main === module) {
    const worker = new ClassificadorWorker();
    worker.iniciar().catch(console.error);
}

module.exports = ClassificadorWorker;