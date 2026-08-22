import { apiClient } from "./api";

export interface Atividade {
  AtividadeId: string;
  AtividadeDescricao: string;
  AtividadeObservacao?: string;
  AtividadeDtRealizacao: string;
  Tecnico?: {
    TecnicoId: string;
    TecnicoNome: string;
  };
}

export interface Chamado {
  ChamadoId: string;
  ChamadoN1: number;
  ChamadoN2: number;
  ChamadoTitulo: string;
  ChamadoDescricaoFormatada?: string;
  ChamadoPrioridade?: number;
  ChamadoUrgencia?: 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';
  ChamadoStatus: 'PROCESSAMENTO' | 'PENDENTE' | 'ANALISADO' | 'ATRIBUIDO' | 'EMATENDIMENTO' | 'CONCLUIDO' | 'CANCELADO' | 'RECUSADO' | 'FALTAINFORMACAO';
  ChamadoDtAbertura: string;
  ChamadoDtEncerramento?: string;
  ChamadoDtPlanejada?: string;
  ChamadoDescricaoInicial?: string;
  PessoaId: string;
  UnidadeId: number;
  TipSupId?: number;
  EquipeId?: string;
  AtividadeChamado?: Atividade[];
  ChamadoDiasComProblema: 0;
  ChamadoRiscoVidaHumana: false;
  ChamadoRiscoVidaAnimal: false;
  ChamadoBloqueioVia: false;
  Pessoa: {
    PessoaId: string;
    PessoaNome: string;
    PessoaEmail?: string;
    PessoaTelefone?: string;
  };
  Unidade: {
    UnidadeId: number;
    UnidadeNome: string;
  };
  TipoSuporte?: {
    TipSupId: number;
    TipSupNom: string;
  };
  Equipe?: {
    EquipeId: string;
    EquipeNome: string;
  };
  _count?: {
    AtividadeChamado: number;
  };
}

export interface ChamadoFilters {
  status?: string;
  urgencia?: string;
  tipoSuporteId?: number;
  equipeId?: string;
  pessoaId?: string;
  dataInicio?: string;
  dataFim?: string;
  prioridadeMin?: number;
  prioridadeMax?: number;
  pagina?: number;
  limite?: number;
  busca?: string;
}

export interface Paginacao {
  paginaAtual: number;
  limitePorPagina: number;
  totalRegistros: number;
  totalPaginas: number;
}

export interface ListaChamadosResponse {
  data: Chamado[];
  paginacao: Paginacao;
}

export interface Estatisticas {
  periodo: {
    dataInicio: string;
    dataFim: string;
  };
  total: number;
  porStatus: Record<string, number>;
  porUrgencia: Record<string, number>;
}

export async function listarChamados(filters: ChamadoFilters = {}): Promise<ListaChamadosResponse> {
  try {
    const params = new URLSearchParams();
    
    if (filters.status) params.append('status', filters.status);
    if (filters.urgencia) params.append('urgencia', filters.urgencia);
    if (filters.tipoSuporteId) params.append('tipoSuporteId', filters.tipoSuporteId.toString());
    if (filters.equipeId) params.append('equipeId', filters.equipeId);
    if (filters.pessoaId) params.append('pessoaId', filters.pessoaId);
    if (filters.dataInicio) params.append('dataInicio', filters.dataInicio);
    if (filters.dataFim) params.append('dataFim', filters.dataFim);
    if (filters.prioridadeMin) params.append('prioridadeMin', filters.prioridadeMin.toString());
    if (filters.prioridadeMax) params.append('prioridadeMax', filters.prioridadeMax.toString());
    if (filters.pagina) params.append('pagina', filters.pagina.toString());
    if (filters.limite) params.append('limite', filters.limite.toString());
    
    const response = await apiClient.get(`/chamado?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao listar chamados:', error);
    throw error;
  }
}

export async function buscarChamadoPorId(id: string): Promise<Chamado> {
  try {
    const response = await apiClient.get(`/chamado/${id}`);
    return response.data.data;
  } catch (error) {
    console.error('Erro ao buscar chamado:', error);
    throw error;
  }
}

export async function alterarChamado(
  id: string,
  data: {
    TipSupId?: number | null;
    EquipeId?: string | null;
    ChamadoTitulo?: string;
    ChamadoDescricaoInicial?: string;
    ChamadoPrioridade?: number;
    ChamadoUrgencia?: 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';
    ChamadoStatus?: string;

  }
) {
  try {
    const response = await apiClient.put(`/chamado/${id}`, data);
    return response.data;
  } catch (error) {
    console.error('Erro ao alterar chamado:', error);
    throw error;
  }
}

export async function atribuirEquipe(id: string, equipeId: string) {
  try {
    const response = await apiClient.patch(`/chamado/${id}/atribuir-equipe`, { EquipeId: equipeId });
    return response.data;
  } catch (error) {
    console.error('Erro ao atribuir equipe:', error);
    throw error;
  }
}

export async function alterarStatus(id: string, status: string, motivoRecusa?: string) {
  try {
    const response = await apiClient.patch(`/chamado/${id}/status`, { ChamadoStatus: status, ChamadoDescricaoFormatada: motivoRecusa });
    return response.data;
  } catch (error) {
    console.error('Erro ao alterar status:', error);
    throw error;
  }
}

export async function getEstatisticas(periodo?: string) {
  try {
    const params = periodo ? `?periodo=${periodo}` : '';
    console.log('Buscando estatísticas com período:', periodo);
    const response = await apiClient.get(`/chamado/estatisticas${params}`);
    return response.data.data;
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    throw error;
  }
}