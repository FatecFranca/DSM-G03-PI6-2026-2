// src/workers/mineracaoWorker.js
const { spawn } = require('child_process');
const path = require('path');
const rabbitmq = require('../config/rabbitmq');
const prisma = require('../prisma');
const { getBrasilDateTime } = require('../utils/dataBrasilObter');
const { gravarLog } = require('../utils/logGrava');
require('dotenv').config();

const PYTHON_PATH =
  process.env.PYTHON_MINERACAO || 'python';

const SCRIPT_PATH = path.join(__dirname, '..', 'md', 'mineracao.py');

class MineracaoWorker {
  async iniciar() {
    console.log('🚀 Iniciando Worker de Mineração...');

    await rabbitmq.connect();

    // Recuperação: qualquer execução em EXECUTANDO que exista no banco
    // no momento em que o worker sobe é órfã (mensagem já foi consumida
    // ou o worker caiu durante o processamento). Marca como ERRO.
    await this.marcarExecucoesOrfas();

    await rabbitmq.consume('mineracao_execucoes', async (message) => {
      await this.processarMineracao(message);
    }, 1); // Limita a 1 mensagem por vez para evitar sobrecarga do script Python

    console.log('✅ Worker de Mineração pronto');
  }

  async marcarExecucoesOrfas() {
    try {
      const resultado = await prisma.execucaoMineracao.updateMany({
        where: {
          ExecucaoStatus: 'EXECUTANDO'
        },
        data: {
          ExecucaoStatus: 'ERRO',
          ExecucaoDtFim: getBrasilDateTime(),
          ExecucaoMensagemErro: 'Execução interrompida (worker reiniciado)'
        }
      });
      if (resultado.count > 0) {
        console.warn(`⚠️ ${resultado.count} execução(ões) órfã(s) marcada(s) como ERRO`);
      }
    } catch (err) {
      console.error('Erro ao marcar execuções órfãs:', err);
    }
  }

  async processarMineracao(message) {
    const { execucaoId, unidadeId, calibrar = false, tentativas = 0, maxTentativas = 1 } = message;

    console.log(`🔨 Processando mineração na unidade ${unidadeId}, calibrar=${calibrar})`);

    try {
      // Executa Python (bloqueia até terminar)
      const { code, stderr } = await this.dispararScriptPython(unidadeId, calibrar);

      await gravarLog(
        String(unidadeId).trim(),
        'MINERACAOFINALIZADA',
        'SISTEMA',
        `Execução finalizada (code=${code} | stderr=${stderr})`,
        String(execucaoId).trim()
      );
    } catch (error) {
      console.error(`❌ Erro ao processar mineração na unidade ${unidadeId}:`, error);

      if (tentativas < maxTentativas) {
        console.log(`🔄 Reenfileirando execução ${execucaoId} (tentativa ${tentativas + 2}/${maxTentativas + 1})`);
        await rabbitmq.publish('mineracao_execucoes', {
          ...message,
          tentativas: tentativas + 1
        });
      } else {
        console.error(`💀 Execução excedeu limite de tentativas. Descartando.`);
      }
    }
  }

  dispararScriptPython(unidadeId, calibrar) {
    return new Promise((resolve, reject) => {
      const args = ['--unidade-id', String(unidadeId)];
      if (calibrar) args.push('--calibrar');

      console.log(`🐍 Executando: ${PYTHON_PATH} ${SCRIPT_PATH} ${args.join(' ')}`);

      const processo = spawn(PYTHON_PATH, [SCRIPT_PATH, ...args], {
        cwd: path.join(__dirname, '..', 'md')   // ← cwd da pasta do script
      });

      let stderr = '';

      processo.stdout.on('data', (data) => {
        process.stdout.write(`[mineracao:${unidadeId}] ${data.toString()}`);
      });

      processo.stderr.on('data', (data) => {
        const txt = data.toString();
        stderr += txt;
        process.stderr.write(`[mineracao:${unidadeId}:err] ${txt}`);
      });

      processo.on('error', (err) => {
        console.error(`Erro ao iniciar processo Python da mineração:`, err);
        reject(err);
      });

      processo.on('close', (code) => {
        console.log(`[mineracao unidade ${unidadeId}] processo encerrado com código ${code}`);
        resolve({ code, stderr });
      });
    });
  }
}

if (require.main === module) {
  const worker = new MineracaoWorker();
  worker.iniciar().catch((err) => {
    console.error('Falha fatal no worker de mineração:', err);
    process.exit(1);
  });
}

module.exports = MineracaoWorker;
