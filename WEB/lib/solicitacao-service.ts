import { apiClient } from "./api";

export interface Solicitacao {
  SolicitacaoId: string;
  UnidadeId: number | null;
  SolicitacaoTipo: string;
  SolicitacaoDescricao: string;
  SolicitacaoIdRelacional: string | null;
  SolicitacaoSolicitanteNome: string | null;
  SolicitacaoSolicitanteEmail: string | null;
  SolicitacaoSolicitanteTelefone: string | null;
  SolicitacaoUsuarioFinalizou: string | null;
  SolicitacaoStatus: 'PENDENTE' | 'EMATENDIMENTO' | 'CONCLUIDO' | 'RECUSADO' | 'CANCELADO';
  SolicitacaoDtCadastro: string;
  Unidade?: {
    UnidadeId: number;
    UnidadeNome: string;
    UnidadeStatus: string;
  };
  AtividadeSolicitacao?: Array<{
    AtivSolId: string;
    AtivSolDescricao: string;
    AtivSolDt: string;
  }>;
}

export interface SolicitacaoFilters {
  status?: string;
  tipo?: string;
  unidadeId?: number;
  pagina?: number;
  limite?: number;
}

export interface Paginacao {
  paginaAtual: number;
  limitePorPagina: number;
  totalRegistros: number;
  totalPaginas: number;
}

export interface ListaSolicitacoesResponse {
  data: Solicitacao[];
  paginacao: Paginacao;
}

// =============================================
// FUNÇÕES EXPORTADAS
// =============================================

/**
 * Lista solicitações com filtros e paginação
 * Apenas gestores e administradores podem acessar
 */
export async function listarSolicitacoes(filters: SolicitacaoFilters = {}): Promise<ListaSolicitacoesResponse> {
  try {
    const params = new URLSearchParams();

    if (filters.status) params.append('status', filters.status);
    if (filters.tipo) params.append('tipo', filters.tipo);
    if (filters.unidadeId) params.append('unidadeId', filters.unidadeId.toString());
    if (filters.pagina) params.append('pagina', filters.pagina.toString());
    if (filters.limite) params.append('limite', filters.limite.toString());

    const response = await apiClient.get(`/solicitacao?${params.toString()}`);
    return response.data;
  } catch (error: any) {
    // Extrair a mensagem de erro da resposta
    if (error.response) {
      // O servidor respondeu com um status de erro
      const errorMessage = error.response.data?.error || error.message || 'Erro ao buscar solicitação';
      console.error('Erro ao buscar solicitação:', errorMessage);
      throw new Error(errorMessage);
    } else if (error.request) {
      // A requisição foi feita mas não houve resposta
      console.error('Sem resposta do servidor:', error.request);
      throw new Error('Servidor não respondeu. Verifique sua conexão.');
    } else {
      // Algo aconteceu na configuração da requisição
      console.error('Erro na configuração:', error.message);
      throw new Error('Erro ao configurar a requisição');
    }
  }
}

/**
 * Busca solicitação por ID
 * Qualquer usuário logado pode ver, mas com restrições por tipo
 */
export async function buscarSolicitacaoPorId(id: string): Promise<Solicitacao> {
  try {
    const response = await apiClient.get(`/solicitacao/${id}`);
    return response.data.data;
  } catch (error: any) {
    // Extrair a mensagem de erro da resposta
    if (error.response) {
      // O servidor respondeu com um status de erro
      const errorMessage = error.response.data?.error || error.message || 'Erro ao buscar solicitação';
      console.error('Erro ao buscar solicitação:', errorMessage);
      throw new Error(errorMessage);
    } else if (error.request) {
      // A requisição foi feita mas não houve resposta
      console.error('Sem resposta do servidor:', error.request);
      throw new Error('Servidor não respondeu. Verifique sua conexão.');
    } else {
      // Algo aconteceu na configuração da requisição
      console.error('Erro na configuração:', error.message);
      throw new Error('Erro ao configurar a requisição');
    }
  }
}

/**
 * Lista solicitações abertas por um usuário específico
 * Qualquer usuário logado pode ver suas próprias solicitações
 */
export async function listarSolicitacoesPorUsuario(): Promise<Solicitacao[]> {
  try {
    const response = await apiClient.get('/solicitacao/usuario/listar');
    return response.data.data;
  } catch (error: any) {
    // Extrair a mensagem de erro da resposta
    if (error.response) {
      // O servidor respondeu com um status de erro
      const errorMessage = error.response.data?.error || error.message || 'Erro ao buscar solicitação';
      console.error('Erro ao buscar solicitação:', errorMessage);
      throw new Error(errorMessage);
    } else if (error.request) {
      // A requisição foi feita mas não houve resposta
      console.error('Sem resposta do servidor:', error.request);
      throw new Error('Servidor não respondeu. Verifique sua conexão.');
    } else {
      // Algo aconteceu na configuração da requisição
      console.error('Erro na configuração:', error.message);
      throw new Error('Erro ao configurar a requisição');
    }
  }
}

/**
 * Abre uma nova solicitação (público - não exige autenticação)
 */
