// src/controllers/mineracaoController.js
const prisma = require('../prisma.js');
//const { spawn } = require('child_process');
const path = require('path');
//const { getBrasilDateTime } = require('../utils/dataBrasilObter.js');
const { gravarLog } = require('../utils/logGrava.js');
const { mineracaoRabbitMQ } = require('../services/mineracaoRabbitMQ');

/*
const PYTHON_PATH =
  process.env.PYTHON_MINERACAO ||
  '/home/luispedro/PI-6SM-DSM-API-WEB-IA-MSG/API/venv/bin/python';

const SCRIPT_PATH = path.join(__dirname, '..', 'md', 'mineracao.py');

// ============================================================
// Executa o script Python e atualiza o registro da execução
// ============================================================
function dispararScriptPython(unidadeId, calibrar) {
  return new Promise((resolve, reject) => {
    const args = ['--unidade-id', String(unidadeId)];
    if (calibrar) args.push('--calibrar');

    //console.log(`🐍 Executando: ${PYTHON_PATH} ${SCRIPT_PATH} ${args.join(' ')}`);

    const processo = spawn(PYTHON_PATH, [SCRIPT_PATH, ...args], {
      cwd: path.join(__dirname, '..', 'ia')
    });

    processo.on('error', async (err) => {
      //console.error('Erro ao iniciar processo Python:', err);
      reject(err);
    });

    processo.on('close', async (code) => {
      //console.log(`[mineracao na unidade:${unidadeId}] processo encerrado com código ${code}`);
    });
  });
}
*/

class MineracaoController {
  // ============================================================
  // LISTAR execuções (com paginação e filtros)
  // ============================================================
  async listarExecucoes(req, res) {
    try {
      const { unidadeId, status, pagina = 1, limite = 10 } = req.query;

      if (req.usuario.usuarioTipo !== 'ADMINISTRADOR') {
        return res.status(403).json({
          error: 'Apenas administradores podem visualizar execuções de mineração'
        });
      }

      const filtro = {};
      if (unidadeId) {
        const uid = parseInt(unidadeId);
        if (!isNaN(uid)) filtro.UnidadeId = uid;
      }
      if (status) {
        const statusValidos = [
          'EXECUTANDO',
          'CONCLUIDA',
          'ERRO'
        ];
        if (!statusValidos.includes(status)) {
          return res.status(400).json({
            error: `Status inválido. Use: ${statusValidos.join(', ')}`
          });
        }
        filtro.ExecucaoStatus = status;
      }

      //console.log('Listando execuções com filtro:', filtro, 'pagina:', pagina, 'limite:', limite);

      const paginaAtual = parseInt(pagina) || 1;
      const limitePorPagina = parseInt(limite) || 10;
      const skip = (paginaAtual - 1) * limitePorPagina;

      const [execucoes, total] = await prisma.$transaction([
        prisma.execucaoMineracao.findMany({
          where: filtro,
          orderBy: { ExecucaoDtInicio: 'desc' },
          skip,
          take: limitePorPagina,
          include: {
            Unidade: {
              select: {
                UnidadeId: true,
                UnidadeNome: true,
                UnidadeStatus: true
              }
            },
            _count: {
              select: { Clusters: true }
            }
          }
        }),
        prisma.execucaoMineracao.count({ where: filtro })
      ]);

      //console.log(`Execuções encontradas: ${JSON.stringify(execucoes)}, total: ${total}`);

      return res.status(200).json({
        data: execucoes,
        paginacao: {
          paginaAtual,
          limitePorPagina,
          totalRegistros: total,
          totalPaginas: Math.ceil(total / limitePorPagina)
        }
      });
    } catch (error) {
      console.error('Erro ao listar execuções:', error);
      return res.status(500).json({ error: 'Erro ao listar execuções' });
    }
  }

  // ============================================================
  // BUSCAR execução por ID com clusters detalhados
  // ============================================================
  async buscarExecucaoPorId(req, res) {
    try {
      const { id } = req.params;

      if (req.usuario.usuarioTipo !== 'ADMINISTRADOR') {
        return res.status(403).json({
          error: 'Apenas administradores podem visualizar execuções'
        });
      }

      const execucao = await prisma.execucaoMineracao.findUnique({
        where: { ExecucaoId: id },
        include: {
          Unidade: {
            select: {
              UnidadeId: true,
              UnidadeNome: true,
              UnidadeStatus: true
            }
          },
          Clusters: {
            orderBy: { ClusterNumero: 'asc' },
            include: {
              ClusterTipoSuporte: {
                include: {
                  TipoSuporte: {
                    select: {
                      TipSupId: true,
                      TipSupNom: true
                    }
                  }
                }
              },
              ClusterUrgencia: true,
              _count: {
                select: { ChamadosCluster: true }
              }
            }
          }
        }
      });

      if (!execucao) {
        return res.status(404).json({ error: 'Execução não encontrada' });
      }

      return res.status(200).json({ data: execucao });
    } catch (error) {
      console.error('Erro ao buscar execução:', error);
      return res.status(500).json({ error: 'Erro ao buscar execução' });
    }
  }

