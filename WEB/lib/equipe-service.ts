import { apiClient } from "./api";

export interface Equipe {
  EquipeId: string;
  EquipeNome: string;
  EquipeDescricao: string;
  EquipeStatus: 'ATIVA' | 'INATIVA';
  EquipeDtCadastro: string;
  UnidadeId: number;
  Unidade?: {
    UnidadeId: number;
    UnidadeNome: string;
    UnidadeStatus: string;
  };
  _count?: {
    TecnicoEquipe: number;
    Chamado: number;
  };
  TecnicoEquipe?: Vinculo[];
  Chamado?: Array<{
    ChamadoId: string;
    ChamadoTitulo: string;
    ChamadoStatus: string;
    ChamadoDtAbertura: string;
  }>;
}

export interface Vinculo {
  TecEquId: string;
  TecEquStatus: 'ATIVO' | 'INATIVO';
  EquipeId: string;
  TecnicoId: string;
  Equipe?: {
    EquipeId: string;
    EquipeNome: string;
    EquipeStatus: string;
  };
  Tecnico?: {
    TecnicoId: string;
    TecnicoNome: string;
    TecnicoEmail?: string;
    TecnicoTelefone?: string;
    TecnicoStatus: string;
    Departamento?: {
      DepartamentoId: string;
      DepartamentoNome: string;
    };
  };
}

export interface EquipeFilters {
  status?: string;
  nome?: string;
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

export interface ListaEquipesResponse {
  data: Equipe[];
  paginacao: Paginacao;
}

export async function listarEquipes(filters: EquipeFilters = {}): Promise<ListaEquipesResponse> {
  try {
    const params = new URLSearchParams();
    
    if (filters.status) params.append('status', filters.status);
    if (filters.nome) params.append('nome', filters.nome);
    if (filters.pagina) params.append('pagina', filters.pagina.toString());
    if (filters.limite) params.append('limite', filters.limite.toString());
    
    const response = await apiClient.get(`/equipe?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao listar equipes:', error);
    throw error;
  }
}

export async function buscarEquipePorId(id: number): Promise<Equipe> {
  try {
    const response = await apiClient.get(`/equipe/${id}`);
    return response.data.data;
  } catch (error) {
    console.error('Erro ao buscar equipe:', error);
    throw error;
  }
}

export async function cadastrarEquipe(data: {
  UnidadeId: number;
  EquipeNome: string;
  EquipeDescricao: string;
  EquipeStatus?: 'ATIVA' | 'INATIVA';
}) {
  try {
    const response = await apiClient.post('/equipe', data);
    return response.data;
  } catch (error) {
    console.error('Erro ao cadastrar equipe:', error);
    throw error;
  }
}

export async function alterarEquipe(
  id: string,
  data: {
    EquipeNome?: string;
    EquipeDescricao?: string;
    EquipeStatus?: 'ATIVA' | 'INATIVA';
  }
) {
  try {
    const response = await apiClient.put(`/equipe/${id}`, data);
    return response.data;
  } catch (error) {
    console.error('Erro ao alterar equipe:', error);
    throw error;
  }
}

export async function alterarStatusEquipe(id: string, status: string) {
  try {
    const response = await apiClient.patch(`/equipe/${id}/status`, { EquipeStatus: status });
    return response.data;
  } catch (error) {
    console.error('Erro ao alterar status da equipe:', error);
    throw error;
  }
}

export async function listarVinculosPorEquipe(equipeId: string, apenasAtivos?: boolean) {
  try {
    const params = new URLSearchParams();
    if (apenasAtivos) params.append('apenasAtivos', 'true');
    
    const response = await apiClient.get(`/equipe/${equipeId}/tecnicos?${params.toString()}`);
    return response.data.data;
  } catch (error) {
    console.error('Erro ao listar vínculos:', error);
    throw error;
  }
}

export async function adicionarTecnicoEquipe(equipeId: string, tecnicoId: string) {
  try {
    const response = await apiClient.post(`/equipe/${equipeId}/tecnicos`, { 
      TecnicoId: tecnicoId,
      TecEquStatus: 'ATIVO'
    });
    return response.data;
  } catch (error) {
    console.error('Erro ao adicionar técnico à equipe:', error);
    throw error;
  }
}

export async function alterarVinculo(vinculoId: string, status: string) {
  try {
    const response = await apiClient.put(`/equipe/vinculos/${vinculoId}`, { 
      TecEquStatus: status 
    });
    return response.data;
  } catch (error) {
    console.error('Erro ao alterar vínculo:', error);
    throw error;
  }
}

export async function removerVinculo(vinculoId: string) {
  try {
    const response = await apiClient.delete(`/equipe/vinculos/${vinculoId}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao remover vínculo:', error);
    throw error;
  }
}