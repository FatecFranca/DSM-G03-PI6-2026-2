"use client"

import { useState, useEffect } from "react"
import { 
  Building2, 
  Search, 
  Plus, 
  Edit, 
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Eye
} from "lucide-react"
import { 
  listarUnidades, 
  cadastrarUnidade, 
  alterarUnidade, 
  alterarStatusUnidade,
  type Unidade,
  type UnidadeFilters
} from "@/lib/unidade-service"

// Modal de confirmação
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

// Modal de cadastro/edição
function UnidadeModal({
  isOpen,
  onClose,
  onSave,
  unidade,
  isLoading
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (data: { UnidadeNome: string; UnidadeStatus?: string }) => Promise<void>
  unidade?: Unidade | null
  isLoading: boolean
}) {
  const [formData, setFormData] = useState({
    UnidadeNome: "",
    UnidadeStatus: "ATIVA"
  })
  const [errors, setErrors] = useState<{ nome?: string }>({})

  useEffect(() => {
    if (unidade) {
      setFormData({
        UnidadeNome: unidade.UnidadeNome,
        UnidadeStatus: unidade.UnidadeStatus
      })
    } else {
      setFormData({
        UnidadeNome: "",
        UnidadeStatus: "ATIVA"
      })
    }
    setErrors({})
  }, [unidade, isOpen])

  const validate = () => {
    const newErrors: { nome?: string } = {}
    if (!formData.UnidadeNome.trim()) {
      newErrors.nome = "Nome da unidade é obrigatório"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    await onSave(formData)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {unidade ? 'Editar Unidade' : 'Nova Unidade'}
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
              Nome da Unidade *
            </label>
            <input
              type="text"
              value={formData.UnidadeNome}
              onChange={(e) => setFormData({ ...formData, UnidadeNome: e.target.value })}
              className={`w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent outline-none text-gray-900 dark:text-gray-100 ${
                errors.nome ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-700'
              }`}
              placeholder="Digite o nome da unidade"
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
              value={formData.UnidadeStatus}
              onChange={(e) => setFormData({ ...formData, UnidadeStatus: e.target.value })}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent outline-none text-gray-900 dark:text-gray-100"
              disabled={isLoading}
            >
              <option value="ATIVA">ATIVA</option>
              <option value="INATIVA">INATIVA</option>
              <option value="BLOQUEADA">BLOQUEADA</option>
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
              className="flex-1 px-4 py-2 bg-gray-900 hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Salvando...
                </>
              ) : (
                unidade ? 'Atualizar' : 'Cadastrar'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function UnidadesPage() {
  const [unidades, setUnidades] = useState<Unidade[]>([])
  const [paginacao, setPaginacao] = useState({
    paginaAtual: 1,
    limitePorPagina: 10,
    totalRegistros: 0,
    totalPaginas: 1
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<UnidadeFilters>({
    pagina: 1,
    limite: 10
  })
  const [showFilters, setShowFilters] = useState(false)
  const [selectedUnidade, setSelectedUnidade] = useState<Unidade | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalLoading, setModalLoading] = useState(false)
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [unidadeToToggle, setUnidadeToToggle] = useState<Unidade | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [viewingUnidade, setViewingUnidade] = useState<Unidade | null>(null)

  useEffect(() => {
    carregarUnidades()
  }, [filters])

  const carregarUnidades = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await listarUnidades(filters)
      setUnidades(response.data)
      setPaginacao(response.paginacao)
    } catch (err) {
      console.error('Erro ao carregar unidades:', err)
      setError('Não foi possível carregar as unidades')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // Filtro de busca será implementado quando o backend suportar
    // Por enquanto, apenas resetamos a página
    setFilters({ ...filters, pagina: 1 })
  }

  const handleStatusFilter = (status: string) => {
    setFilters({ ...filters, status: status === 'TODOS' ? undefined : status, pagina: 1 })
  }

  const handlePageChange = (novaPagina: number) => {
    setFilters({ ...filters, pagina: novaPagina })
  }

  const handleNewUnidade = () => {
    setSelectedUnidade(null)
    setModalOpen(true)
  }

  const handleEditUnidade = (unidade: Unidade) => {
    setSelectedUnidade(unidade)
    setModalOpen(true)
  }

  const handleViewUnidade = (unidade: Unidade) => {
    setViewingUnidade(unidade)
    setViewModalOpen(true)
  }

  const handleToggleStatus = (unidade: Unidade) => {
    setUnidadeToToggle(unidade)
    setConfirmModalOpen(true)
  }

  const confirmToggleStatus = async () => {
    if (!unidadeToToggle) return

    try {
      setModalLoading(true)
      const novoStatus = unidadeToToggle.UnidadeStatus === 'ATIVA' ? 'INATIVA' : 'ATIVA'
      await alterarStatusUnidade(unidadeToToggle.UnidadeId, novoStatus)
      await carregarUnidades()
    } catch (err) {
      console.error('Erro ao alterar status:', err)
      alert('Erro ao alterar status da unidade')
    } finally {
      setModalLoading(false)
      setUnidadeToToggle(null)
    }
  }

  const handleSaveUnidade = async (data: { UnidadeNome: string; UnidadeStatus?: string }) => {
    try {
      setModalLoading(true)
      if (selectedUnidade) {
        await alterarUnidade(selectedUnidade.UnidadeId, data)
      } else {
        await cadastrarUnidade(data)
      }
      setModalOpen(false)
      await carregarUnidades()
    } catch (err: any) {
      console.error('Erro ao salvar unidade:', err)
      alert(err.response?.data?.error || 'Erro ao salvar unidade')
    } finally {
      setModalLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      ATIVA: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      INATIVA: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
      BLOQUEADA: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    }
    return styles[status as keyof typeof styles] || styles.INATIVA
  }

  // Filtrar unidades localmente enquanto o backend não tem busca
  const unidadesFiltradas = unidades.filter(u => 
    u.UnidadeNome.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Unidades
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Gerencie as unidades do sistema
          </p>
        </div>
        <button
          onClick={handleNewUnidade}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 text-white rounded-lg transition-colors"
        >
          <Plus size={18} />
          <span>Nova Unidade</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
        <div className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <form onSubmit={handleSearch} className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Buscar unidades..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent outline-none text-gray-900 dark:text-gray-100"
              />
            </form>

            {/* Filter button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Filter size={18} />
              <span>Filtros</span>
            </button>

            {/* Refresh button */}
            <button
              onClick={carregarUnidades}
              className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
              <span>Atualizar</span>
            </button>
          </div>

          {/* Filter options */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleStatusFilter('TODOS')}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    !filters.status
                      ? 'bg-gray-900 text-white dark:bg-gray-700'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => handleStatusFilter('ATIVA')}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    filters.status === 'ATIVA'
                      ? 'bg-green-600 text-white'
                      : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-800'
                  }`}
                >
                  ATIVA
                </button>
                <button
                  onClick={() => handleStatusFilter('INATIVA')}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    filters.status === 'INATIVA'
                      ? 'bg-gray-600 text-white'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  INATIVA
                </button>
                <button
                  onClick={() => handleStatusFilter('BLOQUEADA')}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    filters.status === 'BLOQUEADA'
                      ? 'bg-red-600 text-white'
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800'
                  }`}
                >
                  BLOQUEADA
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

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100"></div>
          </div>
        ) : unidadesFiltradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Building2 size={48} className="text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-400 mb-2">Nenhuma unidade encontrada</p>
            <button
              onClick={handleNewUnidade}
              className="text-gray-900 dark:text-gray-100 hover:underline flex items-center gap-1"
            >
              <Plus size={16} />
              Cadastrar primeira unidade
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Nome da Unidade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Pessoas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Gestores
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Chamados
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Tipos Suporte
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {unidadesFiltradas.map((unidade) => (
                  <tr key={unidade.UnidadeId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                      #{unidade.UnidadeId}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {unidade.UnidadeNome}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(unidade.UnidadeStatus)}`}>
                        {unidade.UnidadeStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {unidade._count?.Pessoa || 0}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {unidade._count?.Gestor || 0}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {unidade._count?.Chamado || 0}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {unidade._count?.TipoSuporteUnidade || 0}
                    </td>
                    <td className="px-6 py-4 text-sm text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewUnidade(unidade)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                          title="Visualizar"
                        >
                          <Eye size={18} className="text-gray-600 dark:text-gray-400" />
                        </button>
                        <button
                          onClick={() => handleEditUnidade(unidade)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                          title="Editar"
                        >
                          <Edit size={18} className="text-gray-600 dark:text-gray-400" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(unidade)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                          title={unidade.UnidadeStatus === 'ATIVA' ? 'Inativar' : 'Ativar'}
                        >
                          {unidade.UnidadeStatus === 'ATIVA' ? (
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

        {/* Pagination */}
        {!isLoading && unidadesFiltradas.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Mostrando {(paginacao.paginaAtual - 1) * paginacao.limitePorPagina + 1} a {Math.min(paginacao.paginaAtual * paginacao.limitePorPagina, paginacao.totalRegistros)} de {paginacao.totalRegistros} resultados
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(paginacao.paginaAtual - 1)}
                disabled={paginacao.paginaAtual === 1}
                className="px-3 py-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              {Array.from({ length: paginacao.totalPaginas }, (_, i) => i + 1).map((pagina) => (
                <button
                  key={pagina}
                  onClick={() => handlePageChange(pagina)}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    paginacao.paginaAtual === pagina
                      ? 'bg-gray-900 dark:bg-gray-700 text-white'
                      : 'bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {pagina}
                </button>
              ))}
              <button
                onClick={() => handlePageChange(paginacao.paginaAtual + 1)}
                disabled={paginacao.paginaAtual === paginacao.totalPaginas}
                className="px-3 py-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <UnidadeModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveUnidade}
        unidade={selectedUnidade}
        isLoading={modalLoading}
      />

      <ConfirmModal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={confirmToggleStatus}
        title={unidadeToToggle?.UnidadeStatus === 'ATIVA' ? 'Inativar Unidade' : 'Ativar Unidade'}
        message={`Tem certeza que deseja ${unidadeToToggle?.UnidadeStatus === 'ATIVA' ? 'inativar' : 'ativar'} a unidade "${unidadeToToggle?.UnidadeNome}"?`}
        confirmText={unidadeToToggle?.UnidadeStatus === 'ATIVA' ? 'Inativar' : 'Ativar'}
        type={unidadeToToggle?.UnidadeStatus === 'ATIVA' ? 'danger' : 'info'}
      />

      {/* View Modal */}
      {viewModalOpen && viewingUnidade && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-2xl w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Detalhes da Unidade
              </h2>
              <button
                onClick={() => setViewModalOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                <X size={20} className="text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">ID</p>
                  <p className="text-lg font-medium text-gray-900 dark:text-gray-100">#{viewingUnidade.UnidadeId}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                  <span className={`inline-block px-2 py-1 mt-1 rounded-full text-xs font-medium ${getStatusBadge(viewingUnidade.UnidadeStatus)}`}>
                    {viewingUnidade.UnidadeStatus}
                  </span>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Nome</p>
                  <p className="text-lg font-medium text-gray-900 dark:text-gray-100">{viewingUnidade.UnidadeNome}</p>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Estatísticas</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {viewingUnidade._count?.Departamento || 0}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Departamentos</p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {viewingUnidade._count?.Pessoa || 0}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Pessoas</p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {viewingUnidade._count?.TipoSuporte || 0}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Tipos Suporte</p>
                  </div>
                </div>
              </div>

              {viewingUnidade.Departamento && viewingUnidade.Departamento.length > 0 && (
                <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Departamentos</h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {viewingUnidade.Departamento.map(dept => (
                      <div key={dept.DepartamentoId} className="flex items-center justify-between py-1">
                        <span className="text-sm text-gray-900 dark:text-gray-100">{dept.DepartamentoNome}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          dept.DepartamentoStatus === 'ATIVO' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                        }`}>
                          {dept.DepartamentoStatus}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {viewingUnidade.TipoSuporte && viewingUnidade.TipoSuporte.length > 0 && (
                <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Tipos de Suporte</h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {viewingUnidade.TipoSuporte.map(tipo => (
                      <div key={tipo.TipSupId} className="flex items-center justify-between py-1">
                        <span className="text-sm text-gray-900 dark:text-gray-100">{tipo.TipSupNom}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          tipo.TipSupStatus === 'ATIVO' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                        }`}>
                          {tipo.TipSupStatus}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-800">
              <button
                onClick={() => setViewModalOpen(false)}
                className="px-4 py-2 bg-gray-900 hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}