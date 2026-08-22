"use client"

import { useState, useEffect } from "react"
import { 
  Users,
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
  Building2,
  UserPlus,
  UserMinus,
  Link as LinkIcon,
  Unlink,
  MessageSquare,
  ShieldBan
} from "lucide-react"
import { 
  listarEquipes, 
  cadastrarEquipe, 
  alterarEquipe, 
  alterarStatusEquipe,
  listarVinculosPorEquipe,
  adicionarTecnicoEquipe,
  alterarVinculo,
  removerVinculo,
  type Equipe,
  type EquipeFilters,
  type Vinculo
} from "@/lib/equipe-service"
import { listarTecnicosPorUnidade } from "@/lib/tecnico-service"
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
function EquipeModal({
  isOpen,
  onClose,
  onSave,
  equipe,
  unidadeId,
  isLoading
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (data: { EquipeNome: string; EquipeDescricao: string; EquipeStatus?: 'ATIVA' | 'INATIVA' }) => Promise<void>
  equipe?: Equipe | null
  unidadeId: number
  isLoading: boolean
}) {
  const [formData, setFormData] = useState({
    EquipeNome: "",
    EquipeDescricao: "",
    EquipeStatus: "ATIVA" as 'ATIVA' | 'INATIVA'
  })
  const [errors, setErrors] = useState<{ nome?: string; descricao?: string }>({})

  useEffect(() => {
    if (equipe) {
      setFormData({
        EquipeNome: equipe.EquipeNome,
        EquipeDescricao: equipe.EquipeDescricao,
        EquipeStatus: equipe.EquipeStatus
      })
    } else {
      setFormData({
        EquipeNome: "",
        EquipeDescricao: "",
        EquipeStatus: "ATIVA"
      })
    }
    setErrors({})
  }, [equipe, isOpen])

  const validate = () => {
    const newErrors: { nome?: string; descricao?: string } = {}
    if (!formData.EquipeNome.trim()) {
      newErrors.nome = "Nome da equipe é obrigatório"
    }
    if (!formData.EquipeDescricao.trim()) {
      newErrors.descricao = "Descrição da equipe é obrigatória"
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
            {equipe ? 'Editar Equipe' : 'Nova Equipe'}
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
              Nome da Equipe *
            </label>
            <input
              type="text"
              value={formData.EquipeNome}
              onChange={(e) => setFormData({ ...formData, EquipeNome: e.target.value })}
              className={`w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 dark:text-gray-100 ${
                errors.nome ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
              }`}
              placeholder="Digite o nome da equipe"
              disabled={isLoading}
            />
            {errors.nome && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.nome}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Descrição *
            </label>
            <textarea
              value={formData.EquipeDescricao}
              onChange={(e) => setFormData({ ...formData, EquipeDescricao: e.target.value })}
              rows={3}
              className={`w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 dark:text-gray-100 ${
                errors.descricao ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
              }`}
              placeholder="Descreva a função e responsabilidades da equipe"
              disabled={isLoading}
            />
            {errors.descricao && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.descricao}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              value={formData.EquipeStatus}
              onChange={(e) => setFormData({ 
                ...formData, 
                EquipeStatus: e.target.value as 'ATIVA' | 'INATIVA' 
              })}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 dark:text-gray-100"
              disabled={isLoading}
            >
              <option value="ATIVA">ATIVA</option>
              <option value="INATIVA">INATIVA</option>
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
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Salvando...
                </>
              ) : (
                equipe ? 'Atualizar' : 'Cadastrar'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Componente de Modal de Gerenciamento de Técnicos
function GerenciarTecnicosModal({
  isOpen,
  onClose,
  equipe,
  unidadeId,
  onUpdate
}: {
  isOpen: boolean
  onClose: () => void
  equipe: Equipe | null
  unidadeId: number
  onUpdate: () => void
}) {
  const [vinculos, setVinculos] = useState<Vinculo[]>([])
  const [tecnicosDisponiveis, setTecnicosDisponiveis] = useState<any[]>([])
  const [selectedTecnico, setSelectedTecnico] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (isOpen && equipe) {
      carregarDados()
    }
  }, [isOpen, equipe])

  const carregarDados = async () => {
    if (!equipe) return
    try {
      setIsLoading(true)
      const [vinculosData, tecnicosData] = await Promise.all([
        listarVinculosPorEquipe(equipe.EquipeId, false),
        listarTecnicosPorUnidade(unidadeId, undefined, true)
      ])
      setVinculos(vinculosData || [])
      setTecnicosDisponiveis(tecnicosData || [])
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAdicionarTecnico = async () => {
    if (!selectedTecnico || !equipe) return

    try {
      setUpdating(true)
      await adicionarTecnicoEquipe(equipe.EquipeId, selectedTecnico)
      await carregarDados()
      setSelectedTecnico("")
    } catch (error: any) {
      console.error('Erro ao adicionar técnico:', error)
      alert(error.response?.data?.error || 'Erro ao adicionar técnico')
    } finally {
      setUpdating(false)
    }
  }

  const handleAlterarStatus = async (vinculoId: string, statusAtual: string) => {
    try {
      setUpdating(true)
      const novoStatus = statusAtual === 'ATIVO' ? 'INATIVO' : 'ATIVO'
      await alterarVinculo(vinculoId, novoStatus)
      await carregarDados()
    } catch (error: any) {
      console.error('Erro ao alterar vínculo:', error)
      alert(error.response?.data?.error || 'Erro ao alterar vínculo')
    } finally {
      setUpdating(false)
    }
  }

  const handleRemoverVinculo = async (vinculoId: string) => {
    if (!confirm('Tem certeza que deseja remover este técnico da equipe?')) return

    try {
      setUpdating(true)
      await removerVinculo(vinculoId)
      await carregarDados()
    } catch (error: any) {
      console.error('Erro ao remover vínculo:', error)
      alert(error.response?.data?.error || 'Erro ao remover vínculo')
    } finally {
      setUpdating(false)
    }
  }

  const tecnicosNaoVinculados = tecnicosDisponiveis.filter(
    t => !vinculos.some(v => v.TecnicoId === t.TecnicoId)
  )

  if (!isOpen || !equipe) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Gerenciar Técnicos
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {equipe.EquipeNome}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            <X size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Adicionar técnico */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <UserPlus size={16} />
              Adicionar Técnico à Equipe
            </h3>
            <div className="flex gap-2">
              <select
                value={selectedTecnico}
                onChange={(e) => setSelectedTecnico(e.target.value)}
                className="flex-1 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm"
                disabled={isLoading || updating}
              >
                <option value="">Selecione um técnico</option>
                {tecnicosNaoVinculados.map((t) => (
                  <option key={t.TecnicoId} value={t.TecnicoId}>
                    {t.TecnicoNome} - {t.Departamento?.DepartamentoNome}
                  </option>
                ))}
              </select>
              <button
                onClick={handleAdicionarTecnico}
                disabled={!selectedTecnico || isLoading || updating}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm disabled:opacity-50 flex items-center gap-2"
              >
                <UserPlus size={16} />
                Adicionar
              </button>
            </div>
          </div>

          {/* Lista de técnicos */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <Users size={16} />
              Técnicos na Equipe
            </h3>
            
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : vinculos.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <Users size={32} className="text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Nenhum técnico vinculado a esta equipe
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {vinculos.map((vinculo) => (
                  <div
                    key={vinculo.TecEquId}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {vinculo.Tecnico?.TecnicoNome}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          vinculo.TecEquStatus === 'ATIVO'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                        }`}>
                          {vinculo.TecEquStatus}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {vinculo.Tecnico?.Departamento?.DepartamentoNome} • 
                        {vinculo.Tecnico?.TecnicoEmail && ` ${vinculo.Tecnico.TecnicoEmail}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAlterarStatus(vinculo.TecEquId, vinculo.TecEquStatus)}
                        disabled={updating}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                        title={vinculo.TecEquStatus === 'ATIVO' ? 'Inativar' : 'Ativar'}
                      >
                        {vinculo.TecEquStatus === 'ATIVO' ? (
                          <ShieldBan size={18} className="text-yellow-600" />
                        ) : (
                          <CheckCircle size={18} className="text-green-600" />
                        )}
                      </button>
                      <button
                        onClick={() => handleRemoverVinculo(vinculo.TecEquId)}
                        disabled={updating}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                        title="Remover da equipe"
                      >
                        <XCircle size={18} className="text-red-600" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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

// Componente de Modal de Visualização
function ViewModal({
  isOpen,
  onClose,
  equipe
}: {
  isOpen: boolean
  onClose: () => void
  equipe: Equipe | null
}) {
  if (!isOpen || !equipe) return null

  const getStatusBadge = (status: string) => {
    const styles = {
      ATIVA: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      INATIVA: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
    }
    return styles[status as keyof typeof styles] || styles.INATIVA
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-2xl w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Detalhes da Equipe
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
              <p className="text-lg font-medium text-gray-900 dark:text-gray-100">{equipe.EquipeNome}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
              <span className={`inline-block px-2 py-1 mt-1 rounded-full text-xs font-medium ${getStatusBadge(equipe.EquipeStatus)}`}>
                {equipe.EquipeStatus}
              </span>
            </div>
            <div className="col-span-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">Descrição</p>
              <p className="text-base text-gray-900 dark:text-gray-100">{equipe.EquipeDescricao}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Data de Cadastro</p>
              <p className="text-sm text-gray-900 dark:text-gray-100">
                {new Date(equipe.EquipeDtCadastro).toLocaleDateString('pt-BR')}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Técnicos</p>
              <p className="text-base font-bold text-gray-900 dark:text-gray-100">
                {equipe._count?.TecnicoEquipe || 0}
              </p>
            </div>
          </div>

          {/* Últimos Chamados */}
          {equipe.Chamado && equipe.Chamado.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <MessageSquare size={16} />
                Últimos Chamados
              </h3>
              <div className="space-y-2">
                {equipe.Chamado.map((chamado) => (
                  <div key={chamado.ChamadoId} className="text-sm">
                    <p className="text-gray-900 dark:text-gray-100">
                      #{chamado.ChamadoId} - {chamado.ChamadoTitulo}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      Status: {chamado.ChamadoStatus} • 
                      {new Date(chamado.ChamadoDtAbertura).toLocaleDateString('pt-BR')}
                    </p>
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

export default function EquipesPage() {
  const [equipes, setEquipes] = useState<Equipe[]>([])
  const [paginacao, setPaginacao] = useState({
    paginaAtual: 1,
    limitePorPagina: 10,
    totalRegistros: 0,
    totalPaginas: 1
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<EquipeFilters>({
    pagina: 1,
    limite: 10
  })
  const [showFilters, setShowFilters] = useState(false)
  const [selectedEquipe, setSelectedEquipe] = useState<Equipe | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalLoading, setModalLoading] = useState(false)
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [equipeToToggle, setEquipeToToggle] = useState<Equipe | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [viewingEquipe, setViewingEquipe] = useState<Equipe | null>(null)
  const [gerenciarModalOpen, setGerenciarModalOpen] = useState(false)
  const [equipeToManage, setEquipeToManage] = useState<Equipe | null>(null)

  const { user } = useGestorAuth()

  useEffect(() => {
    carregarEquipes()
  }, [filters])

  const carregarEquipes = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await listarEquipes(filters)
      setEquipes(response.data)
      setPaginacao(response.paginacao)
    } catch (err) {
      console.error('Erro ao carregar equipes:', err)
      setError('Não foi possível carregar as equipes')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFilterChange = (key: keyof EquipeFilters, value: any) => {
    setFilters({ ...filters, [key]: value, pagina: 1 })
  }

  const handlePageChange = (novaPagina: number) => {
    setFilters({ ...filters, pagina: novaPagina })
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    handleFilterChange('nome', searchTerm || undefined)
  }

  const handleNewEquipe = () => {
    setSelectedEquipe(null)
    setModalOpen(true)
  }

  const handleEditEquipe = (equipe: Equipe) => {
    setSelectedEquipe(equipe)
    setModalOpen(true)
  }

  const handleViewEquipe = (equipe: Equipe) => {
    setViewingEquipe(equipe)
    setViewModalOpen(true)
  }

  const handleManageTecnicos = (equipe: Equipe) => {
    setEquipeToManage(equipe)
    setGerenciarModalOpen(true)
  }

  const handleToggleStatus = (equipe: Equipe) => {
    setEquipeToToggle(equipe)
    setConfirmModalOpen(true)
  }

  const confirmToggleStatus = async () => {
    if (!equipeToToggle) return

    try {
      setModalLoading(true)
      const novoStatus = equipeToToggle.EquipeStatus === 'ATIVA' ? 'INATIVA' : 'ATIVA'
      await alterarStatusEquipe(equipeToToggle.EquipeId, novoStatus)
      await carregarEquipes()
    } catch (err: any) {
      console.error('Erro ao alterar status:', err)
      alert(err.response?.data?.error || 'Erro ao alterar status da equipe')
    } finally {
      setModalLoading(false)
      setEquipeToToggle(null)
    }
  }

  const handleSaveEquipe = async (data: { EquipeNome: string; EquipeDescricao: string; EquipeStatus?: 'ATIVA' | 'INATIVA' }) => {
    if (!user?.Unidade?.UnidadeId) {
      alert('Unidade não identificada')
      return
    }

    try {
      setModalLoading(true)
      if (selectedEquipe) {
        await alterarEquipe(selectedEquipe.EquipeId, data)
      } else {
        await cadastrarEquipe({
          UnidadeId: user.Unidade.UnidadeId,
          ...data
        })
      }
      setModalOpen(false)
      await carregarEquipes()
    } catch (err: any) {
      console.error('Erro ao salvar equipe:', err)
      alert(err.response?.data?.error || 'Erro ao salvar equipe')
    } finally {
      setModalLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      ATIVA: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      INATIVA: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
    }
    return styles[status as keyof typeof styles] || styles.INATIVA
  }

  // Filtrar localmente
  const equipesFiltradas = equipes.filter(e => 
    e.EquipeNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.EquipeDescricao.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Equipes
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Gerencie as equipes de atendimento
          </p>
          {user?.Unidade && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1">
              <Building2 size={12} />
              {user.Unidade.UnidadeNome}
            </p>
          )}
        </div>
        <button
          onClick={handleNewEquipe}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus size={18} />
          <span>Nova Equipe</span>
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
                placeholder="Buscar por nome ou descrição..."
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
              onClick={carregarEquipes}
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
                  onClick={() => handleFilterChange('status', undefined)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    !filters.status
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => handleFilterChange('status', 'ATIVA')}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    filters.status === 'ATIVA'
                      ? 'bg-green-600 text-white'
                      : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-800'
                  }`}
                >
                  ATIVA
                </button>
                <button
                  onClick={() => handleFilterChange('status', 'INATIVA')}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    filters.status === 'INATIVA'
                      ? 'bg-gray-600 text-white'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  INATIVA
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
        ) : equipesFiltradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Users size={48} className="text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-400 mb-2">Nenhuma equipe encontrada</p>
            <button
              onClick={handleNewEquipe}
              className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <Plus size={16} />
              Cadastrar primeira equipe
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
                    Descrição
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Técnicos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Chamados
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {equipesFiltradas.map((equipe) => (
                  <tr key={equipe.EquipeId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {equipe.EquipeNome}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
                      {equipe.EquipeDescricao}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(equipe.EquipeStatus)}`}>
                        {equipe.EquipeStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Users size={14} />
                        {equipe._count?.TecnicoEquipe || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <MessageSquare size={14} />
                        {equipe._count?.Chamado || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewEquipe(equipe)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                          title="Visualizar"
                        >
                          <Eye size={18} className="text-gray-600 dark:text-gray-400" />
                        </button>
                        <button
                          onClick={() => handleManageTecnicos(equipe)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                          title="Gerenciar Técnicos"
                        >
                          <Users size={18} className="text-gray-600 dark:text-gray-400" />
                        </button>
                        <button
                          onClick={() => handleEditEquipe(equipe)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                          title="Editar"
                        >
                          <Edit size={18} className="text-gray-600 dark:text-gray-400" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(equipe)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                          title={equipe.EquipeStatus === 'ATIVA' ? 'Inativar' : 'Ativar'}
                        >
                          {equipe.EquipeStatus === 'ATIVA' ? (
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
        {!isLoading && equipesFiltradas.length > 0 && (
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
      <EquipeModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveEquipe}
        equipe={selectedEquipe}
        unidadeId={user?.Unidade?.UnidadeId || 0}
        isLoading={modalLoading}
      />

      <ConfirmModal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={confirmToggleStatus}
        title={equipeToToggle?.EquipeStatus === 'ATIVA' ? 'Inativar Equipe' : 'Ativar Equipe'}
        message={`Tem certeza que deseja ${equipeToToggle?.EquipeStatus === 'ATIVA' ? 'inativar' : 'ativar'} a equipe "${equipeToToggle?.EquipeNome}"? ${equipeToToggle?.EquipeStatus === 'ATIVA' ? '\nEsta ação desativará todos os vinculos existentes entre um técnico e essa equipe, sendo necessário reativar um a um caso a equipe seja reativada.' : ''}`}
        confirmText={equipeToToggle?.EquipeStatus === 'ATIVA' ? 'Inativar' : 'Ativar'}
        type={equipeToToggle?.EquipeStatus === 'ATIVA' ? 'danger' : 'info'}
      />

      <ViewModal
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        equipe={viewingEquipe}
      />

      <GerenciarTecnicosModal
        isOpen={gerenciarModalOpen}
        onClose={() => {
          setGerenciarModalOpen(false)
          setEquipeToManage(null)
          carregarEquipes() // Recarregar para atualizar contadores
        }}
        equipe={equipeToManage}
        unidadeId={user?.Unidade?.UnidadeId || 0}
        onUpdate={carregarEquipes}
      />
    </div>
  )
}