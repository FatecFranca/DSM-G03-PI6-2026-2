import { apiClient } from "./api";

export interface AtividadeSolicitacao {
  AtividadeSolicitacaoId: string;
  SolicitacaoId: string;
  AtividadeSolicitacaoDescricao: string;
  AtividadeSolicitacaoDtRealizacao: string;
  AtividadeSolicitacaoUsuario: string;
}

export interface ListaAtividadesResponse {
  data: AtividadeSolicitacao[];
  paginacao: {
    paginaAtual: number;
    limitePorPagina: number;
    totalRegistros: number;
    totalPaginas: number;
  };
}

/**
 * Adiciona uma atividade a uma solicitação
 */
export async function adicionarAtividade(
  solicitacaoId: string,
  descricao: string
): Promise<AtividadeSolicitacao> {
  try {
    const response = await apiClient.post(`/atividadesolicitacao/solicitacao/${solicitacaoId}`, {
      AtividadeSolicitacaoDescricao: descricao
    });
    return response.data.data;
  } catch (error: any) {
    console.error('Erro ao adicionar atividade:', error);
    throw new Error(error.response?.data?.error || error.message || 'Erro ao adicionar atividade');
  }
}

/**
 * Lista atividades de uma solicitação
 */
export async function listarAtividadesPorSolicitacao(
  solicitacaoId: string,
  limite: number = 10,
  pagina: number = 1
): Promise<AtividadeSolicitacao[]> {
  try {
    const response = await apiClient.get(`/atividadesolicitacao/solicitacao/${solicitacaoId}/atividades?limite=${limite}&pagina=${pagina}`);
    return response.data.data;
  } catch (error: any) {
    console.error('Erro ao listar atividades:', error);
    throw new Error(error.response?.data?.error || error.message || 'Erro ao listar atividades');
  }
}

/**
 * Busca uma atividade por ID
 */
export async function buscarAtividadePorId(id: string): Promise<AtividadeSolicitacao> {
  try {
    const response = await apiClient.get(`/atividadesolicitacao/${id}`);
    return response.data.data;
  } catch (error: any) {
    console.error('Erro ao buscar atividade:', error);
    throw new Error(error.response?.data?.error || error.message || 'Erro ao buscar atividade');
  }
}

/**
 * Altera uma atividade
 */
export async function alterarAtividade(id: string, descricao: string): Promise<AtividadeSolicitacao> {
  try {
    const response = await apiClient.put(`/atividadesolicitacao/${id}`, {
      AtividadeSolicitacaoDescricao: descricao
    });
    return response.data.data;
  } catch (error: any) {
    console.error('Erro ao alterar atividade:', error);
    throw new Error(error.response?.data?.error || error.message || 'Erro ao alterar atividade');
  }
}

/**
 * Exclui uma atividade
 */
export async function excluirAtividade(id: string): Promise<void> {
  try {
    await apiClient.delete(`/atividadesolicitacao/${id}`);
  } catch (error: any) {
    console.error('Erro ao excluir atividade:', error);
    throw new Error(error.response?.data?.error || error.message || 'Erro ao excluir atividade');
  }
}