"use client"

import { useState, useEffect } from "react"
import { 
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
  Building2,
  Briefcase,
  Mail,
  Phone,
  User,
  Key,
  Calendar,
  Activity,
  Hammer
} from "lucide-react"
import { 
  listarTecnicos, 
  cadastrarTecnico, 
  alterarTecnico, 
  alterarStatusTecnico,
  type Tecnico,
  type TecnicoFilters
} from "@/lib/tecnico-service"
import { listarDepartamentos } from "@/lib/departamento-service"
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
function TecnicoModal({
  isOpen,
  onClose,
  onSave,
  tecnico,
  unidadeId,
  departamentos,
  isLoading
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (data: any) => Promise<void>
  tecnico?: Tecnico | null
  unidadeId: number
  departamentos: Array<{ DepartamentoId: string; DepartamentoNome: string; DepartamentoStatus: string }>
  isLoading: boolean
}) {
  const [formData, setFormData] = useState({
    DepartamentoId: "",
    TecnicoNome: "",
    TecnicoEmail: "",
    TecnicoTelefone: "",
    TecnicoCPF: "",
    TecnicoUsuario: "",
    TecnicoSenha: "",
    TecnicoStatus: "ATIVO" as 'ATIVO' | 'INATIVO' | 'BLOQUEADO'
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (tecnico) {
      setFormData({
        DepartamentoId: tecnico.DepartamentoId,
        TecnicoNome: tecnico.TecnicoNome,
        TecnicoEmail: tecnico.TecnicoEmail || "",
        TecnicoTelefone: tecnico.TecnicoTelefone || "",
        TecnicoCPF: tecnico.TecnicoCPF,
        TecnicoUsuario: tecnico.TecnicoUsuario,
        TecnicoSenha: "",
        TecnicoStatus: tecnico.TecnicoStatus
      })
    } else {
      setFormData({
        DepartamentoId: departamentos.length > 0 ? departamentos[0].DepartamentoId : "",
        TecnicoNome: "",
        TecnicoEmail: "",
        TecnicoTelefone: "",
        TecnicoCPF: "",
        TecnicoUsuario: "",
        TecnicoSenha: "",
        TecnicoStatus: "ATIVO"
      })
    }
    setErrors({})
  }, [tecnico, departamentos])

  const validate = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.DepartamentoId) {
      newErrors.DepartamentoId = "Departamento é obrigatório"
    }
    
    if (!formData.TecnicoNome.trim()) {
      newErrors.TecnicoNome = "Nome é obrigatório"
    }
    
    if (!formData.TecnicoCPF.trim()) {
      newErrors.TecnicoCPF = "CPF é obrigatório"
    } else if (formData.TecnicoCPF.replace(/\D/g, '').length !== 11) {
      newErrors.TecnicoCPF = "CPF inválido"
    }
    
    if (!tecnico && !formData.TecnicoSenha.trim()) {
      newErrors.TecnicoSenha = "Senha é obrigatória"
    } else if (formData.TecnicoSenha && formData.TecnicoSenha.length < 6) {
      newErrors.TecnicoSenha = "Senha deve ter no mínimo 6 caracteres"
    }
    
    if (formData.TecnicoEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.TecnicoEmail)) {
      newErrors.TecnicoEmail = "E-mail inválido"
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    const dataToSend: any = {
      DepartamentoId: formData.DepartamentoId,
      UnidadeId: unidadeId,
      TecnicoNome: formData.TecnicoNome.trim(),
      TecnicoCPF: formData.TecnicoCPF.replace(/\D/g, ''),
      TecnicoStatus: formData.TecnicoStatus
    }

    if (formData.TecnicoEmail) dataToSend.TecnicoEmail = formData.TecnicoEmail.trim()
    if (formData.TecnicoTelefone) dataToSend.TecnicoTelefone = formData.TecnicoTelefone.trim()
    if (formData.TecnicoSenha) dataToSend.TecnicoSenha = formData.TecnicoSenha

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
            {tecnico ? 'Editar Técnico' : 'Novo Técnico'}
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
            {/* Departamento */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Departamento *
              </label>
              <select
                value={formData.DepartamentoId}
                onChange={(e) => setFormData({ ...formData, DepartamentoId: e.target.value })}
                className={`w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 dark:text-gray-100 ${
                  errors.DepartamentoId ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
                }`}
                disabled={isLoading}
              >
                <option value="">Selecione um departamento</option>
                {departamentos
                  .filter(d => d.DepartamentoStatus === 'ATIVO')
                  .map((dept) => (
                    <option key={dept.DepartamentoId} value={dept.DepartamentoId}>
                      {dept.DepartamentoNome}
                    </option>
                  ))}
              </select>
              {errors.DepartamentoId && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.DepartamentoId}</p>
              )}
            </div>

            {/* Nome */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nome Completo *
              </label>
              <input
                type="text"
                value={formData.TecnicoNome}
                onChange={(e) => setFormData({ ...formData, TecnicoNome: e.target.value })}
                className={`w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 dark:text-gray-100 ${
                  errors.TecnicoNome ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
                }`}
                placeholder="Digite o nome completo"
                disabled={isLoading}
              />
              {errors.TecnicoNome && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.TecnicoNome}</p>
              )}
            </div>

            {/* CPF */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                CPF *
              </label>
              <input
                type="text"
                value={formatCPF(formData.TecnicoCPF)}
                onChange={(e) => setFormData({ ...formData, TecnicoCPF: e.target.value.replace(/\D/g, '') })}
                maxLength={14}
                className={`w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 dark:text-gray-100 ${
                  errors.TecnicoCPF ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
                }`}
                placeholder="000.000.000-00"
                disabled={isLoading}
              />
              {errors.TecnicoCPF && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.TecnicoCPF}</p>
              )}
            </div>

            {/* Telefone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Telefone
              </label>
              <input
                type="text"
                value={formatPhone(formData.TecnicoTelefone ?? '')}
                onChange={(e) => setFormData({ ...formData, TecnicoTelefone: e.target.value.replace(/\D/g, '') })}
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
                value={formData.TecnicoEmail}
                onChange={(e) => setFormData({ ...formData, TecnicoEmail: e.target.value })}
                className={`w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 dark:text-gray-100 ${
                  errors.TecnicoEmail ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
                }`}
                placeholder="email@exemplo.com"
                disabled={isLoading}
              />
              {errors.TecnicoEmail && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.TecnicoEmail}</p>
              )}
            </div>

            {/* Senha */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {tecnico ? 'Nova Senha (opcional)' : 'Senha *'}
              </label>
              <input
                type="password"
                value={formData.TecnicoSenha}
                onChange={(e) => setFormData({ ...formData, TecnicoSenha: e.target.value })}
                className={`w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 dark:text-gray-100 ${
                  errors.TecnicoSenha ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
                }`}
                placeholder={tecnico ? "Deixe em branco para manter" : "Mínimo 6 caracteres"}
                disabled={isLoading}
              />
              {errors.TecnicoSenha && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.TecnicoSenha}</p>
              )}
            </div>

            {/* Status */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                value={formData.TecnicoStatus}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  TecnicoStatus: e.target.value as 'ATIVO' | 'INATIVO' | 'BLOQUEADO' 
                })}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 dark:text-gray-100"
                disabled={isLoading}
              >
                <option value="ATIVO">ATIVO</option>
                <option value="INATIVO">INATIVO</option>
                <option value="BLOQUEADO">BLOQUEADO</option>
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
                tecnico ? 'Atualizar' : 'Cadastrar'
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
  tecnico
}: {
  isOpen: boolean
  onClose: () => void
  tecnico: Tecnico | null
}) {
  if (!isOpen || !tecnico) return null

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
            Detalhes do Técnico
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
              <p className="text-lg font-medium text-gray-900 dark:text-gray-100">{tecnico.TecnicoNome}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
              <span className={`inline-block px-2 py-1 mt-1 rounded-full text-xs font-medium ${getStatusBadge(tecnico.TecnicoStatus)}`}>
                {tecnico.TecnicoStatus}
              </span>
            </div>
            <div className="col-span-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">Departamento</p>
              <p className="text-base text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Briefcase size={16} />
                {tecnico.Departamento?.DepartamentoNome || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">CPF</p>
              <p className="text-base text-gray-900 dark:text-gray-100">{tecnico.TecnicoCPF}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Usuário</p>
              <p className="text-base text-gray-900 dark:text-gray-100">{tecnico.TecnicoUsuario}</p>
            </div>
            {tecnico.TecnicoEmail && (
              <div className="col-span-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">E-mail</p>
                <p className="text-base text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Mail size={16} />
                  {tecnico.TecnicoEmail}
                </p>
              </div>
            )}
            {tecnico.TecnicoTelefone && (
              <div className="col-span-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">Telefone</p>
                <p className="text-base text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Phone size={16} />
                  {tecnico.TecnicoTelefone}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Data Cadastro</p>
              <p className="text-sm text-gray-900 dark:text-gray-100">
                {new Date(tecnico.TecnicoDtCadastro).toLocaleDateString('pt-BR')}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Atividades</p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {tecnico._count?.AtividadeChamado || 0}
              </p>
            </div>
          </div>

          {/* Equipes */}
          {tecnico.TecnicoEquipe && tecnico.TecnicoEquipe.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <Users size={16} />
                Equipes
              </h3>
              <div className="space-y-2">
                {tecnico.TecnicoEquipe.map((te) => (
                  <div key={te.TecEquId} className="flex items-center justify-between py-1">
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {te.Equipe.EquipeNome}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      te.TecEquStatus === 'ATIVO' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                    }`}>
                      {te.TecEquStatus}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Últimas Atividades */}
          {tecnico.AtividadeChamado && tecnico.AtividadeChamado.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <Activity size={16} />
                Últimas Atividades
              </h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {tecnico.AtividadeChamado.map((atividade) => (
                  <div key={atividade.AtividadeId} className="text-sm">
                    <p className="text-gray-900 dark:text-gray-100">
                      Chamado #{atividade.ChamadoId}: {atividade.AtividadeDescricao}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      {new Date(atividade.AtividadeDtRealizacao).toLocaleString('pt-BR')}
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

export default function TecnicosPage() {
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([])
  const [departamentos, setDepartamentos] = useState<Array<{ DepartamentoId: string; DepartamentoNome: string; DepartamentoStatus: string }>>([])
  const [paginacao, setPaginacao] = useState({
    paginaAtual: 1,
    limitePorPagina: 10,
    totalRegistros: 0,
    totalPaginas: 1
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<TecnicoFilters>({
    pagina: 1,
    limite: 10
  })
  const [showFilters, setShowFilters] = useState(false)
  const [selectedTecnico, setSelectedTecnico] = useState<Tecnico | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalLoading, setModalLoading] = useState(false)
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [tecnicoToToggle, setTecnicoToToggle] = useState<Tecnico | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [viewingTecnico, setViewingTecnico] = useState<Tecnico | null>(null)

  const { user } = useGestorAuth()

  useEffect(() => {
    carregarDados()
  }, [filters])

  const carregarDados = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Carregar departamentos primeiro
      const deptsResponse = await listarDepartamentos({ limite: 100 })
      setDepartamentos(deptsResponse.data)
      
      // Depois carregar técnicos
      const response = await listarTecnicos(filters)
      setTecnicos(response.data)
      setPaginacao(response.paginacao)
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
      setError('Não foi possível carregar os técnicos')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFilterChange = (key: keyof TecnicoFilters, value: any) => {
    setFilters({ ...filters, [key]: value, pagina: 1 })
  }

  const handlePageChange = (novaPagina: number) => {
    setFilters({ ...filters, pagina: novaPagina })
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setFilters({ ...filters, pagina: 1 })
  }

  const handleNewTecnico = () => {
    setSelectedTecnico(null)
    setModalOpen(true)
  }

  const handleEditTecnico = (tecnico: Tecnico) => {
    setSelectedTecnico(tecnico)
    setModalOpen(true)
  }

  const handleViewTecnico = (tecnico: Tecnico) => {
    setViewingTecnico(tecnico)
    setViewModalOpen(true)
  }

  const handleToggleStatus = (tecnico: Tecnico) => {
    setTecnicoToToggle(tecnico)
    setConfirmModalOpen(true)
  }

  const confirmToggleStatus = async () => {
    if (!tecnicoToToggle) return

    try {
      setModalLoading(true)
      const novoStatus = tecnicoToToggle.TecnicoStatus === 'ATIVO' ? 'INATIVO' : 'ATIVO'
      await alterarStatusTecnico(tecnicoToToggle.TecnicoId, novoStatus)
      await carregarDados()
    } catch (err: any) {
      console.error('Erro ao alterar status:', err)
      alert(err.response?.data?.error || 'Erro ao alterar status do técnico')
    } finally {
      setModalLoading(false)
      setTecnicoToToggle(null)
    }
  }

  const handleSaveTecnico = async (data: any) => {
    if (!user?.Unidade?.UnidadeId) {
      alert('Unidade não identificada')
      return
    }

    try {
      setModalLoading(true)
      if (selectedTecnico) {
        await alterarTecnico(selectedTecnico.TecnicoId, data)
      } else {
        await cadastrarTecnico(data)
      }
      setModalOpen(false)
      await carregarDados()
    } catch (err: any) {
      console.error('Erro ao salvar técnico:', err)
      alert(err.response?.data?.error || 'Erro ao salvar técnico')
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
  const tecnicosFiltrados = tecnicos.filter(t => 
    t.TecnicoNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.TecnicoEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.TecnicoCPF.includes(searchTerm)
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Técnicos
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Gerencie os técnicos da unidade
          </p>
          {user?.Unidade && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1">
              <Building2 size={12} />
              {user.Unidade.UnidadeNome}
            </p>
          )}
        </div>
        <button
          onClick={handleNewTecnico}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus size={18} />
          <span>Novo Técnico</span>
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
              onClick={carregarDados}
              className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
              <span>Atualizar</span>
            </button>
          </div>

          {/* Opções de filtro */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Filtro por Departamento */}
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Departamento
                  </label>
                  <select
                    value={filters.departamentoId || ''}
                    onChange={(e) => handleFilterChange('departamentoId', e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm"
                  >
                    <option value="">Todos</option>
                    {departamentos.map((dept) => (
                      <option key={dept.DepartamentoId} value={dept.DepartamentoId}>
                        {dept.DepartamentoNome}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filtro por Status */}
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Status
                  </label>
                  <select
                    value={filters.status || ''}
                    onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
                    className="w-full px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm"
                  >
                    <option value="">Todos</option>
                    <option value="ATIVO">ATIVO</option>
                    <option value="INATIVO">INATIVO</option>
                    <option value="BLOQUEADO">BLOQUEADO</option>
                  </select>
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
        ) : tecnicosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Hammer size={48} className="text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-400 mb-2">Nenhum técnico encontrado</p>
            <button
              onClick={handleNewTecnico}
              className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <Plus size={16} />
              Cadastrar primeiro técnico
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
                    Departamento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Contato
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Equipes
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {tecnicosFiltrados.map((tecnico) => (
                  <tr key={tecnico.TecnicoId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {tecnico.TecnicoNome}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {tecnico.TecnicoUsuario}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {tecnico.Departamento?.DepartamentoNome || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      {tecnico.TecnicoEmail && (
                        <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                          <Mail size={14} />
                          {tecnico.TecnicoEmail}
                        </div>
                      )}
                      {tecnico.TecnicoTelefone && (
                        <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1 mt-1">
                          <Phone size={14} />
                          {tecnico.TecnicoTelefone}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(tecnico.TecnicoStatus)}`}>
                        {tecnico.TecnicoStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Users size={14} />
                        {tecnico._count?.TecnicoEquipe || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewTecnico(tecnico)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                          title="Visualizar"
                        >
                          <Eye size={18} className="text-gray-600 dark:text-gray-400" />
                        </button>
                        <button
                          onClick={() => handleEditTecnico(tecnico)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                          title="Editar"
                        >
                          <Edit size={18} className="text-gray-600 dark:text-gray-400" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(tecnico)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                          title={tecnico.TecnicoStatus === 'ATIVO' ? 'Inativar' : 'Ativar'}
                        >
                          {tecnico.TecnicoStatus === 'ATIVO' ? (
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
        {!isLoading && tecnicosFiltrados.length > 0 && (
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
      <TecnicoModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveTecnico}
        tecnico={selectedTecnico}
        unidadeId={user?.Unidade?.UnidadeId || 0}
        departamentos={departamentos}
        isLoading={modalLoading}
      />

      <ConfirmModal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={confirmToggleStatus}
        title={tecnicoToToggle?.TecnicoStatus === 'ATIVO' ? 'Inativar Técnico' : 'Ativar Técnico'}
        message={`Tem certeza que deseja ${tecnicoToToggle?.TecnicoStatus === 'ATIVO' ? 'inativar' : 'ativar'} o técnico "${tecnicoToToggle?.TecnicoNome}"?`}
        confirmText={tecnicoToToggle?.TecnicoStatus === 'ATIVO' ? 'Inativar' : 'Ativar'}
        type={tecnicoToToggle?.TecnicoStatus === 'ATIVO' ? 'danger' : 'info'}
      />

      <ViewModal
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        tecnico={viewingTecnico}
      />
    </div>
  )
}