  // ============================================================
  // CONSULTAR configuração atual da unidade
  // ============================================================
  async buscarConfiguracao(req, res) {
    try {
      const { unidadeId } = req.params;

      if (req.usuario.usuarioTipo !== 'ADMINISTRADOR') {
        return res.status(403).json({
          error: 'Apenas administradores podem visualizar configurações'
        });
      }

      const uid = parseInt(unidadeId);
      if (isNaN(uid)) {
        return res.status(400).json({ error: 'ID da unidade inválido' });
      }

      const configuracao = await prisma.configuracaoMineracao.findUnique({
        where: { UnidadeId: uid }
      });

      // Retorna null se não existir — o front mostra "sem configuração"
      return res.status(200).json({ data: configuracao });
    } catch (error) {
      console.error('Erro ao buscar configuração:', error);
      return res.status(500).json({ error: 'Erro ao buscar configuração' });
    }
  }

  // ============================================================
  // CRIAR configuração de mineração para uma unidade
  // ============================================================
  /*
  async criarConfiguracao(req, res) {
    try {
      if (req.usuario.usuarioTipo !== 'ADMINISTRADOR') {
        return res.status(403).json({
          error: 'Apenas administradores podem criar configurações'
        });
      }

      const { unidadeId } = req.params;
      const uid = parseInt(unidadeId);
      if (isNaN(uid)) {
        return res.status(400).json({ error: 'ID da unidade inválido' });
      }

      const {
        ConfiguracaoQtdClusters,
        ConfiguracaoQtdChamadosBase,
        ConfiguracaoPercentualRecalibracao
      } = req.body;

      if (!ConfiguracaoQtdClusters || ConfiguracaoQtdClusters < 2) {
        return res.status(400).json({
          error: 'Quantidade de clusters deve ser maior ou igual a 2'
        });
      }
      if (!ConfiguracaoQtdChamadosBase || ConfiguracaoQtdChamadosBase < 1) {
        return res.status(400).json({
          error: 'Quantidade de chamados base deve ser maior que 0'
        });
      }

      const unidade = await prisma.unidade.findUnique({ where: { UnidadeId: uid } });
      if (!unidade) {
        return res.status(404).json({ error: 'Unidade não encontrada' });
      }

      const existente = await prisma.configuracaoMineracao.findUnique({
        where: { UnidadeId: uid }
      });
      if (existente) {
        return res.status(409).json({
          error: 'Esta unidade já possui uma configuração. Utilize a edição.'
        });
      }

      const configuracao = await prisma.configuracaoMineracao.create({
        data: {
          UnidadeId: uid,
          ConfiguracaoQtdClusters: parseInt(ConfiguracaoQtdClusters),
          ConfiguracaoQtdChamadosBase: parseInt(ConfiguracaoQtdChamadosBase),
          ConfiguracaoPercentualRecalibracao: ConfiguracaoPercentualRecalibracao
            ? parseFloat(ConfiguracaoPercentualRecalibracao)
            : 20,
          ConfiguracaoDtCalibracao: getBrasilDateTime(),
          ConfiguracaoAtivo: true
        }
      });

      const LogAcao = 'CRIARCONFIGMINERACAO';
      const LogDetalhe = `Configuração de mineração criada para unidade ${uid}`;
      await gravarLog(
        String(req.usuario.usuarioId).trim(),
        LogAcao,
        req.usuario.usuarioTipo,
        LogDetalhe,
        String(configuracao.ConfiguracaoId).trim()
      );

      return res.status(201).json({
        message: 'Configuração criada com sucesso',
        data: configuracao
      });
    } catch (error) {
      console.error('Erro ao criar configuração:', error);
      return res.status(500).json({ error: 'Erro ao criar configuração' });
    }
  }
  */

