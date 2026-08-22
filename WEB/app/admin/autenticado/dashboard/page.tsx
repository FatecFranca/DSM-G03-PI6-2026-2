"use client"

import { useEffect, useState } from "react"
import { BarChart3, Users, Building2, Hammer, Clock, Activity, FolderTree, Users2, Briefcase, UserCog } from "lucide-react"
import { getDashboardData, type DashboardData } from "@/lib/dashboard-service"

interface StatCard {
  title: string
  value: number | string
  icon: React.ElementType
  change?: string
  changeType?: 'positive' | 'negative'
  color?: string
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setIsLoading(true)
      const dashboardData = await getDashboardData()
      setData(dashboardData)
      setError(null)
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err)
      setError('Não foi possível carregar os dados do dashboard')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
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

  const stats: StatCard[] = [
    { 
      title: "Unidades Ativas", 
      value: data.totalUnidadesAtivas, 
      icon: Building2,
      color: "bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
    },
    { 
      title: "Unidades Inativas", 
      value: data.totalUnidadesInativas, 
      icon: Building2,
      color: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
    },
    { 
      title: "Pessoas", 
      value: data.totalPessoas, 
      icon: Users,
      color: "bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400"
    },
    { 
      title: "Técnicos", 
      value: data.totalTecnicos, 
      icon: Hammer,
      color: "bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400"
    },
    { 
      title: "Gestores", 
      value: data.totalGestores, 
      icon: UserCog,
      color: "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400"
    },
    { 
      title: "Equipes", 
      value: data.totalEquipes, 
      icon: Users2,
      color: "bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400"
    },
    { 
      title: "Chamados", 
      value: data.totalChamados, 
      icon: Clock,
      color: "bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400"
    },
    { 
      title: "Atividades", 
      value: data.totalAtividades, 
      icon: Activity,
      color: "bg-pink-100 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400"
    },
    { 
      title: "Tipos de Suporte", 
      value: data.totalTiposSuporte, 
      icon: Briefcase,
      color: "bg-cyan-100 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400"
    },
    { 
      title: "Departamentos", 
      value: data.totalDepartamentos, 
      icon: FolderTree,
      color: "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header com data de atualização */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Dashboard
        </h1>
        <button
          onClick={loadDashboardData}
          className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors flex items-center gap-2"
        >
          <svg 
            className="w-4 h-4" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
            />
          </svg>
          Atualizar
        </button>
      </div>

      {/* Stats Grid - Agora com todos os dados da API */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div 
            key={index} 
            className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className={`p-2.5 rounded-lg ${stat.color}`}>
                <stat.icon size={22} />
              </div>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {stat.title}
              </span>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
              </h3>
            </div>
          </div>
        ))}
      </div>

      {/* Resumo Rápido */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Resumo do Sistema
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total de Unidades</p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {(data.totalUnidadesAtivas + data.totalUnidadesInativas).toLocaleString()}
            </p>
            <div className="mt-2 flex gap-2 text-xs">
              <span className="text-green-600 dark:text-green-400">{data.totalUnidadesAtivas} ativas</span>
              <span className="text-red-600 dark:text-red-400">{data.totalUnidadesInativas} inativas</span>
            </div>
          </div>
          
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Pessoas x Técnicos</p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {((data.totalTecnicos / data.totalPessoas) * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
              {data.totalTecnicos} técnicos de {data.totalPessoas} pessoas
            </p>
          </div>
          
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Média de Atividades</p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {data.totalChamados > 0 
                ? (data.totalAtividades / data.totalChamados).toFixed(1) 
                : 0}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
              por chamado
            </p>
          </div>
          
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Gestores por Unidade</p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {data.totalUnidadesAtivas > 0 
                ? (data.totalGestores / data.totalUnidadesAtivas).toFixed(1) 
                : 0}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
              média por unidade ativa
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}