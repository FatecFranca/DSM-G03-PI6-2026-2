"use client"

import { useState, useEffect } from "react"
import {
  ClipboardList,
  Search,
  Plus,
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
  Clock,
  User,
  Mail,
  Phone,
  Calendar,
  Tag,
  MessageSquare,
  Activity,
  Trash2,
  Edit,
  Send
} from "lucide-react"
import { useGestorAuth } from "@/app/contexts/GestorAuthContext"
import {
  listarSolicitacoes,
  buscarSolicitacaoPorId,
  alterarStatusSolicitacao,
  TIPOS_SOLICITACAO_LIST,
  TIPOS_SOLICITACAO_DISPLAY,
  STATUS_SOLICITACAO_LIST,
  STATUS_SOLICITACAO_DISPLAY,
  STATUS_SOLICITACAO_COLORS,
  type Solicitacao,
  type SolicitacaoFilters
} from "@/lib/solicitacao-service"
import {
  adicionarAtividade,
  listarAtividadesPorSolicitacao,
  alterarAtividade,
  excluirAtividade,
  type AtividadeSolicitacao
} from "@/lib/atividade-solicitacao-service"
import { formatarDataBrasil } from '@/utils/dateUtils'

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

// Modal para Adicionar/Editar Atividade
function AtividadeModal({
  isOpen,
  onClose,
  onSave,
  solicitacaoId,
  atividade,
  isLoading
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (descricao: string) => Promise<void>
  solicitacaoId: string
  atividade?: AtividadeSolicitacao | null
  isLoading: boolean
}) {
  const [descricao, setDescricao] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    if (atividade) {
      setDescricao(atividade.AtividadeSolicitacaoDescricao)
    } else {
      setDescricao("")
    }
    setError("")
  }, [atividade, isOpen])

  if (!isOpen) return null

  const handleSubmit = async () => {
    if (!descricao.trim()) {
      setError("A descrição da atividade é obrigatória")
      return
    }
    await onSave(descricao.trim())
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-lg w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {atividade ? 'Editar Atividade' : 'Nova Atividade'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            <X size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Descrição *
            </label>
            <textarea
              value={descricao}
              onChange={(e) => {
                setDescricao(e.target.value)
                setError("")
              }}
              rows={4}
              className={`w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 dark:text-gray-100 ${error ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
                }`}
              placeholder="Descreva a atividade realizada..."
              disabled={isLoading}
            />
            {error && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
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
              type="button"
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Salvando...
                </>
              ) : (
                atividade ? 'Atualizar' : 'Adicionar'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Componente de Modal de Visualização (com atividades)
function ViewModal({
  isOpen,
  onClose,
  solicitacao,
  onAddAtividade,
  onEditAtividade,
  onDeleteAtividade
}: {
  isOpen: boolean
  onClose: () => void
  solicitacao: Solicitacao | null
  onAddAtividade: (solicitacaoId: string) => void
  onEditAtividade: (atividade: AtividadeSolicitacao) => void
  onDeleteAtividade: (atividadeId: string) => void
}) {
  const [atividades, setAtividades] = useState<AtividadeSolicitacao[]>([])
  const [isLoadingAtividades, setIsLoadingAtividades] = useState(false)
  const [showAllAtividades, setShowAllAtividades] = useState(false)

  useEffect(() => {
    if (isOpen && solicitacao) {
      carregarAtividades()
    }
  }, [isOpen, solicitacao])

  const carregarAtividades = async () => {
    if (!solicitacao) return
    try {
      setIsLoadingAtividades(true)
      const data = await listarAtividadesPorSolicitacao(solicitacao.SolicitacaoId, 50, 1)
      setAtividades(data)
    } catch (error) {
      console.error('Erro ao carregar atividades:', error)
    } finally {
      setIsLoadingAtividades(false)
    }
  }

  if (!isOpen || !solicitacao) return null

  const getStatusBadge = (status: string) => {
    const styles = {
      PENDENTE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      EMATENDIMENTO: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      CONCLUIDO: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      RECUSADO: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      CANCELADO: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
    }
    return styles[status as keyof typeof styles] || styles.PENDENTE
  }

  const getTipoDisplay = (tipo: string) => {
    const tipos: Record<string, string> = {
      'CADASTROPESSOAUNIDADE': 'Cadastro em Unidade',
      'DIVERSAS': 'Solicitação Diversa'
    }
    return tipos[tipo] || tipo
  }

  const displayedAtividades = showAllAtividades ? atividades : atividades.slice(0, 5)

  const podeAdicionarAtividade = solicitacao.SolicitacaoStatus !== 'CONCLUIDO' &&
    solicitacao.SolicitacaoStatus !== 'RECUSADO' &&
    solicitacao.SolicitacaoStatus !== 'CANCELADO'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Detalhes da Solicitação
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
              <p className="text-sm text-gray-500 dark:text-gray-400">Tipo</p>
              <p className="text-base font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Tag size={16} />
                {getTipoDisplay(solicitacao.SolicitacaoTipo)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
              <span className={`inline-block px-2 py-1 mt-1 rounded-full text-xs font-medium ${getStatusBadge(solicitacao.SolicitacaoStatus)}`}>
                {solicitacao.SolicitacaoStatus}
              </span>
            </div>
            {solicitacao.Unidade && (
              <div className="col-span-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">Unidade</p>
                <p className="text-base text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Building2 size={16} />
                  {solicitacao.Unidade.UnidadeNome}
                </p>
              </div>
            )}
            {solicitacao.SolicitacaoSolicitanteNome && (
              <div className="col-span-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">Solicitante</p>
                <p className="text-base text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <User size={16} />
                  {solicitacao.SolicitacaoSolicitanteNome}
                </p>
              </div>
            )}
            {solicitacao.SolicitacaoSolicitanteEmail && (
              <div className="col-span-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">E-mail</p>
                <p className="text-base text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Mail size={16} />
                  {solicitacao.SolicitacaoSolicitanteEmail}
                </p>
              </div>
            )}
            {solicitacao.SolicitacaoSolicitanteTelefone && (
              <div className="col-span-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">Telefone</p>
                <p className="text-base text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Phone size={16} />
                  {solicitacao.SolicitacaoSolicitanteTelefone}
                </p>
              </div>
            )}
            <div className="col-span-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">Descrição</p>
              <p className="text-base text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                {solicitacao.SolicitacaoDescricao}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Data de Abertura</p>
              <p className="text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Calendar size={14} />
                {new Date(solicitacao.SolicitacaoDtCadastro).toLocaleDateString('pt-BR')}
              </p>
            </div>
            {solicitacao.SolicitacaoUsuarioFinalizou && (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Finalizado por</p>
                <p className="text-sm text-gray-900 dark:text-gray-100">
                  {solicitacao.SolicitacaoUsuarioFinalizou}
                </p>
              </div>
            )}
          </div>

          {/* ATIVIDADES */}
          <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Activity size={16} />
                Atividades ({atividades.length})
              </h3>
              {podeAdicionarAtividade && (
                <button
                  onClick={() => onAddAtividade(solicitacao.SolicitacaoId)}
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                >
                  <Plus size={16} />
                  Nova Atividade
                </button>
              )}
            </div>

            {isLoadingAtividades ? (
              <div className="flex justify-center py-4">
                <RefreshCw size={24} className="animate-spin text-gray-400" />
              </div>
            ) : atividades.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                Nenhuma atividade registrada
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {displayedAtividades.map((atividade: AtividadeSolicitacao) => (
                  <div
                    key={atividade.AtividadeSolicitacaoId}
                    className="flex items-start justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg group"
                  >
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 dark:text-gray-100">
                        {atividade.AtividadeSolicitacaoDescricao}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-1">
                        <Clock size={12} />
                        {formatarDataBrasil(atividade.AtividadeSolicitacaoDtRealizacao)}
                        <span className="text-gray-300 dark:text-gray-600">•</span>
                        <User size={12} />
                        {atividade.AtividadeSolicitacaoUsuario}
                      </p>
                    </div>
                    {podeAdicionarAtividade && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* ✅ Editar Atividade - usando a variável 'atividade' do map */}
                        <button
                          onClick={() => onEditAtividade(atividade)}
                          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                          title="Editar"
                        >
                          <Edit size={14} className="text-gray-500 dark:text-gray-400" />
                        </button>
                        {/* ✅ Excluir Atividade */}
                        <button
                          onClick={() => onDeleteAtividade(atividade.AtividadeSolicitacaoId)}
                          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                          title="Excluir"
                        >
                          <Trash2 size={14} className="text-red-500" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {atividades.length > 5 && (
                  <button
                    onClick={() => setShowAllAtividades(!showAllAtividades)}
                    className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    {showAllAtividades ? 'Ver menos' : `Ver mais ${atividades.length - 5} atividades`}
                  </button>
                )}
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

// Componente de Modal para Alterar Status
function StatusModal({
  isOpen,
  onClose,
  onSave,
  solicitacao,
  isLoading
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (status: 'PENDENTE' | 'EMATENDIMENTO' | 'CONCLUIDO' | 'RECUSADO' | 'CANCELADO' | 'FALTAINFORMACAO') => Promise<void>
  solicitacao: Solicitacao | null
  isLoading: boolean
}) {
  const [selectedStatus, setSelectedStatus] = useState<'PENDENTE' | 'EMATENDIMENTO' | 'CONCLUIDO' | 'RECUSADO' | 'CANCELADO' | 'FALTAINFORMACAO'>('PENDENTE')
  const [error, setError] = useState<string>("")

  useEffect(() => {
    if (solicitacao) {
      setSelectedStatus(solicitacao.SolicitacaoStatus)
      setError("")
    }
  }, [solicitacao])

  if (!isOpen || !solicitacao) return null

  const getStatusOptions = (currentStatus: string) => {
    if (currentStatus === 'PENDENTE') {
      return ['PENDENTE', 'EMATENDIMENTO', 'RECUSADO', 'FALTAINFORMACAO'] as const
    }
    if (currentStatus === 'EMATENDIMENTO') {
      return ['EMATENDIMENTO', 'CONCLUIDO', 'PENDENTE', 'RECUSADO', 'FALTAINFORMACAO'] as const
    }
    return [currentStatus] as const
  }

  const options = getStatusOptions(solicitacao.SolicitacaoStatus)
  const canChange = options.length > 1

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'PENDENTE': 'Pendente',
      'EMATENDIMENTO': 'Em Andamento',
      'CONCLUIDO': 'Concluído',
      'RECUSADO': 'Recusado',
      'CANCELADO': 'Cancelado',
      'FALTAINFORMACAO': 'Falta Informação'
    }
    return labels[status] || status
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'PENDENTE': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'EMATENDIMENTO': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'CONCLUIDO': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'RECUSADO': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      'CANCELADO': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
    }
    return colors[status] || colors.PENDENTE
  }

  const handleSubmit = async () => {
    if (!selectedStatus) {
      setError('Selecione um status')
      return
    }
    if (selectedStatus === solicitacao.SolicitacaoStatus) {
      setError('Selecione um status diferente do atual')
      return
    }
    await onSave(selectedStatus)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Alterar Status
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            <X size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Status Atual</p>
            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(solicitacao.SolicitacaoStatus)}`}>
              {getStatusLabel(solicitacao.SolicitacaoStatus)}
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Novo Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value as 'PENDENTE' | 'EMATENDIMENTO' | 'CONCLUIDO' | 'RECUSADO' | 'CANCELADO' | 'FALTAINFORMACAO' | 'CANCELADO')
                setError("")
              }}
              disabled={!canChange || isLoading}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 dark:text-gray-100 disabled:opacity-50"
            >
              {options.map((status) => (
                <option key={status} value={status}>
                  {getStatusLabel(status)}
                </option>
              ))}
            </select>
            {!canChange && (
              <p className="mt-1 text-sm text-yellow-600 dark:text-yellow-400">
                ⚠️ Esta solicitação não pode mais ter o status alterado
              </p>
            )}
            {error && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
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
              type="button"
              onClick={handleSubmit}
              disabled={!canChange || isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Salvando...
                </>
              ) : (
                'Atualizar Status'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SolicitacoesPage() {
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([])
  const [paginacao, setPaginacao] = useState({
    paginaAtual: 1,
    limitePorPagina: 10,
    totalRegistros: 0,
    totalPaginas: 1
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<SolicitacaoFilters>({
    pagina: 1,
    limite: 10,
    tipo: 'CADASTROPESSOAUNIDADE'
  })
  const [showFilters, setShowFilters] = useState(false)
  const [selectedSolicitacao, setSelectedSolicitacao] = useState<Solicitacao | null>(null)
  const [statusModalOpen, setStatusModalOpen] = useState(false)
  const [modalLoading, setModalLoading] = useState(false)
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [viewingSolicitacao, setViewingSolicitacao] = useState<Solicitacao | null>(null)
  const [atividadeModalOpen, setAtividadeModalOpen] = useState(false)
  const [selectedAtividade, setSelectedAtividade] = useState<AtividadeSolicitacao | null>(null)
  const [currentSolicitacaoId, setCurrentSolicitacaoId] = useState<string>("")

  const { user } = useGestorAuth()

  const statusOptions = ['TODOS', 'PENDENTE', 'EMATENDIMENTO', 'CONCLUIDO', 'RECUSADO', 'CANCELADO']
  const tipoOptions = ['CADASTROPESSOAUNIDADE', 'DIVERSAS']

  const tipoDisplayNames: Record<string, string> = {
    'CADASTROPESSOAUNIDADE': 'Cadastro em Unidade',
    'DIVERSAS': 'Solicitação Diversa'
  }

  useEffect(() => {
    carregarSolicitacoes()
  }, [filters])

  const carregarSolicitacoes = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await listarSolicitacoes(filters)
      setSolicitacoes(response.data)
      setPaginacao(response.paginacao)
    } catch (err: any) {
      console.error('Erro ao carregar solicitações:', err)
      setError(err.message || 'Não foi possível carregar as solicitações')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFilterChange = (key: keyof SolicitacaoFilters, value: any) => {
    const newFilters = { ...filters, [key]: value, pagina: 1 }
    if (key === 'tipo' && (!value || value === 'TODOS')) {
      newFilters.tipo = 'CADASTROPESSOAUNIDADE'
    }
    setFilters(newFilters)
  }

  const handlePageChange = (novaPagina: number) => {
    setFilters({ ...filters, pagina: novaPagina })
  }

  // =============================================
  // FUNÇÕES DE ATIVIDADES
  // =============================================

  const handleAddAtividade = (solicitacaoId: string) => {
    setCurrentSolicitacaoId(solicitacaoId)
    setSelectedAtividade(null)
    setAtividadeModalOpen(true)
  }

  const handleEditAtividade = (atividade: AtividadeSolicitacao) => {
    setCurrentSolicitacaoId(atividade.SolicitacaoId)
    setSelectedAtividade(atividade)
    setAtividadeModalOpen(true)
  }

  const handleSaveAtividade = async (descricao: string) => {
    try {
      setModalLoading(true)
      if (selectedAtividade) {
        await alterarAtividade(selectedAtividade.AtividadeSolicitacaoId, descricao)
      } else {
        await adicionarAtividade(currentSolicitacaoId, descricao)
      }
      setAtividadeModalOpen(false)
      setSelectedAtividade(null)
      // Recarregar a solicitação em visualização
      if (viewingSolicitacao) {
        const atualizada = await buscarSolicitacaoPorId(viewingSolicitacao.SolicitacaoId)
        setViewingSolicitacao(atualizada)
      }
    } catch (err: any) {
      console.error('Erro ao salvar atividade:', err)
      alert(err.message || 'Erro ao salvar atividade')
    } finally {
      setModalLoading(false)
    }
  }

  const handleDeleteAtividade = async (atividadeId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta atividade?')) return

    try {
      setModalLoading(true)
      await excluirAtividade(atividadeId)
      // Recarregar a solicitação em visualização
      if (viewingSolicitacao) {
        const atualizada = await buscarSolicitacaoPorId(viewingSolicitacao.SolicitacaoId)
        setViewingSolicitacao(atualizada)
      }
    } catch (err: any) {
      console.error('Erro ao excluir atividade:', err)
      alert(err.message || 'Erro ao excluir atividade')
    } finally {
      setModalLoading(false)
    }
  }

  // =============================================
  // FUNÇÕES DE SOLICITAÇÃO
  // =============================================

  const handleViewSolicitacao = async (solicitacao: Solicitacao) => {
    try {
      setModalLoading(true)
      const detalhada = await buscarSolicitacaoPorId(solicitacao.SolicitacaoId)
      setViewingSolicitacao(detalhada)
      setViewModalOpen(true)
    } catch (err: any) {
      console.error('Erro ao buscar detalhes:', err)
      alert(err.message || 'Erro ao carregar detalhes')
    } finally {
      setModalLoading(false)
    }
  }

  const handleOpenStatusModal = (solicitacao: Solicitacao) => {
    setSelectedSolicitacao(solicitacao)
    setStatusModalOpen(true)
  }

  const handleSaveStatus = async (status: 'PENDENTE' | 'EMATENDIMENTO' | 'CONCLUIDO' | 'RECUSADO' | 'CANCELADO' | 'FALTAINFORMACAO') => {
    if (!selectedSolicitacao) return

    try {
      setModalLoading(true)
      await alterarStatusSolicitacao(selectedSolicitacao.SolicitacaoId, status)
      setStatusModalOpen(false)
      await carregarSolicitacoes()
    } catch (err: any) {
      console.error('Erro ao alterar status:', err)
      alert(err.message || 'Erro ao alterar status da solicitação')
    } finally {
      setModalLoading(false)
    }
  }

  // ... funções getStatusBadge, getStatusLabel, getTipoDisplay, podeAlterarStatus (mantidas iguais)

  const getStatusBadge = (status: string) => {
    const styles = {
      PENDENTE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      EMATENDIMENTO: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      CONCLUIDO: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      RECUSADO: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      CANCELADO: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
    }
    return styles[status as keyof typeof styles] || styles.PENDENTE
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'PENDENTE': 'Pendente',
      'EMATENDIMENTO': 'Em Atendimento',
      'CONCLUIDO': 'Concluído',
      'RECUSADO': 'Recusado',
      'CANCELADO': 'Cancelado'
    }
    return labels[status] || status
  }

  const getTipoDisplay = (tipo: string) => {
    return tipoDisplayNames[tipo] || tipo
  }

  const podeAlterarStatus = (status: string) => {
    return status === 'PENDENTE' || status === 'EMATENDIMENTO'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Solicitações
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Gerencie as solicitações da unidade
          </p>
          {user?.Unidade && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1">
              <Building2 size={12} />
              {user.Unidade.UnidadeNome}
            </p>
          )}
        </div>
      </div>

      {/* Filtros (mantido igual) */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
        <div className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Filter size={18} />
              <span>Filtros</span>
            </button>
            <button
              onClick={carregarSolicitacoes}
              className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
              <span>Atualizar</span>
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
                  <div className="flex flex-wrap gap-2">
                    {statusOptions.map((status) => (
                      <button
                        key={status}
                        onClick={() => handleFilterChange('status', status)}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${filters.status === status || (status === 'TODOS' && !filters.status)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                          }`}
                      >
                        {status === 'TODOS' ? 'Todos' : getStatusLabel(status)}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tipo</label>
                  <div className="flex flex-wrap gap-2">
                    {tipoOptions.map((tipo) => (
                      <button
                        key={tipo}
                        onClick={() => handleFilterChange('tipo', tipo)}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${filters.tipo === tipo
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                          }`}
                      >
                        {getTipoDisplay(tipo)}
                      </button>
                    ))}
                  </div>
                </div>
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
        ) : solicitacoes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <ClipboardList size={48} className="text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-400 mb-2">Nenhuma solicitação encontrada</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Solicitante</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Unidade</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {solicitacoes.map((solicitacao) => (
                  <tr key={solicitacao.SolicitacaoId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                      <span className="flex items-center gap-2">
                        <Tag size={14} className="text-gray-400" />
                        {getTipoDisplay(solicitacao.SolicitacaoTipo)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(solicitacao.SolicitacaoStatus)}`}>
                        {getStatusLabel(solicitacao.SolicitacaoStatus)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {solicitacao.SolicitacaoSolicitanteNome || solicitacao.SolicitacaoIdRelacional?.substring(0, 8) || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {solicitacao.Unidade?.UnidadeNome || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewSolicitacao(solicitacao)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                          title="Visualizar"
                        >
                          <Eye size={18} className="text-gray-600 dark:text-gray-400" />
                        </button>
                        {podeAlterarStatus(solicitacao.SolicitacaoStatus) && (
                          <button
                            onClick={() => handleOpenStatusModal(solicitacao)}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                            title="Alterar Status"
                          >
                            <RefreshCw size={18} className="text-blue-600 dark:text-blue-400" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && solicitacoes.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between flex-wrap gap-3">
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
              <span className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm">{paginacao.paginaAtual}</span>
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
      <ViewModal
        isOpen={viewModalOpen}
        onClose={() => {
          setViewModalOpen(false)
          setViewingSolicitacao(null)
        }}
        solicitacao={viewingSolicitacao}
        onAddAtividade={handleAddAtividade}
        onEditAtividade={handleEditAtividade}
        onDeleteAtividade={handleDeleteAtividade}
      />

      <StatusModal
        isOpen={statusModalOpen}
        onClose={() => {
          setStatusModalOpen(false)
          setSelectedSolicitacao(null)
        }}
        onSave={handleSaveStatus}
        solicitacao={selectedSolicitacao}
        isLoading={modalLoading}
      />

      <AtividadeModal
        isOpen={atividadeModalOpen}
        onClose={() => {
          setAtividadeModalOpen(false)
          setSelectedAtividade(null)
          setCurrentSolicitacaoId("")
        }}
        onSave={handleSaveAtividade}
        solicitacaoId={currentSolicitacaoId}
        atividade={selectedAtividade}
        isLoading={modalLoading}
      />
    </div>
  )
}