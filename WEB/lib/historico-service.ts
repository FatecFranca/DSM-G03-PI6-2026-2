import { apiClient } from "./api";

export interface HistoricoChamado {
  HistChamadoId: string;
  ChamadoId: string;
  HistChamadoDescricao: string;
  HistChamadoDt: string;
  HistChamadoUsuario: string;
  HistChamadoAcao: string;
  HistChamadoUsuarioVer: string;
  Chamado?: {
    ChamadoId: string;
    ChamadoTitulo: string;
    ChamadoStatus: string;
  };
}

export interface HistoricoChamadoFilters {
  ordem?: 'asc' | 'desc';
  limite?: number;
}

export interface ListaHistoricoResponse {
  data: HistoricoChamado[];
  total: number;
  chamado: {
    ChamadoId: string;
    ChamadoTitulo: string;
    ChamadoStatus: string;
  };
}

/**
 * Lista o histórico de ações de um chamado
 * @param chamadoId - ID do chamado
 * @param filters - Filtros opcionais (ordem, limite)
 * @returns Lista de históricos do chamado
 * 
 * @example
 * // Buscar histórico em ordem decrescente (mais recente primeiro)
 * const historico = await listarHistoricoChamado('uuid-do-chamado', { ordem: 'desc' });
 */
export async function listarHistoricoChamado(
  chamadoId: string,
  filters: HistoricoChamadoFilters = {}
): Promise<HistoricoChamado[]> {
  try {
    const params = new URLSearchParams();
    
    if (filters.ordem) {
      params.append('ordem', filters.ordem);
    }
    
    if (filters.limite) {
      params.append('limite', filters.limite.toString());
    }
    
    const queryString = params.toString();
    const url = `/historicochamado/chamado/${chamadoId}${queryString ? `?${queryString}` : ''}`;
    
    const response = await apiClient.get(url);
    return response.data.data;
  } catch (error) {
    console.error('Erro ao listar histórico do chamado:', error);
    throw error;
  }
}

/**
 * Busca um histórico específico por ID
 * @param id - ID do histórico
 * @returns Histórico do chamado
 */
export async function buscarHistoricoPorId(id: string): Promise<HistoricoChamado> {
  try {
    const response = await apiClient.get(`/historicochamado/${id}`);
    return response.data.data;
  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    throw error;
  }
}

/**
 * Cria um novo registro de histórico para um chamado
 * @param data - Dados do histórico
 * @returns Histórico criado
 */
export async function criarHistoricoChamado(data: {
  ChamadoId: string;
  HistChamadoDescricao: string;
  HistChamadoUsuario: string;
  HistChamadoAcao: string;
  HistChamadoUsuarioVer?: string;
}): Promise<HistoricoChamado> {
  try {
    const response = await apiClient.post('/historicochamado', data);
    return response.data.data;
  } catch (error) {
    console.error('Erro ao criar histórico:', error);
    throw error;
  }
}

/**
 * Remove um registro de histórico
 * @param id - ID do histórico
 */
export async function excluirHistoricoChamado(id: string): Promise<void> {
  try {
    await apiClient.delete(`/historicochamado/${id}`);
  } catch (error) {
    console.error('Erro ao excluir histórico:', error);
    throw error;
  }
}

// =============================================
// CONSTANTES PARA AÇÕES DO HISTÓRICO
// =============================================

export const ACAO_HISTORICO = {
  CRIACAO: 'CRIACAO',
  ATUALIZACAO: 'ATUALIZACAO',
  MUDANCA_STATUS: 'MUDANCA_STATUS',
  ATRIBUICAO: 'ATRIBUICAO',
  RECUSA: 'RECUSA',
  CONCLUSAO: 'CONCLUSAO',
  CANCELAMENTO: 'CANCELAMENTO',
  FALTA_INFORMACAO: 'FALTA_INFORMACAO',
  RETORNO_PENDENTE: 'RETORNO_PENDENTE'
} as const;

export type AcaoHistorico = typeof ACAO_HISTORICO[keyof typeof ACAO_HISTORICO];

