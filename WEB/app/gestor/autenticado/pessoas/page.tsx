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
  Mail,
  Phone,
  User,
  Key,
  Calendar,
  MessageSquare
} from "lucide-react"
import { 
  listarPessoas, 
  cadastrarPessoa, 
  alterarPessoa, 
  alterarStatusPessoa,
  type Pessoa,
  type PessoaFilters
} from "@/lib/pessoa-service"
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
function PessoaModal({
  isOpen,
  onClose,
  onSave,
  pessoa,
  unidadeId,
  isLoading
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (data: any) => Promise<void>
  pessoa?: Pessoa | null
  unidadeId: number
  isLoading: boolean
}) {
  const [formData, setFormData] = useState({
    PessoaNome: "",
    PessoaEmail: "",
    PessoaTelefone: "",
    PessoaCPF: "",
    PessoaSenha: "",
    PessoaStatus: "ATIVA" as 'ATIVA' | 'INATIVA' | 'BLOQUEADA'
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (pessoa) {
      setFormData({
        PessoaNome: pessoa.PessoaNome,
        PessoaEmail: pessoa.PessoaEmail || "",
        PessoaTelefone: pessoa.PessoaTelefone || "",
        PessoaCPF: pessoa.PessoaCPF,
        PessoaSenha: "",
        PessoaStatus: pessoa.PessoaStatus
      })
    } else {
      setFormData({
        PessoaNome: "",
        PessoaEmail: "",
        PessoaTelefone: "",
        PessoaCPF: "",
        PessoaSenha: "",
        PessoaStatus: "ATIVA"
      })
    }
    setErrors({})
  }, [pessoa])

  const validate = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.PessoaNome.trim()) {
      newErrors.PessoaNome = "Nome é obrigatório"
    }
    
    if (!formData.PessoaCPF.trim()) {
      newErrors.PessoaCPF = "CPF é obrigatório"
    } else if (formData.PessoaCPF.replace(/\D/g, '').length !== 11) {
      newErrors.PessoaCPF = "CPF inválido"
    }
    
    if (!pessoa && !formData.PessoaSenha.trim()) {
      newErrors.PessoaSenha = "Senha é obrigatória"
    } else if (formData.PessoaSenha && formData.PessoaSenha.length < 6) {
      newErrors.PessoaSenha = "Senha deve ter no mínimo 6 caracteres"
    }
    
    if (formData.PessoaEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.PessoaEmail)) {
      newErrors.PessoaEmail = "E-mail inválido"
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    const dataToSend: any = {
      UnidadeId: unidadeId,
      PessoaNome: formData.PessoaNome.trim(),
      PessoaCPF: formData.PessoaCPF.replace(/\D/g, ''),
      PessoaStatus: formData.PessoaStatus
    }

    if (formData.PessoaEmail) dataToSend.PessoaEmail = formData.PessoaEmail.trim()
    if (formData.PessoaTelefone) dataToSend.PessoaTelefone = formData.PessoaTelefone.trim()
    if (formData.PessoaSenha) dataToSend.PessoaSenha = formData.PessoaSenha

    await onSave(dataToSend)
  }

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length === 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
    }
    return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-2xl w-full mx-4 my-8">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {pessoa ? 'Editar Pessoa' : 'Nova Pessoa'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            <X size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nome */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nome Completo *
              </label>
              <input
                type="text"
                value={formData.PessoaNome}
                onChange={(e) => setFormData({ ...formData, PessoaNome: e.target.value })}
                className={`w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 dark:text-gray-100 ${
                  errors.PessoaNome ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
                }`}
                placeholder="Digite o nome completo"
                disabled={isLoading}
              />
              {errors.PessoaNome && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.PessoaNome}</p>
              )}
            </div>

            {/* CPF */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                CPF *
              </label>
              <input
                type="text"
                value={formatCPF(formData.PessoaCPF)}
                onChange={(e) => setFormData({ ...formData, PessoaCPF: e.target.value.replace(/\D/g, '') })}
                maxLength={14}
                className={`w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 dark:text-gray-100 ${
                  errors.PessoaCPF ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
                }`}
                placeholder="000.000.000-00"
                disabled={isLoading}
              />
              {errors.PessoaCPF && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.PessoaCPF}</p>
              )}
            </div>

            {/* Telefone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Telefone
              </label>
              <input
                type="text"
                value={formatPhone(formData.PessoaTelefone)}
                onChange={(e) => setFormData({ ...formData, PessoaTelefone: e.target.value.replace(/\D/g, '') })}
                maxLength={15}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 dark:text-gray-100"
                placeholder="(00) 00000-0000"
                disabled={isLoading}
              />
            </div>

            {/* E-mail */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                E-mail
              </label>
              <input
                type="email"
                value={formData.PessoaEmail}
                onChange={(e) => setFormData({ ...formData, PessoaEmail: e.target.value })}
                className={`w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 dark:text-gray-100 ${
                  errors.PessoaEmail ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
                }`}
                placeholder="email@exemplo.com"
                disabled={isLoading}
              />
              {errors.PessoaEmail && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.PessoaEmail}</p>
              )}
            </div>

            {/* Senha */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {pessoa ? 'Nova Senha (opcional)' : 'Senha *'}
              </label>
              <input
                type="password"
                value={formData.PessoaSenha}
                onChange={(e) => setFormData({ ...formData, PessoaSenha: e.target.value })}
                className={`w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 dark:text-gray-100 ${
                  errors.PessoaSenha ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
                }`}
                placeholder={pessoa ? "Deixe em branco para manter" : "Mínimo 6 caracteres"}
                disabled={isLoading}
              />
              {errors.PessoaSenha && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.PessoaSenha}</p>
              )}
            </div>

            {/* Status */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                value={formData.PessoaStatus}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  PessoaStatus: e.target.value as 'ATIVA' | 'INATIVA' | 'BLOQUEADA' 
                })}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 dark:text-gray-100"
                disabled={isLoading}
              >
                <option value="ATIVA">ATIVA</option>
                <option value="INATIVA">INATIVA</option>
                <option value="BLOQUEADA">BLOQUEADA</option>
              </select>
            </div>
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
                pessoa ? 'Atualizar' : 'Cadastrar'
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
  pessoa
}: {
  isOpen: boolean
  onClose: () => void
  pessoa: Pessoa | null
}) {
  if (!isOpen || !pessoa) return null

  const getStatusBadge = (status: string) => {
    const styles = {
      ATIVA: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      INATIVA: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
      BLOQUEADA: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    }
    return styles[status as keyof typeof styles] || styles.INATIVA
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-2xl w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Detalhes da Pessoa
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
              <p className="text-lg font-medium text-gray-900 dark:text-gray-100">{pessoa.PessoaNome}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
              <span className={`inline-block px-2 py-1 mt-1 rounded-full text-xs font-medium ${getStatusBadge(pessoa.PessoaStatus)}`}>
                {pessoa.PessoaStatus}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">CPF</p>
              <p className="text-base text-gray-900 dark:text-gray-100">{pessoa.PessoaCPF}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Data Cadastro</p>
              <p className="text-sm text-gray-900 dark:text-gray-100">
                {new Date(pessoa.PessoadtCadastro).toLocaleDateString('pt-BR')}
              </p>
            </div>
            {pessoa.PessoaEmail && (
              <div className="col-span-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">E-mail</p>
                <p className="text-base text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Mail size={16} />
                  {pessoa.PessoaEmail}
                </p>
              </div>
            )}
            {pessoa.PessoaTelefone && (
              <div className="col-span-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">Telefone</p>
                <p className="text-base text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Phone size={16} />
                  {pessoa.PessoaTelefone}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total de Chamados</p>
              <p className="text-base font-bold text-gray-900 dark:text-gray-100">
                {pessoa._count?.Chamado || 0}
              </p>
            </div>
          </div>

          {/* Últimos Chamados */}
          {pessoa.Chamado && pessoa.Chamado.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <MessageSquare size={16} />
                Últimos Chamados
              </h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {pessoa.Chamado.map((chamado) => (
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

export default function PessoasPage() {
  const [pessoas, setPessoas] = useState<Pessoa[]>([])
  const [paginacao, setPaginacao] = useState({
    paginaAtual: 1,
    limitePorPagina: 10,
    totalRegistros: 0,
    totalPaginas: 1
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<PessoaFilters>({
    pagina: 1,
    limite: 10
  })
  const [showFilters, setShowFilters] = useState(false)
  const [selectedPessoa, setSelectedPessoa] = useState<Pessoa | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalLoading, setModalLoading] = useState(false)
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [pessoaToToggle, setPessoaToToggle] = useState<Pessoa | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [viewingPessoa, setViewingPessoa] = useState<Pessoa | null>(null)

  const { user } = useGestorAuth()

  useEffect(() => {
    carregarPessoas()
  }, [filters])

  const carregarPessoas = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await listarPessoas(filters)
      setPessoas(response.data)
      setPaginacao(response.paginacao)
    } catch (err) {
      console.error('Erro ao carregar pessoas:', err)
      setError('Não foi possível carregar as pessoas')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFilterChange = (key: keyof PessoaFilters, value: any) => {
    setFilters({ ...filters, [key]: value, pagina: 1 })
  }

  const handlePageChange = (novaPagina: number) => {
    setFilters({ ...filters, pagina: novaPagina })
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    handleFilterChange('nome', searchTerm || undefined)
  }

  const handleNewPessoa = () => {
    setSelectedPessoa(null)
    setModalOpen(true)
  }

  const handleEditPessoa = (pessoa: Pessoa) => {
    setSelectedPessoa(pessoa)
    setModalOpen(true)
  }

  const handleViewPessoa = (pessoa: Pessoa) => {
    setViewingPessoa(pessoa)
    setViewModalOpen(true)
  }

  const handleToggleStatus = (pessoa: Pessoa) => {
    setPessoaToToggle(pessoa)
    setConfirmModalOpen(true)
  }

  const confirmToggleStatus = async () => {
    if (!pessoaToToggle) return

    try {
      setModalLoading(true)
      const novoStatus = pessoaToToggle.PessoaStatus === 'ATIVA' ? 'INATIVA' : 'ATIVA'
      await alterarStatusPessoa(pessoaToToggle.PessoaId, novoStatus)
      await carregarPessoas()
    } catch (err: any) {
      console.error('Erro ao alterar status:', err)
      alert(err.response?.data?.error || 'Erro ao alterar status da pessoa')
    } finally {
      setModalLoading(false)
      setPessoaToToggle(null)
    }
  }

  const handleSavePessoa = async (data: any) => {
    if (!user?.Unidade?.UnidadeId) {
      alert('Unidade não identificada')
      return
    }

    try {
      setModalLoading(true)
      if (selectedPessoa) {
        await alterarPessoa(selectedPessoa.PessoaId, data)
      } else {
        await cadastrarPessoa(data)
      }
      setModalOpen(false)
      await carregarPessoas()
    } catch (err: any) {
      console.error('Erro ao salvar pessoa:', err)
      alert(err.response?.data?.error || 'Erro ao salvar pessoa')
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

  // Filtrar localmente
  const pessoasFiltradas = pessoas.filter(p => 
    p.PessoaNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.PessoaEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.PessoaCPF.includes(searchTerm)
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Pessoas
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Gerencie as pessoas cadastradas na unidade
          </p>
          {user?.Unidade && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1">
              <Building2 size={12} />
              {user.Unidade.UnidadeNome}
            </p>
          )}
        </div>
        <button
          onClick={handleNewPessoa}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus size={18} />
          <span>Nova Pessoa</span>
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
                placeholder="Buscar por nome, e-mail ou CPF..."
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
              onClick={carregarPessoas}
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
                <button
                  onClick={() => handleFilterChange('status', 'BLOQUEADA')}
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

      {/* Tabela */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : pessoasFiltradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Users size={48} className="text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-400 mb-2">Nenhuma pessoa encontrada</p>
            <button
              onClick={handleNewPessoa}
              className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <Plus size={16} />
              Cadastrar primeira pessoa
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
                    Contato
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    CPF
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
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
                {pessoasFiltradas.map((pessoa) => (
                  <tr key={pessoa.PessoaId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {pessoa.PessoaNome}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {pessoa.PessoaEmail && (
                        <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                          <Mail size={14} />
                          {pessoa.PessoaEmail}
                        </div>
                      )}
                      {pessoa.PessoaTelefone && (
                        <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1 mt-1">
                          <Phone size={14} />
                          {pessoa.PessoaTelefone}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {pessoa.PessoaCPF}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(pessoa.PessoaStatus)}`}>
                        {pessoa.PessoaStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <MessageSquare size={14} />
                        {pessoa._count?.Chamado || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewPessoa(pessoa)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                          title="Visualizar"
                        >
                          <Eye size={18} className="text-gray-600 dark:text-gray-400" />
                        </button>
                        <button
                          onClick={() => handleEditPessoa(pessoa)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                          title="Editar"
                        >
                          <Edit size={18} className="text-gray-600 dark:text-gray-400" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(pessoa)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                          title={pessoa.PessoaStatus === 'ATIVA' ? 'Inativar' : 'Ativar'}
                        >
                          {pessoa.PessoaStatus === 'ATIVA' ? (
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
        {!isLoading && pessoasFiltradas.length > 0 && (
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
      <PessoaModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSavePessoa}
        pessoa={selectedPessoa}
        unidadeId={user?.Unidade?.UnidadeId || 0}
        isLoading={modalLoading}
      />

      <ConfirmModal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={confirmToggleStatus}
        title={pessoaToToggle?.PessoaStatus === 'ATIVA' ? 'Inativar Pessoa' : 'Ativar Pessoa'}
        message={`Tem certeza que deseja ${pessoaToToggle?.PessoaStatus === 'ATIVA' ? 'inativar' : 'ativar'} a pessoa "${pessoaToToggle?.PessoaNome}"?`}
        confirmText={pessoaToToggle?.PessoaStatus === 'ATIVA' ? 'Inativar' : 'Ativar'}
        type={pessoaToToggle?.PessoaStatus === 'ATIVA' ? 'danger' : 'info'}
      />

      <ViewModal
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        pessoa={viewingPessoa}
      />
    </div>
  )
}