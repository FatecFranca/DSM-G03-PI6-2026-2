// src/workers/classificadorWorker.js
const { PythonShell } = require('python-shell');
const path = require('path');
const rabbitmq = require('../config/rabbitmq');
const { atualizarChamadoComClassificacao } = require('../services/chamadoClassificacaoService');
require('dotenv').config();

class ClassificadorWorker {
  constructor() {
    this.scriptPath = path.join(__dirname, '..', 'ia');
    this.scriptName = 'classificadorUrgencia.py';
    this.classificador = null;
    this.isReady = false;
  }

  async iniciar() {
    console.log('🚀 Iniciando Worker de Classificação...');

    await this.inicializarClassificador();
    await rabbitmq.connect();

    await rabbitmq.consume('classificacao_chamados', async (message) => {
      await this.processarClassificacao(message);
    }, 1); // Limita a 1 mensagem por vez para evitar sobrecarga do classificador

    console.log('✅ Worker de Classificação pronto');
  }

  async inicializarClassificador() {
    console.log('process.env.PYTHON = ', process.env.PYTHON);
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
      }, 60000);

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

      // Detecta morte do processo Python para reinicializar na próxima mensagem
      this.classificador.on('close', (code) => {
        if (this.isReady) {
          console.warn(`⚠️ Processo Python encerrou (code ${code}). Marcando como não pronto.`);
          this.isReady = false;
        }
      });
    });
  }

  async processarClassificacao(message) {
    const { chamadoId, dados, tentativas = 0, maxTentativas = 3 } = message;

    console.log(`🔨 Processando classificação do chamado ${chamadoId} (tentativa ${tentativas + 1}/${maxTentativas})`);

    try {
      if (!this.isReady) {
        await this.inicializarClassificador();
      }

      const resultado = await this.classificar(dados);

      // Grava direto no BD — sem passar por classificacao_resultados
      const persistencia = await atualizarChamadoComClassificacao(chamadoId, resultado);

      if (persistencia.ok) {
        console.log(`✅ Chamado ${chamadoId} classificado e gravado: ${resultado.urgencia}`);
      } else {
        // Motivos "de negócio" (status inválido, urgência inválida) NÃO devem
        // reenfileirar — reenviar não vai resolver.
        console.warn(`⚠️ Chamado ${chamadoId} não foi persistido (${persistencia.motivo}). Descartando.`);
      }
    } catch (error) {
      console.error(`❌ Erro ao classificar chamado ${chamadoId}:`, error);

      if (tentativas < maxTentativas) {
        console.log(`🔄 Reenfileirando chamado ${chamadoId} (tentativa ${tentativas + 2}/${maxTentativas})`);
        await rabbitmq.publish('classificacao_chamados', {
          ...message,
          tentativas: tentativas + 1
        });
      } else {
        console.error(`💀 Chamado ${chamadoId} excedeu limite de tentativas. Descartando.`);
        // Opcional: gravar log de falha
        try {
          const { gravarLog } = require('../utils/logGrava.js');
          await gravarLog(
            chamadoId,
            'FALHACLASSIFICACAOAUTOMATICA',
            'SISTEMA',
            `Falha após ${maxTentativas} tentativas: ${error.message || 'erro desconhecido'}`,
            chamadoId
          );
        } catch (logErr) {
          console.error('Erro ao gravar log de falha:', logErr);
        }
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

if (require.main === module) {
  const worker = new ClassificadorWorker();
  worker.iniciar().catch(console.error);
}

module.exports = ClassificadorWorker;