export const ACAO_HISTORICO_LABELS: Record<AcaoHistorico, string> = {
  [ACAO_HISTORICO.CRIACAO]: 'Criação do Chamado',
  [ACAO_HISTORICO.ATUALIZACAO]: 'Atualização',
  [ACAO_HISTORICO.MUDANCA_STATUS]: 'Mudança de Status',
  [ACAO_HISTORICO.ATRIBUICAO]: 'Atribuição de Equipe',
  [ACAO_HISTORICO.RECUSA]: 'Recusa',
  [ACAO_HISTORICO.CONCLUSAO]: 'Conclusão',
  [ACAO_HISTORICO.CANCELAMENTO]: 'Cancelamento',
  [ACAO_HISTORICO.FALTA_INFORMACAO]: 'Falta Informação',
  [ACAO_HISTORICO.RETORNO_PENDENTE]: 'Retorno Pendente'
};

export const ACAO_HISTORICO_COLORS: Record<AcaoHistorico, string> = {
  [ACAO_HISTORICO.CRIACAO]: 'text-green-600 dark:text-green-400',
  [ACAO_HISTORICO.ATUALIZACAO]: 'text-blue-600 dark:text-blue-400',
  [ACAO_HISTORICO.MUDANCA_STATUS]: 'text-purple-600 dark:text-purple-400',
  [ACAO_HISTORICO.ATRIBUICAO]: 'text-indigo-600 dark:text-indigo-400',
  [ACAO_HISTORICO.RECUSA]: 'text-red-600 dark:text-red-400',
  [ACAO_HISTORICO.CONCLUSAO]: 'text-green-600 dark:text-green-400',
  [ACAO_HISTORICO.CANCELAMENTO]: 'text-red-600 dark:text-red-400',
  [ACAO_HISTORICO.FALTA_INFORMACAO]: 'text-pink-600 dark:text-pink-400',
  [ACAO_HISTORICO.RETORNO_PENDENTE]: 'text-yellow-600 dark:text-yellow-400'
};

export const ACAO_HISTORICO_BG_COLORS: Record<AcaoHistorico, string> = {
  [ACAO_HISTORICO.CRIACAO]: 'bg-green-100 dark:bg-green-900/20',
  [ACAO_HISTORICO.ATUALIZACAO]: 'bg-blue-100 dark:bg-blue-900/20',
  [ACAO_HISTORICO.MUDANCA_STATUS]: 'bg-purple-100 dark:bg-purple-900/20',
  [ACAO_HISTORICO.ATRIBUICAO]: 'bg-indigo-100 dark:bg-indigo-900/20',
  [ACAO_HISTORICO.RECUSA]: 'bg-red-100 dark:bg-red-900/20',
  [ACAO_HISTORICO.CONCLUSAO]: 'bg-green-100 dark:bg-green-900/20',
  [ACAO_HISTORICO.CANCELAMENTO]: 'bg-red-100 dark:bg-red-900/20',
  [ACAO_HISTORICO.FALTA_INFORMACAO]: 'bg-pink-100 dark:bg-pink-900/20',
  [ACAO_HISTORICO.RETORNO_PENDENTE]: 'bg-yellow-100 dark:bg-yellow-900/20'
};

export const ACAO_HISTORICO_ICONS: Record<AcaoHistorico, string> = {
  [ACAO_HISTORICO.CRIACAO]: 'Ticket',
  [ACAO_HISTORICO.ATUALIZACAO]: 'Edit',
  [ACAO_HISTORICO.MUDANCA_STATUS]: 'RefreshCw',
  [ACAO_HISTORICO.ATRIBUICAO]: 'Users',
  [ACAO_HISTORICO.RECUSA]: 'ShieldBan',
  [ACAO_HISTORICO.CONCLUSAO]: 'CheckCircle',
  [ACAO_HISTORICO.CANCELAMENTO]: 'XCircle',
  [ACAO_HISTORICO.FALTA_INFORMACAO]: 'CircleAlert',
  [ACAO_HISTORICO.RETORNO_PENDENTE]: 'Clock'
};