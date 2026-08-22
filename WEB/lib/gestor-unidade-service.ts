import { apiClient } from "./api";

export interface Gestor {
  GestorId: number;
  GestorNome: string;
  GestorEmail?: string;
  GestorTelefone?: string;
  GestorCPF: string;
  GestorUsuario: string;
  GestorNivel: 'COMUM' | 'ADMINUNIDADE';
  GestorStatus: 'ATIVO' | 'INATIVO' | 'BLOQUEADO';
  UnidadeId: number;
  Unidade?: {
    UnidadeId: number;
    UnidadeNome: string;
    UnidadeStatus: string;
  };
}

export interface GestorFilters {
  nivel?: string;
  status?: string;
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

export interface ListaGestoresResponse {
  data: Gestor[];
  paginacao: Paginacao;
}

export async function listarGestores(filters: GestorFilters = {}): Promise<ListaGestoresResponse> {
  try {
    const params = new URLSearchParams();
    
    if (filters.nivel) params.append('nivel', filters.nivel);
    if (filters.status) params.append('status', filters.status);
    if (filters.pagina) params.append('pagina', filters.pagina.toString());
    if (filters.limite) params.append('limite', filters.limite.toString());
    
    const response = await apiClient.get(`/gestor?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao listar gestores:', error);
    throw error;
  }
}

export async function buscarGestorPorId(id: number): Promise<Gestor> {
  try {
    const response = await apiClient.get(`/gestor/${id}`);
    return response.data.data;
  } catch (error) {
    console.error('Erro ao buscar gestor:', error);
    throw error;
  }
}

export async function cadastrarGestor(data: {
  UnidadeId: number;
  GestorNome: string;
  GestorEmail?: string;
  GestorTelefone?: string;
  GestorCPF: string;
  GestorUsuario: string;
  GestorSenha: string;
  GestorNivel: 'COMUM' | 'ADMINUNIDADE';
  GestorStatus?: 'ATIVO' | 'INATIVO' | 'BLOQUEADO';
}) {
  try {
    const response = await apiClient.post('/gestor', data);
    return response.data;
  } catch (error) {
    console.error('Erro ao cadastrar gestor:', error);
    throw error;
  }
}

export async function alterarGestor(
  id: number,
  data: {
    UnidadeId?: number;
    GestorNome?: string;
    GestorEmail?: string | null;
    GestorTelefone?: string | null;
    GestorCPF?: string;
    GestorUsuario?: string;
    GestorSenha?: string;
    GestorSenhaAtual?: string;
    GestorNivel?: 'COMUM' | 'ADMINUNIDADE';
    GestorStatus?: 'ATIVO' | 'INATIVO' | 'BLOQUEADO';
  }
) {
  try {
    const response = await apiClient.put(`/gestor/${id}`, data);
    return response.data;
  } catch (error) {
    console.error('Erro ao alterar gestor:', error);
    throw error;
  }
}

export async function alterarStatusGestor(id: number, status: string) {
  try {
    const response = await apiClient.patch(`/gestor/${id}/status`, { GestorStatus: status });
    return response.data;
  } catch (error) {
    console.error('Erro ao alterar status do gestor:', error);
    throw error;
  }
}