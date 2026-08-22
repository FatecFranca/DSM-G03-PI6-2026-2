"use client"

import { useEffect, useState } from "react"
import {
  Users,
  Hammer,
  UserCog,
  Users2,
  Briefcase,
  FolderTree,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  HelpCircle,
  RefreshCw,
  BarChart3
} from "lucide-react"
import { useGestorAuth } from "@/app/contexts/GestorAuthContext"
import { apiClient } from "@/lib/api"
import Cookies from "js-cookie"

interface DashboardData {
  totalPessoas: number
  totalTecnicos: number
  totalEquipes: number
  totalGestoresComuns: number
  totalGestoresADM: number
  totalTiposSuporte: number
  totalDepartamentos: number
  totalChamadosPendentes: number
  totalChamadosAnalisados: number
  totalChamadosAtribuidos: number
  totalChamadosAtendimento: number
  totalChamadosFaltandoInformacao: number
  totalChamadosRecusados: number
}

interface StatCard {
  title: string
  value: number
  icon: React.ElementType
  color: string
  bgColor: string
  description?: string
}

interface ChamadoStatusCard {
  title: string
  value: number
  icon: React.ElementType
  color: string
  bgColor: string
  status: string
}

export default function GestorDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isClient, setIsClient] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user, isAdminUnidade, isAuthenticated } = useGestorAuth()

  // Marcar quando estiver no cliente
  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (isClient && isAuthenticated) {
      loadDashboardData()
    }
  }, [isClient, isAuthenticated])

  const loadDashboardData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await apiClient.get('/gestor/dashboard/dados')
      setData(response.data.data)
    } catch (err: any) {
      console.error('Erro ao carregar dashboard:', err)
      
      if (err.response?.status === 401) {
        setError('Sessão expirada. Faça login novamente.')
        setTimeout(() => {
          window.location.href = '/gestor/login'
        }, 2000)
      } else {
        setError(err.response?.data?.error || 'Não foi possível carregar os dados do dashboard')
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Não renderizar nada até estar no cliente
  if (!isClient) {
    return (
      <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    )
  }

  // Se não estiver autenticado, mostrar loading (o layout vai redirecionar)
  if (!isAuthenticated) {
    return (
      <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center max-w-md">
          <AlertCircle size={48} className="text-red-600 dark:text-red-400 mx-auto mb-4" />
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={loadDashboardData}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  if (!data) {
    return null
  }

  // Cards de recursos gerais (visíveis para todos)
  const resourceCards: StatCard[] = [
    {
      title: "Pessoas",
      value: data.totalPessoas,
      icon: Users,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-900/20",
      description: "Pessoas ativas para abertura de chamados"
    },
    {
      title: "Técnicos",
      value: data.totalTecnicos,
      icon: Hammer,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-100 dark:bg-purple-900/20",
      description: "Técnicos ativos na unidade"
    },
    {
      title: "Equipes",
      value: data.totalEquipes,
      icon: Users2,
      color: "text-indigo-600 dark:text-indigo-400",
      bgColor: "bg-indigo-100 dark:bg-indigo-900/20",
      description: "Equipes ativas na unidade"
    }
  ]

  // Cards de gestão (apenas para ADMINUNIDADE)
  const managementCards: StatCard[] = []

  if (isAdminUnidade) {
    managementCards.push(
      {
        title: "Gestores",
        value: data.totalGestoresComuns + data.totalGestoresADM,
        icon: UserCog,
        color: "text-yellow-600 dark:text-yellow-400",
        bgColor: "bg-yellow-100 dark:bg-yellow-900/20",
        description: "Total de gestores na unidade"
      },
      {
        title: "Tipos de Suporte",
        value: data.totalTiposSuporte,
        icon: Briefcase,
        color: "text-cyan-600 dark:text-cyan-400",
        bgColor: "bg-cyan-100 dark:bg-cyan-900/20",
        description: "Tipos de suporte ativos"
      },
      {
        title: "Departamentos",
        value: data.totalDepartamentos,
        icon: FolderTree,
        color: "text-emerald-600 dark:text-emerald-400",
        bgColor: "bg-emerald-100 dark:bg-emerald-900/20",
        description: "Departamentos ativos"
      }
    )
  }

  // Cards de status de chamados
  const chamadoStatusCards: ChamadoStatusCard[] = [
    {
      title: "Pendentes",
      value: data.totalChamadosPendentes,
      icon: Clock,
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-100 dark:bg-orange-900/20",
      status: "Aguardando análise"
    },
    {
      title: "Analisados",
      value: data.totalChamadosAnalisados,
      icon: CheckCircle,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900/20",
      status: "Prontos para atribuição"
    },
    {
      title: "Atribuídos",
      value: data.totalChamadosAtribuidos,
      icon: Users2,
      color: "text-indigo-600 dark:text-indigo-400",
      bgColor: "bg-indigo-100 dark:bg-indigo-900/20",
      status: "Aguardando início"
    },
    {
      title: "Em Atendimento",
      value: data.totalChamadosAtendimento,
      icon: Hammer,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-100 dark:bg-purple-900/20",
      status: "Em andamento"
    },
    {
      title: "Falta Informação",
      value: data.totalChamadosFaltandoInformacao,
      icon: HelpCircle,
      color: "text-yellow-600 dark:text-yellow-400",
      bgColor: "bg-yellow-100 dark:bg-yellow-900/20",
      status: "Aguardando complemento"
    },
    {
      title: "Recusados",
      value: data.totalChamadosRecusados,
      icon: XCircle,
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-100 dark:bg-red-900/20",
      status: "Não aprovados"
    }
  ]

  // Calcular total de chamados
  const totalChamados =
    data.totalChamadosPendentes +
    data.totalChamadosAnalisados +
    data.totalChamadosAtribuidos +
    data.totalChamadosAtendimento +
    data.totalChamadosFaltandoInformacao +
    data.totalChamadosRecusados

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Dashboard da Unidade
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {user?.Unidade?.UnidadeNome} • {isAdminUnidade ? 'Administrador de Unidade' : 'Gestor Comum'}
          </p>
        </div>
        <button
          onClick={loadDashboardData}
          className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg transition-colors"
        >
          <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          <span>Atualizar</span>
        </button>
      </div>

      {/* Informação da Unidade */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
            <Building2 size={20} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Unidade</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {user?.Unidade?.UnidadeNome}
            </p>
          </div>
        </div>
      </div>

      {/* Cards de Recursos Gerais */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <Users size={20} />
          Recursos da Unidade
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {resourceCards.map((card, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2.5 rounded-lg ${card.bgColor}`}>
                  <card.icon size={22} className={card.color} />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Ativos
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                {card.value.toLocaleString()}
              </h3>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {card.title}
              </p>
              {card.description && (
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                  {card.description}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Cards de Gestão (apenas ADMINUNIDADE) */}
      {isAdminUnidade && managementCards.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <UserCog size={20} />
            Gestão da Unidade
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {managementCards.map((card, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2.5 rounded-lg ${card.bgColor}`}>
                    <card.icon size={22} className={card.color} />
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Ativos
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                  {card.value.toLocaleString()}
                </h3>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {card.title}
                </p>
                {card.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                    {card.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resumo de Chamados */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <BarChart3 size={20} />
            Status dos Chamados
          </h2>
          <div className="text-right">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {totalChamados.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {chamadoStatusCards.map((card, index) => (
            <div
              key={index}
              className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <card.icon size={18} className={card.color} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {card.title}
                    </p>
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {card.value.toLocaleString()}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {card.status}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Gráfico de Distribuição (placeholder)}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
          Distribuição de Chamados por Status
        </h3>
        <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-lg">
          <div className="text-center">
            <BarChart3 size={32} className="text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Gráfico em desenvolvimento
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Em breve: visualização interativa
            </p>
          </div>
        </div>
      </div>
      {*/}

      {/* Informações adicionais */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-500 dark:text-gray-400">
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <p className="font-medium text-gray-700 dark:text-gray-300 mb-2">Legenda de Status</p>
          <ul className="space-y-1">
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
              Pendente: Aguardando análise inicial
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              Analisado: Pronto para atribuição
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
              Atribuído: Aguardando início do atendimento
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
              Em Atendimento: Em andamento
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
              Falta Informação: Aguardando dados do solicitante
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              Recusado: Não aprovado pelo gestor
            </li>
          </ul>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <p className="font-medium text-gray-700 dark:text-gray-300 mb-2">Última atualização</p>
          <p className="text-sm">{new Date().toLocaleString('pt-BR')}</p>
          <p className="text-xs mt-2 text-gray-400">
            Os dados são atualizados em tempo real conforme as movimentações no sistema.
          </p>
        </div>
      </div>
    </div>
  )
}

// Import missing icon
import { Building2 } from "lucide-react"