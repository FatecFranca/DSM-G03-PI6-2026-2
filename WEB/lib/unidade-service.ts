import { apiClient } from "./api"

export interface Unidade {
  UnidadeId: number
  UnidadeNome: string
  UnidadeStatus: 'ATIVA' | 'INATIVA' | 'BLOQUEADA'
  _count?: {
    Departamento: number
    Pessoa: number
    TipoSuporte: number
    Tecnico: number
    Chamado: number
    Gestor: number
    TipoSuporteUnidade: number
  }
  Departamento?: Array<{
    DepartamentoId: string
    DepartamentoNome: string
    DepartamentoStatus: string
  }>
  TipoSuporte?: Array<{
    TipSupId: number
    TipSupNom: string
    TipSupStatus: string
  }>
}

export interface UnidadeFilters {
  status?: string
  pagina?: number
  limite?: number
  busca?: string
}

export interface Paginacao {
  paginaAtual: number
  limitePorPagina: number
  totalRegistros: number
  totalPaginas: number
}

export interface ListaUnidadesResponse {
  data: Unidade[]
  paginacao: Paginacao
}

export async function listarUnidades(filters: UnidadeFilters = {}): Promise<ListaUnidadesResponse> {
  try {
    const params = new URLSearchParams()
    
    if (filters.status) params.append('status', filters.status)
    if (filters.pagina) params.append('pagina', filters.pagina.toString())
    if (filters.limite) params.append('limite', filters.limite.toString())
    
    const response = await apiClient.get(`/unidade?${params.toString()}`)
    return response.data
  } catch (error) {
    console.error('Erro ao listar unidades:', error)
    throw error
  }
}

export async function buscarUnidadePorId(id: number): Promise<Unidade> {
  try {
    const response = await apiClient.get(`/unidade/${id}`)
    return response.data.data
  } catch (error) {
    console.error('Erro ao buscar unidade:', error)
    throw error
  }
}

export async function cadastrarUnidade(data: { UnidadeNome: string; UnidadeStatus?: string }) {
  try {
    const response = await apiClient.post('/unidade', data)
    return response.data
  } catch (error) {
    console.error('Erro ao cadastrar unidade:', error)
    throw error
  }
}

export async function alterarUnidade(id: number, data: { UnidadeNome?: string; UnidadeStatus?: string }) {
  try {
    const response = await apiClient.put(`/unidade/${id}`, data)
    return response.data
  } catch (error) {
    console.error('Erro ao alterar unidade:', error)
    throw error
  }
}

export async function alterarStatusUnidade(id: number, status: string) {
  try {
    const response = await apiClient.patch(`/unidade/${id}/status`, { UnidadeStatus: status })
    return response.data
  } catch (error) {
    console.error('Erro ao alterar status da unidade:', error)
    throw error
  }
}

export async function listarUnidadesSimplificado() {
  try {
    const response = await apiClient.get('/unidade?limite=100')
    return response.data.data.map((u: any) => ({
      UnidadeId: u.UnidadeId,
      UnidadeNome: u.UnidadeNome,
      UnidadeStatus: u.UnidadeStatus
    }))
  } catch (error) {
    console.error('Erro ao listar unidades:', error)
    return []
  }
}