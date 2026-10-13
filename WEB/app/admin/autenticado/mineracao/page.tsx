"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Play,
  Settings,
  Eye,
  Trash2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Loader2,
  Database,
  BarChart3,
  Layers,
  CircleDot,
  Info
} from "lucide-react"
import {
  listarExecucoes,
  buscarExecucao,
  buscarConfiguracao,
  executarMineracao,
  deletarExecucao,
  type ExecucaoMineracao,
  type ExecucaoDetalhada,
  type ConfiguracaoMineracao
} from "@/lib/mineracao-service"
import { listarUnidades, type Unidade } from "@/lib/unidade-service"
import { formatarDataBrasil, formatarDecimal, numeroParaLetra } from '@/utils/dateUtils'

// ============================================================
// Modal — aviso de configuração ausente
// ============================================================
function ConfiguracaoAusenteModal({
  isOpen,
  onClose,
  unidade,
  onExecutar
}: {
  isOpen: boolean
  onClose: () => void
  unidade: Unidade | null
  onExecutar: () => void
}) {
  if (!isOpen || !unidade) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-md w-full mx-4 p-6">
        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Info className="text-blue-600 dark:text-blue-400" size={24} />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 text-center mb-2">
          Sem configuração
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-6">
          A unidade <strong>{unidade.UnidadeNome}</strong> ainda não possui uma
          configuração de mineração. Para criá-la, é preciso executar uma
          mineração com calibração forçada.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Fechar
          </button>
          <button
            onClick={() => {
              onClose()
              onExecutar()
            }}
            className="flex-1 px-4 py-2 bg-gray-900 hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 text-white rounded-lg flex items-center justify-center gap-2"
          >
            <Play size={16} />
            Executar agora
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Modal — visualizar configuração existente (somente leitura)
// ============================================================
function ConfiguracaoViewModal({
  isOpen,
  onClose,
  unidade,
  configuracao
}: {
  isOpen: boolean
  onClose: () => void
  unidade: Unidade | null
  configuracao: ConfiguracaoMineracao | null
}) {
  if (!isOpen || !unidade || !configuracao) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-lg w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Configuração de Mineração
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Unidade: {unidade.UnidadeNome}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            <X size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Qtd. Grupos</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {configuracao.ConfiguracaoQtdClusters}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Chamados Base</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {configuracao.ConfiguracaoQtdChamadosBase}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">% Recalibração</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {configuracao.ConfiguracaoPercentualRecalibracao}%
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-3">
              Métricas da última calibração
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Qualidade:</span>{" "}
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {configuracao.ConfiguracaoSilhouetteScore != null
                    ? `${formatarDecimal(configuracao.ConfiguracaoSilhouetteScore * 100, 2)}%`
                    : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Davies-Bouldin:</span>{" "}
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {configuracao.ConfiguracaoDaviesBouldinScore != null
                    ? `${formatarDecimal(configuracao.ConfiguracaoDaviesBouldinScore * 100, 2)}%`
                    : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Estabilidade:</span>{" "}
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {configuracao.ConfiguracaoEstabilidade != null
                    ? `${formatarDecimal(configuracao.ConfiguracaoEstabilidade * 100, 2)}%`
                    : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Score Final:</span>{" "}
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {configuracao.ConfiguracaoScoreCombinado != null
                    ? `${formatarDecimal(configuracao.ConfiguracaoScoreCombinado * 100, 2)}%`
                    : 'N/A'}
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
              Calibrada em:{" "}
              {formatarDataBrasil(configuracao.ConfiguracaoDtCalibracao)}
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-900 hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 text-white rounded-lg"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Modal — detalhes da execução (mesmo do original)
// ============================================================
function ExecucaoDetalheModal({
  isOpen,
  onClose,
  execucaoId
}: {
  isOpen: boolean
  onClose: () => void
  execucaoId: string | null
}) {
  const [execucao, setExecucao] = useState<ExecucaoDetalhada | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !execucaoId) return
    let cancelado = false

    const carregar = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const response = await buscarExecucao(execucaoId)
        if (!cancelado) setExecucao(response.data)
      } catch (err) {
        if (!cancelado) setError("Erro ao carregar execução")
      } finally {
        if (!cancelado) setIsLoading(false)
      }
    }

    carregar()

    const interval = setInterval(async () => {
      try {
        const response = await buscarExecucao(execucaoId)
        if (!cancelado) {
          setExecucao(response.data)
          if (
            response.data.ExecucaoStatus === "CONCLUIDA" ||
            response.data.ExecucaoStatus === "ERRO"
          ) {
            clearInterval(interval)
          }
        }
      } catch (e) {
        // silencioso
      }
    }, 3000)

    return () => {
      cancelado = true
      clearInterval(interval)
    }
  }, [isOpen, execucaoId])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Detalhes da Execução
            </h2>
            {execucao && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {execucao.Unidade?.UnidadeNome} ·{" "}
                {formatarDataBrasil(execucao.ExecucaoDtInicio)}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            <X size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {isLoading && !execucao && (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="animate-spin text-gray-400" size={32} />
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {execucao && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MetricCard
                  icon={<Database size={16} />}
                  label="Chamados"
                  value={execucao.ExecucaoQtdDados}
                />
                <MetricCard
                  icon={<Layers size={16} />}
                  label="Grupos"
                  value={execucao.ExecucaoQtdClusters}
                />
                <MetricCard
                  icon={<BarChart3 size={16} />}
                  label="Qualidade"
                  value={execucao.ExecucaoSilhouetteScore != null
                    ? `${formatarDecimal(execucao.ExecucaoSilhouetteScore * 100, 2)}%`
                    : 'N/A'}
                />
                <MetricCard
                  icon={<BarChart3 size={16} />}
                  label="Davies-Bouldin"
                  value={execucao.ExecucaoDaviesBouldinScore != null
                    ? `${formatarDecimal(execucao.ExecucaoDaviesBouldinScore * 100, 2)}%`
                    : 'N/A'}
                />
                <MetricCard
                  icon={<BarChart3 size={16} />}
                  label="Estabilidade"
                  value={execucao.ExecucaoEstabilidadeScore != null
                    ? `${formatarDecimal(execucao.ExecucaoEstabilidadeScore * 100, 2)}%`
                    : 'N/A'}
                />
                <MetricCard
                  icon={<BarChart3 size={16} />}
                  label="Score Final"
                  value={execucao.ExecucaoScoreCombinado != null
                    ? `${formatarDecimal(execucao.ExecucaoScoreCombinado * 100, 2)}%`
                    : 'N/A'}
                />
                <MetricCard
                  icon={<AlertCircle size={16} />}
                  label="% Menor Cluster"
                  value={
                    execucao.ExecucaoPercentualMenorCluster != null
                      ? `${formatarDecimal(execucao.ExecucaoPercentualMenorCluster * 100)}%`
                      : "N/A"
                  }
                />
                <MetricCard
                  icon={<Clock size={16} />}
                  label="Duração"
                  value={
                    execucao.ExecucaoDtFim
                      ? formatDuracao(execucao.ExecucaoDtInicio, execucao.ExecucaoDtFim)
                      : "Em Andamento"
                  }
                />
              </div>

              {execucao.ExecucaoMensagemErro && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <p className="text-xs font-medium text-red-700 dark:text-red-300 uppercase mb-1">
                    Erro
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-400 font-mono whitespace-pre-wrap">
                    {execucao.ExecucaoMensagemErro}
                  </p>
                </div>
              )}

              {execucao.Clusters && execucao.Clusters.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">
                    Grupos ({execucao.Clusters.length})
                  </h3>
                  <div className="space-y-4">
                    {execucao.Clusters.map((cluster) => (
                      <div
                        key={cluster.ClusterId}
                        className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden"
                      >
                        <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <CircleDot size={18} className="text-gray-600 dark:text-gray-400" />
                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                              Grupo {numeroParaLetra(cluster.ClusterNumero)}
                            </span>
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {cluster._count?.ChamadosCluster ?? cluster.ClusterQtdChamados} chamados
                          </span>
                        </div>

                        <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Média dias:</span>{" "}
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {formatarDecimal(cluster.ClusterMediaDiasProblema) ?? "—"}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">% Risco humano:</span>{" "}
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {cluster.ClusterPercentualRiscoHumano != null
                                ? `${formatarDecimal(cluster.ClusterPercentualRiscoHumano)}%`
                                : "—"}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">% Risco animal:</span>{" "}
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {cluster.ClusterPercentualRiscoAnimal != null
                                ? `${formatarDecimal(cluster.ClusterPercentualRiscoAnimal)}%`
                                : "—"}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">% Bloqueio via:</span>{" "}
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {cluster.ClusterPercentualBloqueioVia != null
                                ? `${formatarDecimal(cluster.ClusterPercentualBloqueioVia)}%`
                                : "—"}
                            </span>
                          </div>
                        </div>

                        {cluster.ClusterTipoSuporte.length > 0 && (
                          <div className="px-4 pb-4">
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">
                              Tipos de Suporte
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {cluster.ClusterTipoSuporte.map((t) => (
                                <span
                                  key={t.ClusterTipoSuporteId}
                                  className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs"
                                >
                                  {t.TipoSuporte.TipSupNom} ({t.ClusterTipoQtdChamados})
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {cluster.ClusterUrgencia.length > 0 && (
                          <div className="px-4 pb-4">
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">
                              Urgências
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {cluster.ClusterUrgencia.map((u) => (
                                <span
                                  key={u.ClusterUrgenciaId}
                                  className={`px-2 py-1 rounded text-xs ${getUrgenciaBadge(u.ClusterUrgenciaNome)}`}
                                >
                                  {u.ClusterUrgenciaNome} ({u.ClusterUrgenciaQtdChamados})
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/*execucao.ExecucaoStatus === "EXECUTANDO" && (
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-sm">
                  <Loader2 size={16} className="animate-spin" />
                  Processando... esta janela atualiza automaticamente.
                </div>
              )*/}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MetricCard({
  icon,
  label,
  value
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-xs mb-1">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{value}</p>
    </div>
  )
}

function formatDuracao(inicio: string, fim: string) {
  const ms = new Date(fim).getTime() - new Date(inicio).getTime()
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const rs = s % 60
  return `${m}m ${rs}s`
}

function getUrgenciaBadge(urgencia: string) {
  switch (urgencia) {
    case "URGENTE":
      return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
    case "ALTA":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300"
    case "MEDIA":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300"
    case "BAIXA":
      return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
  }
}

// ============================================================
// Card de unidade — expansível, com execuções paginadas
// ============================================================
function UnidadeCard({
  unidade,
  onAbrirConfig,
  onAbrirExecutar,
  onVerDetalhes,
  onDeletarExecucao,
  refreshKey,
  notificarAlteracao
}: {
  unidade: Unidade
  onAbrirConfig: (u: Unidade) => void
  onAbrirExecutar: (u: Unidade) => void
  onVerDetalhes: (e: ExecucaoMineracao) => void
  onDeletarExecucao: (e: ExecucaoMineracao) => Promise<void>
  refreshKey: number
  notificarAlteracao: () => void
}) {
  const [expandido, setExpandido] = useState(false)
  const [execucoes, setExecucoes] = useState<ExecucaoMineracao[]>([])
  const [pagina, setPagina] = useState(1)
  const [paginacao, setPaginacao] = useState({
    paginaAtual: 1,
    limitePorPagina: 5,
    totalRegistros: 0,
    totalPaginas: 1
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const LIMITE = 5

  const carregar = useCallback(
    async (paginaAlvo: number) => {
      try {
        setIsLoading(true)
        setError(null)
        const response = await listarExecucoes({
          unidadeId: unidade.UnidadeId,
          pagina: paginaAlvo,
          limite: LIMITE
        })
        setExecucoes(response.data)
        setPaginacao(response.paginacao)
        setPagina(paginaAlvo)
      } catch (err) {
        console.error("Erro ao carregar execuções da unidade:", err)
        setError("Não foi possível carregar as execuções")
      } finally {
        setIsLoading(false)
      }
    },
    [unidade.UnidadeId]
  )

  // Carrega ao expandir
  useEffect(() => {
    if (expandido) carregar(pagina)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandido, refreshKey])

  // Auto-refresh enquanto houver execuções em andamento nesta unidade
  //  Desativado, muitas requisições simultâneas podem sobrecarregar o backend
  /*
  useEffect(() => {
    if (!expandido) return
    const temAndamento = execucoes.some(
      (e) => e.ExecucaoStatus === "EXECUTANDO"
    )
    if (!temAndamento) return
    const interval = setInterval(() => carregar(pagina), 3000)
    return () => clearInterval(interval)
  }, [expandido, execucoes, pagina, carregar])
  */

  const handleDeletar = async (e: ExecucaoMineracao) => {
    await onDeletarExecucao(e)
    await carregar(pagina)
    notificarAlteracao()
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
      {/* Cabeçalho do card */}
      <button
        onClick={() => setExpandido((v) => !v)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          {expandido ? (
            <ChevronUp size={20} className="text-gray-500 dark:text-gray-400 shrink-0" />
          ) : (
            <ChevronDown size={20} className="text-gray-500 dark:text-gray-400 shrink-0" />
          )}
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
              {unidade.UnidadeNome}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              ID #{unidade.UnidadeId}
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0" onClick={(ev) => ev.stopPropagation()}>
          <button
            onClick={(ev) => {
              ev.stopPropagation()
              onAbrirConfig(unidade)
            }}
            className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Configuração"
          >
            <Settings size={14} />
            Config
          </button>
          <button
            onClick={(ev) => {
              ev.stopPropagation()
              onAbrirExecutar(unidade)
            }}
            className="flex items-center gap-1 px-3 py-1.5 bg-gray-900 hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 text-white rounded text-xs"
            title="Executar mineração"
          >
            <Play size={14} />
            Executar
          </button>
        </div>
      </button>

      {/* Conteúdo expandido */}
      {expandido && (
        <div className="border-t border-gray-200 dark:border-gray-800 p-4">
          {isLoading && execucoes.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="animate-spin text-gray-400" size={28} />
            </div>
          ) : error ? (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          ) : execucoes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <BarChart3 size={36} className="text-gray-400 mb-3" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Nenhuma execução registrada para esta unidade
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                Clique em "Executar" para iniciar
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto -mx-4">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-800">
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Início
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Chamados
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Grupos
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Qualidade
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Score
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {execucoes.map((e) => (
                      <tr
                        key={e.ExecucaoId}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      >
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {formatarDataBrasil(e.ExecucaoDtInicio)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 ${getStatusExecucaoBadge(e.ExecucaoStatus)}`}
                          >
                            {getStatusExecucaoIcon(e.ExecucaoStatus)}
                            {e.ExecucaoStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {e.ExecucaoQtdDados}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {e.ExecucaoQtdClusters}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {e.ExecucaoSilhouetteScore != null
                            ? `${formatarDecimal(e.ExecucaoSilhouetteScore * 100, 2)}%`
                            : 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {e.ExecucaoScoreCombinado != null
                            ? `${formatarDecimal(e.ExecucaoScoreCombinado * 100, 2)}%`
                            : 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => onVerDetalhes(e)}
                              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                              title="Ver detalhes"
                            >
                              <Eye size={16} className="text-gray-600 dark:text-gray-400" />
                            </button>
                            <button
                              onClick={() => handleDeletar(e)}
                              disabled={
                                e.ExecucaoStatus === "EXECUTANDO"
                              }
                              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Excluir"
                            >
                              <Trash2 size={16} className="text-red-600 dark:text-red-400" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginação interna */}
              {paginacao.totalPaginas > 1 && (
                <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-200 dark:border-gray-800">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Página {paginacao.paginaAtual} de {paginacao.totalPaginas} ·{" "}
                    {paginacao.totalRegistros} execuções
                  </p>
                  <div className="flex gap-1">
                    <button
                      onClick={() => carregar(paginacao.paginaAtual - 1)}
                      disabled={paginacao.paginaAtual === 1 || isLoading}
                      className="px-2 py-1 border border-gray-300 dark:border-gray-700 rounded text-xs disabled:opacity-50"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    {Array.from(
                      { length: paginacao.totalPaginas },
                      (_, i) => i + 1
                    ).map((p) => (
                      <button
                        key={p}
                        onClick={() => carregar(p)}
                        disabled={isLoading}
                        className={`px-2 py-1 rounded text-xs ${paginacao.paginaAtual === p
                          ? "bg-gray-900 dark:bg-gray-700 text-white"
                          : "border border-gray-300 dark:border-gray-700"
                          }`}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      onClick={() => carregar(paginacao.paginaAtual + 1)}
                      disabled={
                        paginacao.paginaAtual === paginacao.totalPaginas || isLoading
                      }
                      className="px-2 py-1 border border-gray-300 dark:border-gray-700 rounded text-xs disabled:opacity-50"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================
// Página principal
// ============================================================
export default function MineracaoPage() {
  const [unidades, setUnidades] = useState<Unidade[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busca, setBusca] = useState("")

  // Sinaliza aos cards que algo mudou (execução nova / deletada) para recarregarem
  const [refreshKey, setRefreshKey] = useState(0)

  // Modal — configuração ausente
  const [ausenteModalOpen, setAusenteModalOpen] = useState(false)
  const [ausenteUnidade, setAusenteUnidade] = useState<Unidade | null>(null)

  // Modal — visualizar configuração existente
  const [viewConfigOpen, setViewConfigOpen] = useState(false)
  const [viewConfigUnidade, setViewConfigUnidade] = useState<Unidade | null>(null)
  const [viewConfigData, setViewConfigData] = useState<ConfiguracaoMineracao | null>(null)

  // Modal — executar
  const [executarModalOpen, setExecutarModalOpen] = useState(false)
  const [executarUnidade, setExecutarUnidade] = useState<Unidade | null>(null)
  const [executarCalibrar, setExecutarCalibrar] = useState(false)
  const [executarTemConfig, setExecutarTemConfig] = useState(true)
  const [executarLoading, setExecutarLoading] = useState(false)
  const [executarVerificando, setExecutarVerificando] = useState(false)

  // Modal — detalhes da execução
  const [detalheModalOpen, setDetalheModalOpen] = useState(false)
  const [execucaoSelecionada, setExecucaoSelecionada] = useState<string | null>(null)

  const [executarFase, setExecutarFase] = useState<"confirmar" | "enviado">("confirmar")

  const carregarUnidades = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await listarUnidades({ pagina: 1, limite: 100 })
      setUnidades(response.data)
    } catch (err) {
      console.error("Erro ao carregar unidades:", err)
      setError("Não foi possível carregar as unidades")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    carregarUnidades()
  }, [carregarUnidades])

  // ---------- Config ----------
  const handleAbrirConfig = async (unidade: Unidade) => {
    try {
      const response = await buscarConfiguracao(unidade.UnidadeId)
      if (!response.data) {
        setAusenteUnidade(unidade)
        setAusenteModalOpen(true)
      } else {
        setViewConfigUnidade(unidade)
        setViewConfigData(response.data)
        setViewConfigOpen(true)
      }
    } catch (err) {
      console.error("Erro ao carregar configuração:", err)
      alert("Erro ao carregar configuração")
    }
  }

  // ---------- Executar ----------
  const handleAbrirExecutar = async (unidade: Unidade) => {
    setExecutarUnidade(unidade)
    setExecutarFase("confirmar")
    setExecutarVerificando(true)
    setExecutarModalOpen(true)
    try {
      const response = await buscarConfiguracao(unidade.UnidadeId)
      const temConfig = !!response.data
      setExecutarTemConfig(temConfig)
      // Se NÃO tem configuração, força recalibração (marcado e travado)
      setExecutarCalibrar(!temConfig)
    } catch (err) {
      // Em caso de erro na consulta, assume que não tem e força
      setExecutarTemConfig(false)
      setExecutarCalibrar(true)
    } finally {
      setExecutarVerificando(false)
    }
  }

  const handleExecutar = async () => {
    if (!executarUnidade) return
    try {
      setExecutarLoading(true)
      await executarMineracao(executarUnidade.UnidadeId, executarCalibrar)
      // Não fecha mais o modal — troca de fase
      setExecutarFase("enviado")
      setRefreshKey((k) => k + 1)
    } catch (err: any) {
      alert(err.response?.data?.error || "Erro ao executar mineração")
    } finally {
      setExecutarLoading(false)
    }
  }

  const handleFecharExecutar = () => {
    setExecutarModalOpen(false)
    setExecutarFase("confirmar")
    setExecutarUnidade(null)
  }

  // ---------- Detalhes ----------
  const handleVerDetalhes = (e: ExecucaoMineracao) => {
    setExecucaoSelecionada(e.ExecucaoId)
    setDetalheModalOpen(true)
  }

  // ---------- Deletar ----------
  const handleDeletarExecucao = async (e: ExecucaoMineracao) => {
    if (!confirm("Deseja realmente excluir esta execução?")) return
    try {
      await deletarExecucao(e.ExecucaoId)
    } catch (err: any) {
      alert(err.response?.data?.error || "Erro ao excluir execução")
      throw err
    }
  }

  const notificarAlteracao = () => setRefreshKey((k) => k + 1)

  const unidadesFiltradas = unidades.filter((u) =>
    u.UnidadeNome.toLowerCase().includes(busca.toLowerCase())
  )

  // ---------- Render ----------
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Mineração de Chamados
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Gerencie as execuções de agrupamento por unidade
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Buscar unidade..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg outline-none text-gray-900 dark:text-gray-100 text-sm w-full sm:w-64"
          />
          <button
            onClick={carregarUnidades}
            className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Lista de unidades em cards expansíveis */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-gray-400" size={32} />
        </div>
      ) : unidadesFiltradas.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 flex flex-col items-center justify-center py-16">
          <Layers size={48} className="text-gray-400 mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            Nenhuma unidade encontrada
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {unidadesFiltradas.map((u) => (
            <UnidadeCard
              key={u.UnidadeId}
              unidade={u}
              onAbrirConfig={handleAbrirConfig}
              onAbrirExecutar={handleAbrirExecutar}
              onVerDetalhes={handleVerDetalhes}
              onDeletarExecucao={handleDeletarExecucao}
              refreshKey={refreshKey}
              notificarAlteracao={notificarAlteracao}
            />
          ))}
        </div>
      )}

      {/* Modal: configuração ausente */}
      <ConfiguracaoAusenteModal
        isOpen={ausenteModalOpen}
        onClose={() => setAusenteModalOpen(false)}
        unidade={ausenteUnidade}
        onExecutar={() => {
          if (ausenteUnidade) handleAbrirExecutar(ausenteUnidade)
        }}
      />

      {/* Modal: visualizar configuração existente */}
      <ConfiguracaoViewModal
        isOpen={viewConfigOpen}
        onClose={() => setViewConfigOpen(false)}
        unidade={viewConfigUnidade}
        configuracao={viewConfigData}
      />

      {/* Modal: executar */}
      {executarModalOpen && executarUnidade && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-md w-full mx-4 p-6">
            {executarFase === "confirmar" ? (
              <>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Executar Mineração
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Unidade: <strong>{executarUnidade.UnidadeNome}</strong>
                </p>

                {!executarTemConfig && !executarVerificando && (
                  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      Esta unidade ainda não possui configuração. A recalibração será
                      forçada para criar a primeira configuração.
                    </p>
                  </div>
                )}

                <label
                  className={`flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg mb-4 ${executarTemConfig ? "cursor-pointer" : "cursor-not-allowed opacity-90"
                    }`}
                >
                  <input
                    type="checkbox"
                    checked={executarCalibrar}
                    onChange={(e) => setExecutarCalibrar(e.target.checked)}
                    disabled={executarLoading || !executarTemConfig || executarVerificando}
                    className="w-4 h-4"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Forçar recalibração
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {executarTemConfig
                        ? "Se desmarcado, o script decide se precisa recalibrar"
                        : "Obrigatório: a unidade não possui configuração"}
                    </p>
                  </div>
                </label>

                <div className="flex gap-3">
                  <button
                    onClick={handleFecharExecutar}
                    disabled={executarLoading}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleExecutar}
                    disabled={executarLoading || executarVerificando}
                    className="flex-1 px-4 py-2 bg-gray-900 hover:bg-gray-800 dark:bg-gray-700 text-white rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {executarLoading || executarVerificando ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        {executarVerificando ? "Verificando..." : "Iniciando..."}
                      </>
                    ) : (
                      <>
                        <Play size={16} />
                        Executar
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="text-green-600 dark:text-green-400" size={24} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 text-center mb-2">
                  Execução iniciada
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-4">
                  A execução da unidade <strong>{executarUnidade.UnidadeNome}</strong> foi
                  enviada e está sendo processada em segundo plano.
                </p>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <Clock size={16} className="text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                        Tempo estimado
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">
                        {executarCalibrar
                          ? "Com recalibração: de 1 a 5 minutos."
                          : "Sem recalibração: de 0 a 10 segundos, dependendo da quantidade de chamados."}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <RefreshCw size={16} className="text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                        Como acompanhar
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">
                        Atualize a lista de execuções (botão{" "}
                        <strong>Atualizar</strong> no topo, ou expandindo o card da unidade)
                        para verificar se a execução foi concluída.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleFecharExecutar}
                    className="px-4 py-2 bg-gray-900 hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 text-white rounded-lg"
                  >
                    Entendi
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal: detalhes da execução */}
      <ExecucaoDetalheModal
        isOpen={detalheModalOpen}
        onClose={() => setDetalheModalOpen(false)}
        execucaoId={execucaoSelecionada}
      />
    </div>
  )
}

function getStatusExecucaoBadge(status: string) {
  switch (status) {
    case "PENDENTE":
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
    case "PROCESSANDO":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
    case "CONCLUIDA":
      return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
    case "ERRO":
      return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
    case "CANCELADA":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300"
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
  }
}

function getStatusExecucaoIcon(status: string) {
  switch (status) {
    case "CONCLUIDA":
      return <CheckCircle size={12} />
    case "ERRO":
      return <XCircle size={12} />
    case "PROCESSANDO":
      return <Loader2 size={12} className="animate-spin" />
    case "PENDENTE":
      return <Clock size={12} />
    default:
      return <AlertCircle size={12} />
  }
}