export async function abrirSolicitacao(data: {
  UnidadeId: number;
  SolicitacaoTipo: string;
  SolicitacaoDescricao: string;
  SolicitacaoSolicitanteNome?: string;
  SolicitacaoSolicitanteEmail?: string;
  SolicitacaoSolicitanteTelefone?: string;
}) {
  try {
    const response = await apiClient.post('/solicitacao', data);
    return response.data;
  } catch (error: any) {
    // Extrair a mensagem de erro da resposta
    if (error.response) {
      // O servidor respondeu com um status de erro
      const errorMessage = error.response.data?.error || error.message || 'Erro ao buscar solicitação';
      console.error('Erro ao buscar solicitação:', errorMessage);
      throw new Error(errorMessage);
    } else if (error.request) {
      // A requisição foi feita mas não houve resposta
      console.error('Sem resposta do servidor:', error.request);
      throw new Error('Servidor não respondeu. Verifique sua conexão.');
    } else {
      // Algo aconteceu na configuração da requisição
      console.error('Erro na configuração:', error.message);
      throw new Error('Erro ao configurar a requisição');
    }
  }
}

/**
 * Altera o status de uma solicitação
 * Apenas gestores e administradores podem alterar
 * Cidadãos e técnicos só podem cancelar suas próprias solicitações
 */
export async function alterarStatusSolicitacao(
  id: string,
  status: 'PENDENTE' | 'EMATENDIMENTO' | 'CONCLUIDO' | 'RECUSADO' | 'CANCELADO' | 'FALTAINFORMACAO'
) {
  try {
    const response = await apiClient.patch(`/solicitacao/${id}/status`, {
      SolicitacaoStatus: status
    });
    return response.data;
  } catch (error: any) {
    // Extrair a mensagem de erro da resposta
    if (error.response) {
      // O servidor respondeu com um status de erro
      const errorMessage = error.response.data?.error || error.message || 'Erro ao buscar solicitação';
      console.error('Erro ao buscar solicitação:', errorMessage);
      throw new Error(errorMessage);
    } else if (error.request) {
      // A requisição foi feita mas não houve resposta
      console.error('Sem resposta do servidor:', error.request);
      throw new Error('Servidor não respondeu. Verifique sua conexão.');
    } else {
      // Algo aconteceu na configuração da requisição
      console.error('Erro na configuração:', error.message);
      throw new Error('Erro ao configurar a requisição');
    }
  }
}

/**
 * Altera uma solicitação (apenas gestores e administradores)
 */
export async function alterarSolicitacao(
  id: string,
  data: {
    UnidadeId?: number;
    SolicitacaoTipo?: string;
    SolicitacaoDescricao?: string;
    SolicitacaoIdRelacional?: string;
    SolicitacaoSolicitanteNome?: string;
    SolicitacaoSolicitanteEmail?: string;
    SolicitacaoSolicitanteTelefone?: string;
  }
) {
  try {
    const response = await apiClient.put(`/solicitacao/${id}`, data);
    return response.data;
  } catch (error: any) {
    // Extrair a mensagem de erro da resposta
    if (error.response) {
      // O servidor respondeu com um status de erro
      const errorMessage = error.response.data?.error || error.message || 'Erro ao buscar solicitação';
      console.error('Erro ao buscar solicitação:', errorMessage);
      throw new Error(errorMessage);
    } else if (error.request) {
      // A requisição foi feita mas não houve resposta
      console.error('Sem resposta do servidor:', error.request);
      throw new Error('Servidor não respondeu. Verifique sua conexão.');
    } else {
      // Algo aconteceu na configuração da requisição
      console.error('Erro na configuração:', error.message);
      throw new Error('Erro ao configurar a requisição');
    }
  }
}

// =============================================
// CONSTANTES
// =============================================

export const TIPOS_SOLICITACAO = {
  CADASTROPESSOAUNIDADE: 'CADASTROPESSOAUNIDADE',
  DIVERSAS: 'DIVERSAS'
} as const;

export const TIPOS_SOLICITACAO_LIST = [
  TIPOS_SOLICITACAO.CADASTROPESSOAUNIDADE,
  TIPOS_SOLICITACAO.DIVERSAS
];

export const TIPOS_SOLICITACAO_DISPLAY: Record<string, string> = {
  [TIPOS_SOLICITACAO.CADASTROPESSOAUNIDADE]: 'Cadastro em Unidade',
  [TIPOS_SOLICITACAO.DIVERSAS]: 'Solicitação Diversa'
};

export const STATUS_SOLICITACAO = {
  PENDENTE: 'PENDENTE',
  EMATENDIMENTO: 'EMATENDIMENTO',
  CONCLUIDO: 'CONCLUIDO',
  RECUSADO: 'RECUSADO',
  CANCELADO: 'CANCELADO'
} as const;

export const STATUS_SOLICITACAO_LIST = [
  STATUS_SOLICITACAO.PENDENTE,
  STATUS_SOLICITACAO.EMATENDIMENTO,
  STATUS_SOLICITACAO.CONCLUIDO,
  STATUS_SOLICITACAO.RECUSADO,
  STATUS_SOLICITACAO.CANCELADO
];

export const STATUS_SOLICITACAO_DISPLAY: Record<string, string> = {
  [STATUS_SOLICITACAO.PENDENTE]: 'Pendente',
  [STATUS_SOLICITACAO.EMATENDIMENTO]: 'Em Andamento',
  [STATUS_SOLICITACAO.CONCLUIDO]: 'Concluído',
  [STATUS_SOLICITACAO.RECUSADO]: 'Recusado',
  [STATUS_SOLICITACAO.CANCELADO]: 'Cancelado'
};

export const STATUS_SOLICITACAO_COLORS: Record<string, string> = {
  [STATUS_SOLICITACAO.PENDENTE]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  [STATUS_SOLICITACAO.EMATENDIMENTO]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  [STATUS_SOLICITACAO.CONCLUIDO]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  [STATUS_SOLICITACAO.RECUSADO]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  [STATUS_SOLICITACAO.CANCELADO]: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
};