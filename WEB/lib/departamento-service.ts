import { apiClient } from "./api";

export interface Departamento {
  DepartamentoId: string;
  DepartamentoNome: string;
  DepartamentoStatus: 'ATIVO' | 'INATIVO' | 'BLOQUEADO';
  DepartamentoDtCadastro: string;
  UnidadeId: number;
  Unidade?: {
    UnidadeId: number;
    UnidadeNome: string;
    UnidadeStatus: string;
  };
  _count?: {
    Tecnico: number;
  };
  Tecnico?: Array<{
    TecnicoId: string;
    TecnicoNome: string;
    TecnicoEmail?: string;
    TecnicoStatus: string;
  }>;
}

export interface DepartamentoFilters {
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

export interface ListaDepartamentosResponse {
  data: Departamento[];
  paginacao: Paginacao;
}

export async function listarDepartamentos(filters: DepartamentoFilters = {}): Promise<ListaDepartamentosResponse> {
  try {
    const params = new URLSearchParams();
    
    if (filters.status) params.append('status', filters.status);
    if (filters.pagina) params.append('pagina', filters.pagina.toString());
    if (filters.limite) params.append('limite', filters.limite.toString());
    
    const response = await apiClient.get(`/departamento?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao listar departamentos:', error);
    throw error;
  }
}

export async function buscarDepartamentoPorId(id: number): Promise<Departamento> {
  try {
    const response = await apiClient.get(`/departamento/${id}`);
    return response.data.data;
  } catch (error) {
    console.error('Erro ao buscar departamento:', error);
    throw error;
  }
}

export async function cadastrarDepartamento(data: {
  UnidadeId: number;
  DepartamentoNome: string;
  DepartamentoStatus?: 'ATIVO' | 'INATIVO' | 'BLOQUEADO';
}) {
  try {
    const response = await apiClient.post('/departamento', data);
    return response.data;
  } catch (error) {
    console.error('Erro ao cadastrar departamento:', error);
    throw error;
  }
}

export async function alterarDepartamento(
  id: string,
  data: {
    DepartamentoNome?: string;
    DepartamentoStatus?: 'ATIVO' | 'INATIVO' | 'BLOQUEADO';
  }
) {
  try {
    const response = await apiClient.put(`/departamento/${id}`, data);
    return response.data;
  } catch (error) {
    console.error('Erro ao alterar departamento:', error);
    throw error;
  }
}

export async function alterarStatusDepartamento(id: string, status: string) {
  try {
    const response = await apiClient.patch(`/departamento/${id}/status`, { DepartamentoStatus: status });
    return response.data;
  } catch (error) {
    console.error('Erro ao alterar status do departamento:', error);
    throw error;
  }
}