import { apiClient } from "./api"

export interface DashboardData {
  totalUnidadesAtivas: number
  totalUnidadesInativas: number
  totalPessoas: number
  totalTecnicos: number
  totalChamados: number
  totalAtividades: number
  totalTiposSuporte: number
  totalDepartamentos: number
  totalEquipes: number
  totalGestores: number
}

export async function getDashboardData(): Promise<DashboardData> {
  try {
    const response = await apiClient.get('/admin/dashboard')
    return response.data.data
  } catch (error) {
    console.error('Erro ao buscar dados do dashboard:', error)
    throw error
  }
}

// Para atividades recentes (você precisará criar esse endpoint)
export async function getAtividadesRecentes() {
  try {
    const response = await apiClient.get('/admin/atividades-recentes')
    return response.data.data
  } catch (error) {
    console.error('Erro ao buscar atividades recentes:', error)
    return [] // Retorna array vazio em caso de erro
  }
}