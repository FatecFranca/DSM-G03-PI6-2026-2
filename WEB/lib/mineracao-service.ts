// src/lib/mineracao-service.ts
import { apiClient } from "./api"

export interface ExecucaoMineracao {
  ExecucaoId: string
  UnidadeId: number
  ExecucaoDtInicio: string
  ExecucaoDtFim: string | null
  ExecucaoQtdDados: number
  ExecucaoQtdClusters: number
  ExecucaoSilhouetteScore: number | null
  ExecucaoDaviesBouldinScore: number | null
  ExecucaoEstabilidadeScore: number | null
  ExecucaoPercentualMenorCluster: number | null
  ExecucaoScoreCombinado: number | null
  ExecucaoStatus: 'EXECUTANDO'| 'CONCLUIDA' | 'ERRO'

  ExecucaoMensagemErro: string | null
  Unidade?: {
    UnidadeId: number
    UnidadeNome: string
    UnidadeStatus: string
  }
  _count?: { Clusters: number }
}

export interface Cluster {
  ClusterId: string
  ClusterNumero: number
  ClusterQtdChamados: number
  ClusterMediaDiasProblema: number | null
  ClusterPercentualRiscoHumano: number | null
  ClusterPercentualRiscoAnimal: number | null
  ClusterPercentualBloqueioVia: number | null
  ClusterMediaTempoResolucao: number | null
  ClusterMediaUrgencia: number | null
  ClusterTipoSuporte: Array<{
    ClusterTipoSuporteId: string
    ClusterTipoQtdChamados: number
    ClusterTipoPercentual: number
    TipoSuporte: { TipSupId: number; TipSupNom: string }
  }>
  ClusterUrgencia: Array<{
    ClusterUrgenciaId: string
    ClusterUrgenciaNome: string
    ClusterUrgenciaQtdChamados: number
    ClusterUrgenciaPercentual: number
  }>
  _count?: { ChamadosCluster: number }
}

export interface ExecucaoDetalhada extends ExecucaoMineracao {
  Clusters: Cluster[]
}

export interface ConfiguracaoMineracao {
  ConfiguracaoId: string
  UnidadeId: number
  ConfiguracaoQtdClusters: number
  ConfiguracaoQtdChamadosBase: number
  ConfiguracaoSilhouetteScore: number | null
  ConfiguracaoDaviesBouldinScore: number | null
  ConfiguracaoScoreCombinado: number | null
  ConfiguracaoPercentualRecalibracao: number
  ConfiguracaoDtCalibracao: string
  ConfiguracaoAtivo: boolean
  ConfiguracaoEstabilidade: number | null
  ConfiguracaoPercentualMenorCluster: number | null
}

export interface MineracaoFilters {
  pagina?: number
  limite?: number
  unidadeId?: number
  status?: string
}

// Listar execuções
export async function listarExecucoes(filters: MineracaoFilters = {}) {
  const params = new URLSearchParams()
  if (filters.pagina) params.append('pagina', String(filters.pagina))
  if (filters.limite) params.append('limite', String(filters.limite))
  if (filters.unidadeId) params.append('unidadeId', String(filters.unidadeId))
  if (filters.status) params.append('status', filters.status)

  const response = await apiClient.get(`/mineracao/execucoes?${params.toString()}`)
  return response.data
}

// Buscar execução por ID
export async function buscarExecucao(id: string): Promise<{ data: ExecucaoDetalhada }> {
  const response = await apiClient.get(`/mineracao/execucoes/${id}`)
  return response.data
}

// Buscar configuração da unidade
export async function buscarConfiguracao(unidadeId: number): Promise<{ data: ConfiguracaoMineracao | null }> {
  const response = await apiClient.get(`/mineracao/unidades/${unidadeId}/configuracao`)
  return response.data
}

// Criar configuração
export async function criarConfiguracao(
  unidadeId: number,
  data: {
    ConfiguracaoQtdClusters: number
    ConfiguracaoQtdChamadosBase: number
    ConfiguracaoPercentualRecalibracao?: number
  }
) {
  const response = await apiClient.post(`/mineracao/unidades/${unidadeId}/configuracao`, data)
  return response.data
}

// Executar mineração
export async function executarMineracao(unidadeId: number, calibrar = false) {
  const response = await apiClient.post(`/mineracao/unidades/${unidadeId}/executar`, { calibrar })
  return response.data
}

// Excluir execução
export async function deletarExecucao(id: string) {
  const response = await apiClient.delete(`/mineracao/execucoes/${id}`)
  return response.data
}