"use client"

import { useState, useEffect } from "react"
import { 
  Briefcase,
  Search, 
  Plus, 
  Edit, 
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Eye,
  Users,
  Building2
} from "lucide-react"
import { 
  listarDepartamentos, 
  cadastrarDepartamento, 
  alterarDepartamento, 
  alterarStatusDepartamento,
  type Departamento,
  type DepartamentoFilters
} from "@/lib/departamento-service"
import { useGestorAuth } from "@/app/contexts/GestorAuthContext"

// Componente de Modal de Confirmação
function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  type = "warning"
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: "warning" | "danger" | "info"
}) {
  if (!isOpen) return null

  const colors = {
    warning: {
      bg: "bg-yellow-100 dark:bg-yellow-900/20",
      text: "text-yellow-600 dark:text-yellow-400",
      button: "bg-yellow-600 hover:bg-yellow-700"
    },
    danger: {
      bg: "bg-red-100 dark:bg-red-900/20",
      text: "text-red-600 dark:text-red-400",
      button: "bg-red-600 hover:bg-red-700"
    },
    info: {
      bg: "bg-blue-100 dark:bg-blue-900/20",
      text: "text-blue-600 dark:text-blue-400",
      button: "bg-blue-600 hover:bg-blue-700"
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-md w-full mx-4">
        <div className="p-6">
          <div className={`w-12 h-12 ${colors[type].bg} rounded-full flex items-center justify-center mx-auto mb-4`}>
            {type === "warning" && <AlertCircle className={colors[type].text} size={24} />}
            {type === "danger" && <XCircle className={colors[type].text} size={24} />}
            {type === "info" && <CheckCircle className={colors[type].text} size={24} />}
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 text-center mb-2">
            {title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-6">
            {message}
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={() => {
                onConfirm()
                onClose()
              }}
              className={`flex-1 px-4 py-2 ${colors[type].button} text-white rounded-lg transition-colors`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Componente de Modal de Cadastro/Edição
function DepartamentoModal({
  isOpen,
  onClose,
  onSave,
  departamento,
  unidadeId,
  isLoading
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (data: { DepartamentoNome: string; DepartamentoStatus?: 'ATIVO' | 'INATIVO' | 'BLOQUEADO' }) => Promise<void>
  departamento?: Departamento | null
  unidadeId: number
  isLoading: boolean
}) {
  const [formData, setFormData] = useState({
    DepartamentoNome: "",
    DepartamentoStatus: "ATIVO" as 'ATIVO' | 'INATIVO' | 'BLOQUEADO'
  })
  const [errors, setErrors] = useState<{ nome?: string }>({})

  useEffect(() => {
    if (departamento) {
      setFormData({
        DepartamentoNome: departamento.DepartamentoNome,
        DepartamentoStatus: departamento.DepartamentoStatus
      })
    } else {
      setFormData({
        DepartamentoNome: "",
        DepartamentoStatus: "ATIVO"
      })
    }
    setErrors({})
  }, [departamento, isOpen])

  const validate = () => {
    const newErrors: { nome?: string } = {}
    if (!formData.DepartamentoNome.trim()) {
      newErrors.nome = "Nome do departamento é obrigatório"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    await onSave({
      DepartamentoNome: formData.DepartamentoNome,
      DepartamentoStatus: formData.DepartamentoStatus
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {departamento ? 'Editar Departamento' : 'Novo Departamento'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            <X size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nome do Departamento *
            </label>
            <input
              type="text"
              value={formData.DepartamentoNome}
              onChange={(e) => setFormData({ ...formData, DepartamentoNome: e.target.value })}
              className={`w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 dark:text-gray-100 ${
                errors.nome ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
              }`}
              placeholder="Digite o nome do departamento"
              disabled={isLoading}
            />
            {errors.nome && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.nome}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              value={formData.DepartamentoStatus}
              onChange={(e) => setFormData({ 
                ...formData, 
                DepartamentoStatus: e.target.value as 'ATIVO' | 'INATIVO' | 'BLOQUEADO' 
              })}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 dark:text-gray-100"
              disabled={isLoading}
            >
              <option value="ATIVO">ATIVO</option>
              <option value="INATIVO">INATIVO</option>
              <option value="BLOQUEADO">BLOQUEADO</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Salvando...
                </>
              ) : (
                departamento ? 'Atualizar' : 'Cadastrar'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Componente de Modal de Visualização
function ViewModal({
  isOpen,
  onClose,
  departamento
}: {
  isOpen: boolean
  onClose: () => void
  departamento: Departamento | null
}) {
  if (!isOpen || !departamento) return null

  const getStatusBadge = (status: string) => {
    const styles = {
      ATIVO: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      INATIVO: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
      BLOQUEADO: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    }
    return styles[status as keyof typeof styles] || styles.INATIVO
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-2xl w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Detalhes do Departamento
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            <X size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Nome</p>
              <p className="text-lg font-medium text-gray-900 dark:text-gray-100">{departamento.DepartamentoNome}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
              <span className={`inline-block px-2 py-1 mt-1 rounded-full text-xs font-medium ${getStatusBadge(departamento.DepartamentoStatus)}`}>
                {departamento.DepartamentoStatus}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Data de Cadastro</p>
              <p className="text-base text-gray-900 dark:text-gray-100">
                {new Date(departamento.DepartamentoDtCadastro).toLocaleDateString('pt-BR')}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total de Técnicos</p>
              <p className="text-base font-bold text-gray-900 dark:text-gray-100">
                {departamento._count?.Tecnico || 0}
              </p>
            </div>
          </div>

          {departamento.Tecnico && departamento.Tecnico.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <Users size={16} />
                Técnicos do Departamento
              </h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {departamento.Tecnico.map(tecnico => (
                  <div key={tecnico.TecnicoId} className="flex items-center justify-between py-1">
                    <span className="text-sm text-gray-900 dark:text-gray-100">{tecnico.TecnicoNome}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      tecnico.TecnicoStatus === 'ATIVO' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                    }`}>
                      {tecnico.TecnicoStatus}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function DepartamentosPage() {
  const [departamentos, setDepartamentos] = useState<Departamento[]>([])
  const [paginacao, setPaginacao] = useState({
    paginaAtual: 1,
    limitePorPagina: 10,
    totalRegistros: 0,
    totalPaginas: 1
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<DepartamentoFilters>({
    pagina: 1,
    limite: 10
  })
  const [showFilters, setShowFilters] = useState(false)
  const [selectedDepartamento, setSelectedDepartamento] = useState<Departamento | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalLoading, setModalLoading] = useState(false)
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [departamentoToToggle, setDepartamentoToToggle] = useState<Departamento | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [viewingDepartamento, setViewingDepartamento] = useState<Departamento | null>(null)

  const { user } = useGestorAuth()

  useEffect(() => {
    carregarDepartamentos()
  }, [filters])

  const carregarDepartamentos = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await listarDepartamentos(filters)
      setDepartamentos(response.data)
      setPaginacao(response.paginacao)
    } catch (err) {
      console.error('Erro ao carregar departamentos:', err)
      setError('Não foi possível carregar os departamentos')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFilterChange = (key: keyof DepartamentoFilters, value: string) => {
    setFilters({ ...filters, [key]: value === 'TODOS' ? undefined : value, pagina: 1 })
  }

  const handlePageChange = (novaPagina: number) => {
    setFilters({ ...filters, pagina: novaPagina })
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setFilters({ ...filters, pagina: 1 })
  }

  const handleNewDepartamento = () => {
    setSelectedDepartamento(null)
    setModalOpen(true)
  }

  const handleEditDepartamento = (departamento: Departamento) => {
    setSelectedDepartamento(departamento)
    setModalOpen(true)
  }

  const handleViewDepartamento = (departamento: Departamento) => {
    setViewingDepartamento(departamento)
    setViewModalOpen(true)
  }

  const handleToggleStatus = (departamento: Departamento) => {
    setDepartamentoToToggle(departamento)
    setConfirmModalOpen(true)
  }

  const confirmToggleStatus = async () => {
    if (!departamentoToToggle) return

    try {
      setModalLoading(true)
      const novoStatus = departamentoToToggle.DepartamentoStatus === 'ATIVO' ? 'INATIVO' : 'ATIVO'
      await alterarStatusDepartamento(departamentoToToggle.DepartamentoId, novoStatus)
      await carregarDepartamentos()
    } catch (err: any) {
      console.error('Erro ao alterar status:', err)
      alert(err.response?.data?.error || 'Erro ao alterar status do departamento')
    } finally {
      setModalLoading(false)
      setDepartamentoToToggle(null)
    }
  }

  const handleSaveDepartamento = async (data: { DepartamentoNome: string; DepartamentoStatus?: 'ATIVO' | 'INATIVO' | 'BLOQUEADO' }) => {
    if (!user?.Unidade?.UnidadeId) {
      alert('Unidade não identificada')
      return
    }

    try {
      setModalLoading(true)
      if (selectedDepartamento) {
        await alterarDepartamento(selectedDepartamento.DepartamentoId, data)
      } else {
        await cadastrarDepartamento({
          UnidadeId: user.Unidade.UnidadeId,
          ...data
        })
      }
      setModalOpen(false)
      await carregarDepartamentos()
    } catch (err: any) {
      console.error('Erro ao salvar departamento:', err)
      alert(err.response?.data?.error || 'Erro ao salvar departamento')
    } finally {
      setModalLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      ATIVO: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      INATIVO: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
      BLOQUEADO: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    }
    return styles[status as keyof typeof styles] || styles.INATIVO
  }

  // Filtrar localmente
  const departamentosFiltrados = departamentos.filter(d => 
    d.DepartamentoNome.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Departamentos
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Gerencie os departamentos da unidade
          </p>
          {user?.Unidade && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1">
              <Building2 size={12} />
              {user.Unidade.UnidadeNome}
            </p>
          )}
        </div>
        <button
          onClick={handleNewDepartamento}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus size={18} />
          <span>Novo Departamento</span>
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
        <div className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Busca */}
            <form onSubmit={handleSearch} className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Buscar departamentos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 dark:text-gray-100"
              />
            </form>

            {/* Botão de filtros */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Filter size={18} />
              <span>Filtros</span>
            </button>

            {/* Atualizar */}
            <button
              onClick={carregarDepartamentos}
              className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
              <span>Atualizar</span>
            </button>
          </div>

          {/* Opções de filtro */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleFilterChange('status', 'TODOS')}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    !filters.status
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => handleFilterChange('status', 'ATIVO')}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    filters.status === 'ATIVO'
                      ? 'bg-green-600 text-white'
                      : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-800'
                  }`}
                >
                  ATIVO
                </button>
                <button
                  onClick={() => handleFilterChange('status', 'INATIVO')}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    filters.status === 'INATIVO'
                      ? 'bg-gray-600 text-white'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  INATIVO
                </button>
                <button
                  onClick={() => handleFilterChange('status', 'BLOQUEADO')}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    filters.status === 'BLOQUEADO'
                      ? 'bg-red-600 text-white'
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800'
                  }`}
                >
                  BLOQUEADO
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Tabela */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : departamentosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Briefcase size={48} className="text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-400 mb-2">Nenhum departamento encontrado</p>
            <button
              onClick={handleNewDepartamento}
              className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <Plus size={16} />
              Cadastrar primeiro departamento
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Técnicos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Data Cadastro
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {departamentosFiltrados.map((departamento) => (
                  <tr key={departamento.DepartamentoId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {departamento.DepartamentoNome}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(departamento.DepartamentoStatus)}`}>
                        {departamento.DepartamentoStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Users size={14} />
                        {departamento._count?.Tecnico || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {new Date(departamento.DepartamentoDtCadastro).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 text-sm text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewDepartamento(departamento)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                          title="Visualizar"
                        >
                          <Eye size={18} className="text-gray-600 dark:text-gray-400" />
                        </button>
                        <button
                          onClick={() => handleEditDepartamento(departamento)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                          title="Editar"
                        >
                          <Edit size={18} className="text-gray-600 dark:text-gray-400" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(departamento)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                          title={departamento.DepartamentoStatus === 'ATIVO' ? 'Inativar' : 'Ativar'}
                        >
                          {departamento.DepartamentoStatus === 'ATIVO' ? (
                            <XCircle size={18} className="text-red-600 dark:text-red-400" />
                          ) : (
                            <CheckCircle size={18} className="text-green-600 dark:text-green-400" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginação */}
        {!isLoading && departamentosFiltrados.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Mostrando {(paginacao.paginaAtual - 1) * paginacao.limitePorPagina + 1} a {Math.min(paginacao.paginaAtual * paginacao.limitePorPagina, paginacao.totalRegistros)} de {paginacao.totalRegistros} resultados
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(paginacao.paginaAtual - 1)}
                disabled={paginacao.paginaAtual === 1}
                className="p-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm">
                {paginacao.paginaAtual}
              </span>
              <button
                onClick={() => handlePageChange(paginacao.paginaAtual + 1)}
                disabled={paginacao.paginaAtual === paginacao.totalPaginas}
                className="p-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <DepartamentoModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveDepartamento}
        departamento={selectedDepartamento}
        unidadeId={user?.Unidade?.UnidadeId || 0}
        isLoading={modalLoading}
      />

      <ConfirmModal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={confirmToggleStatus}
        title={departamentoToToggle?.DepartamentoStatus === 'ATIVO' ? 'Inativar Departamento' : 'Ativar Departamento'}
        message={`Tem certeza que deseja ${departamentoToToggle?.DepartamentoStatus === 'ATIVO' ? 'inativar' : 'ativar'} o departamento "${departamentoToToggle?.DepartamentoNome}"?`}
        confirmText={departamentoToToggle?.DepartamentoStatus === 'ATIVO' ? 'Inativar' : 'Ativar'}
        type={departamentoToToggle?.DepartamentoStatus === 'ATIVO' ? 'danger' : 'info'}
      />

      <ViewModal
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        departamento={viewingDepartamento}
      />
    </div>
  )
}