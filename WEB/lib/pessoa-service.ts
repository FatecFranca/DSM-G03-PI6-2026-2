import { apiClient } from "./api";

export interface Pessoa {
  PessoaId: string;
  PessoaNome: string;
  PessoaEmail?: string;
  PessoaTelefone?: string;
  PessoaCPF: string;
  PessoaStatus: 'ATIVA' | 'INATIVA' | 'BLOQUEADA';
  PessoadtCadastro: string;
  UnidadeId: number;
  Unidade?: {
    UnidadeId: number;
    UnidadeNome: string;
    UnidadeStatus: string;
  };
  _count?: {
    Chamado: number;
  };
  Chamado?: Array<{
    ChamadoId: string;
    ChamadoTitulo: string;
    ChamadoStatus: string;
    ChamadoDtAbertura: string;
  }>;
}

export interface PessoaFilters {
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

export interface ListaPessoasResponse {
  data: Pessoa[];
  paginacao: Paginacao;
}

export async function listarPessoas(filters: PessoaFilters = {}): Promise<ListaPessoasResponse> {
  try {
    const params = new URLSearchParams();
    
    if (filters.status) params.append('status', filters.status);
    if (filters.nome) params.append('nome', filters.nome);
    if (filters.pagina) params.append('pagina', filters.pagina.toString());
    if (filters.limite) params.append('limite', filters.limite.toString());
    
    const response = await apiClient.get(`/pessoa?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao listar pessoas:', error);
    throw error;
  }
}

export async function buscarPessoaPorId(id: number): Promise<Pessoa> {
  try {
    const response = await apiClient.get(`/pessoa/${id}`);
    return response.data.data;
  } catch (error) {
    console.error('Erro ao buscar pessoa:', error);
    throw error;
  }
}

export async function cadastrarPessoa(data: {
  UnidadeId: number;
  PessoaNome: string;
  PessoaEmail?: string;
  PessoaTelefone?: string;
  PessoaCPF: string;
  PessoaSenha: string;
  PessoaStatus?: 'ATIVA' | 'INATIVA' | 'BLOQUEADA';
}) {
  try {
    const response = await apiClient.post('/pessoa', data);
    return response.data;
  } catch (error) {
    console.error('Erro ao cadastrar pessoa:', error);
    throw error;
  }
}

export async function alterarPessoa(
  id: string,
  data: {
    UnidadeId?: number;
    PessoaNome?: string;
    PessoaEmail?: string | null;
    PessoaTelefone?: string | null;
    PessoaCPF?: string;
    PessoaSenha?: string;
    PessoaStatus?: 'ATIVA' | 'INATIVA' | 'BLOQUEADA';
  }
) {
  try {
    const response = await apiClient.put(`/pessoa/${id}`, data);
    return response.data;
  } catch (error) {
    console.error('Erro ao alterar pessoa:', error);
    throw error;
  }
}

export async function alterarStatusPessoa(id: string, status: string) {
  try {
    const response = await apiClient.patch(`/pessoa/${id}/status`, { PessoaStatus: status });
    return response.data;
  } catch (error) {
    console.error('Erro ao alterar status da pessoa:', error);
    throw error;
  }
}

export async function listarPessoasPorUnidade(unidadeId: number, apenasAtivos?: boolean) {
  try {
    const params = new URLSearchParams();
    if (apenasAtivos) params.append('apenasAtivos', 'true');
    
    const response = await apiClient.get(`/pessoa/unidade/${unidadeId}?${params.toString()}`);
    return response.data.data;
  } catch (error) {
    console.error('Erro ao listar pessoas por unidade:', error);
    throw error;
  }
}