  // ============================================================
  // EXECUTAR mineração (chama o script Python)
  // ============================================================
  async executarMineracao(req, res) {
    try {
      if (req.usuario.usuarioTipo !== 'ADMINISTRADOR') {
        return res.status(403).json({
          error: 'Apenas administradores podem executar mineração'
        });
      }

      const { unidadeId } = req.params;
      const uid = parseInt(unidadeId);
      if (isNaN(uid)) {
        return res.status(400).json({ error: 'ID da unidade inválido' });
      }

      const { calibrar = false } = req.body;

      const unidade = await prisma.unidade.findUnique({ where: { UnidadeId: uid } });
      if (!unidade) {
        return res.status(404).json({ error: 'Unidade não encontrada' });
      }

      // Impede execuções simultâneas para a mesma unidade
      const emAndamento = await prisma.execucaoMineracao.findFirst({
        where: {
          UnidadeId: uid,
          ExecucaoStatus: 'EXECUTANDO'
        }
      });

      if (emAndamento) {
        return res.status(409).json({
          error: 'Já existe uma execução em andamento para esta unidade',
          execucaoId: emAndamento.ExecucaoId
        });
      }

      // Dispara o Python em background — se não der erro na chamada, não bloqueia a resposta
      /*
      dispararScriptPython(uid, calibrar).catch((err) => {
        console.error('Erro no processo Python de mineração:', err);
        return res.status(500).json({ error: 'Erro ao executar mineração (PY)' });
      });
      */

      const publicado = await mineracaoRabbitMQ.enfileirarExecucao(
        uid,
        calibrar
      );

      if (!publicado) {
        return res.status(500).json({ error: 'Erro ao executar mineração (PY)' });
      } else {
        const LogAcao = 'EXECUTARMINERACAO';
        const LogDetalhe = `Execução de mineração iniciada para unidade ${uid} (calibrar=${calibrar})`;
        await gravarLog(
          String(req.usuario.usuarioId).trim(),
          LogAcao,
          req.usuario.usuarioTipo,
          LogDetalhe,
          String(uid).trim()
        );

        return res.status(202).json({
          message: 'Execução de mineração iniciada'
        });
      }
    } catch (error) {
      console.error('Erro ao executar mineração:', error);
      return res.status(500).json({ error: 'Erro ao executar mineração' });
    }
  }

  // ============================================================
  // DELETAR execução (apenas para limpeza de histórico)
  // ============================================================
  async deletarExecucao(req, res) {
    try {
      if (req.usuario.usuarioTipo !== 'ADMINISTRADOR') {
        return res.status(403).json({
          error: 'Apenas administradores podem excluir execuções'
        });
      }

      const { id } = req.params;

      const execucao = await prisma.execucaoMineracao.findUnique({
        where: { ExecucaoId: id }
      });

      if (!execucao) {
        return res.status(404).json({ error: 'Execução não encontrada' });
      }

      if (['EXECUTANDO'].includes(execucao.ExecucaoStatus)) {
        return res.status(400).json({
          error: 'Não é possível excluir uma execução em andamento'
        });
      }

      // Buscar todos os IDs de Cluster pertencentes à execução
      const clusters = await prisma.cluster.findMany({
        where: { ExecucaoId: id },
        select: { ClusterId: true }
      });
      const clusterIds = clusters.map((c) => c.ClusterId);

      // Excluir em transação, dos netos aos pais
      await prisma.$transaction(async (tx) => {
        if (clusterIds.length > 0) {
          // 1) Filhos de Cluster
          await tx.clusterUrgencia.deleteMany({
            where: { ClusterId: { in: clusterIds } }
          });

          await tx.clusterTipoSuporte.deleteMany({
            where: { ClusterId: { in: clusterIds } }
          });

          await tx.chamadoCluster.deleteMany({
            where: { ClusterId: { in: clusterIds } }
          });

          // 2) Clusters
          await tx.cluster.deleteMany({
            where: { ClusterId: { in: clusterIds } }
          });
        }

        // 3) Execução
        await tx.execucaoMineracao.delete({
          where: { ExecucaoId: id }
        });
      });

      const LogAcao = 'DELETARMINERACAO';
      const LogDetalhe = `Execução de mineração ${id} e seus vínculos excluídos (${clusterIds.length} clusters)`;
      await gravarLog(
        String(req.usuario.usuarioId).trim(),
        LogAcao,
        req.usuario.usuarioTipo,
        LogDetalhe,
        String(id).trim()
      );

      return res.status(200).json({ message: 'Execução excluída com sucesso' });
    } catch (error) {
      console.error('Erro ao excluir execução:', error);
      return res.status(500).json({ error: 'Erro ao excluir execução' });
    }
  }

}

module.exports = new MineracaoController();