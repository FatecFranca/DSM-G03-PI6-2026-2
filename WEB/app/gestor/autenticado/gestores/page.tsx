"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
    UserCog,
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
    Shield,
    AlertTriangle
} from "lucide-react"
import {
    listarGestores,
    cadastrarGestor,
    alterarGestor,
    alterarStatusGestor,
    type Gestor,
    type GestorFilters
} from "@/lib/gestor-unidade-service"
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
function GestorModal({
    isOpen,
    onClose,
    onSave,
    gestor,
    unidadeId,
    isLoading
}: {
    isOpen: boolean
    onClose: () => void
    onSave: (data: any) => Promise<void>
    gestor?: Gestor | null
    unidadeId: number
    isLoading: boolean
}) {
    const [formData, setFormData] = useState({
        GestorNome: "",
        GestorEmail: "",
        GestorTelefone: "",
        GestorCPF: "",
        GestorUsuario: "",
        GestorSenha: "",
        GestorSenhaAtual: "",
        GestorNivel: "COMUM" as 'COMUM' | 'ADMINUNIDADE',
        GestorStatus: "ATIVO" as 'ATIVO' | 'INATIVO' | 'BLOQUEADO'
    })
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [isEditingSelf, setIsEditingSelf] = useState(false)

    useEffect(() => {
        if (gestor) {
            setFormData({
                GestorNome: gestor.GestorNome,
                GestorEmail: gestor.GestorEmail || "",
                GestorTelefone: gestor.GestorTelefone || "",
                GestorCPF: gestor.GestorCPF,
                GestorUsuario: gestor.GestorUsuario,
                GestorSenha: "",
                GestorSenhaAtual: "",
                GestorNivel: gestor.GestorNivel,
                GestorStatus: gestor.GestorStatus
            })
        } else {
            setFormData({
                GestorNome: "",
                GestorEmail: "",
                GestorTelefone: "",
                GestorCPF: "",
                GestorUsuario: "",
                GestorSenha: "",
                GestorSenhaAtual: "",
                GestorNivel: "COMUM",
                GestorStatus: "ATIVO"
            })
        }
        setErrors({})
    }, [gestor])

    const validate = () => {
        const newErrors: Record<string, string> = {}

        if (!formData.GestorNome.trim()) {
            newErrors.GestorNome = "Nome é obrigatório"
        }

        if (!formData.GestorCPF.trim()) {
            newErrors.GestorCPF = "CPF é obrigatório"
        } else if (formData.GestorCPF.replace(/\D/g, '').length !== 11) {
            newErrors.GestorCPF = "CPF inválido"
        }

        if (!formData.GestorUsuario.trim()) {
            newErrors.GestorUsuario = "Usuário é obrigatório"
        }

        if (!gestor && !formData.GestorSenha.trim()) {
            newErrors.GestorSenha = "Senha é obrigatória"
        } else if (formData.GestorSenha && formData.GestorSenha.length < 6) {
            newErrors.GestorSenha = "Senha deve ter no mínimo 6 caracteres"
        }

        /*
        if (gestor && !formData.GestorSenhaAtual.trim()) {
            newErrors.GestorSenhaAtual = "Senha atual é obrigatória para confirmar alterações"
        }
        */

        if (formData.GestorEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.GestorEmail)) {
            newErrors.GestorEmail = "E-mail inválido"
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!validate()) return

        const dataToSend: any = {
            UnidadeId: unidadeId,
            GestorNome: formData.GestorNome.trim(),
            GestorCPF: formData.GestorCPF.replace(/\D/g, ''),
            GestorUsuario: formData.GestorUsuario.trim(),
            GestorNivel: formData.GestorNivel,
            GestorStatus: formData.GestorStatus
        }

        if (formData.GestorEmail) dataToSend.GestorEmail = formData.GestorEmail.trim()
        if (formData.GestorTelefone) dataToSend.GestorTelefone = formData.GestorTelefone.trim()
        if (formData.GestorSenha) dataToSend.GestorSenha = formData.GestorSenha
        if (gestor && formData.GestorSenhaAtual) dataToSend.GestorSenhaAtual = formData.GestorSenhaAtual

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
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                            {gestor ? 'Editar Gestor' : 'Novo Gestor'}
                        </h2>
                        {gestor && (
                            <p className="text-sm text-purple-600 dark:text-purple-400 mt-1 flex items-center gap-1">
                                <Shield size={14} />
                                Apenas gestores COMUM podem ser criados/editados por ADMINUNIDADE
                            </p>
                        )}
                    </div>
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
                                value={formData.GestorNome}
                                onChange={(e) => setFormData({ ...formData, GestorNome: e.target.value })}
                                className={`w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-gray-900 dark:text-gray-100 ${errors.GestorNome ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
                                    }`}
                                placeholder="Digite o nome completo"
                                disabled={isLoading}
                            />
                            {errors.GestorNome && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.GestorNome}</p>
                            )}
                        </div>

                        {/* CPF */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                CPF *
                            </label>
                            <input
                                type="text"
                                value={formatCPF(formData.GestorCPF)}
                                onChange={(e) => setFormData({ ...formData, GestorCPF: e.target.value.replace(/\D/g, '') })}
                                maxLength={14}
                                className={`w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-gray-900 dark:text-gray-100 ${errors.GestorCPF ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
                                    }`}
                                placeholder="000.000.000-00"
                                disabled={isLoading}
                            />
                            {errors.GestorCPF && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.GestorCPF}</p>
                            )}
                        </div>

                        {/* Telefone */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Telefone
                            </label>
                            <input
                                type="text"
                                value={formatPhone(formData.GestorTelefone ?? '')}
                                onChange={(e) => setFormData({ ...formData, GestorTelefone: e.target.value.replace(/\D/g, '') })}
                                maxLength={15}
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-gray-900 dark:text-gray-100"
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
                                value={formData.GestorEmail}
                                onChange={(e) => setFormData({ ...formData, GestorEmail: e.target.value })}
                                className={`w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-gray-900 dark:text-gray-100 ${errors.GestorEmail ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
                                    }`}
                                placeholder="email@exemplo.com"
                                disabled={isLoading}
                            />
                            {errors.GestorEmail && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.GestorEmail}</p>
                            )}
                        </div>

                        {/* Usuário */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Usuário *
                            </label>
                            <input
                                type="text"
                                value={formData.GestorUsuario}
                                onChange={(e) => setFormData({ ...formData, GestorUsuario: e.target.value.toUpperCase() })}
                                className={`w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-gray-900 dark:text-gray-100 ${errors.GestorUsuario ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
                                    }`}
                                placeholder="Usuário para login"
                                disabled={isLoading}
                            />
                            {errors.GestorUsuario && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.GestorUsuario}</p>
                            )}
                        </div>

                        {/* Nível - apenas para cadastro, em edição só admin pode alterar */}
                        {!gestor && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Nível *
                                </label>
                                <select
                                    value={formData.GestorNivel}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        GestorNivel: e.target.value as 'COMUM' | 'ADMINUNIDADE'
                                    })}
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-gray-900 dark:text-gray-100"
                                    disabled={isLoading}
                                >
                                    <option value="COMUM">COMUM</option>
                                </select>
                                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                    Apenas Administradores do Sistema podem criar gestores Admin Unidade
                                </p>
                            </div>
                        )}

                        {/* Status */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Status
                            </label>
                            <select
                                value={formData.GestorStatus}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    GestorStatus: e.target.value as 'ATIVO' | 'INATIVO' | 'BLOQUEADO'
                                })}
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-gray-900 dark:text-gray-100"
                                disabled={isLoading}
                            >
                                <option value="ATIVO">ATIVO</option>
                                <option value="INATIVO">INATIVO</option>
                                <option value="BLOQUEADO">BLOQUEADO</option>
                            </select>
                        </div>

                        {/* Senha - apenas para cadastro ou quando for alterar */}
                        {!gestor ? (
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Senha *
                                </label>
                                <input
                                    type="password"
                                    value={formData.GestorSenha}
                                    onChange={(e) => setFormData({ ...formData, GestorSenha: e.target.value })}
                                    className={`w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-gray-900 dark:text-gray-100 ${errors.GestorSenha ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
                                        }`}
                                    placeholder="Mínimo 6 caracteres"
                                    disabled={isLoading}
                                />
                                {errors.GestorSenha && (
                                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.GestorSenha}</p>
                                )}
                            </div>
                        ) : (
                            <>

                                {/* Nova Senha (opcional) */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Nova Senha (opcional)
                                    </label>
                                    <input
                                        type="password"
                                        value={formData.GestorSenha}
                                        onChange={(e) => setFormData({ ...formData, GestorSenha: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-gray-900 dark:text-gray-100"
                                        placeholder="Deixe em branco para manter a atual"
                                        disabled={isLoading}
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
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
                            className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <RefreshCw size={16} className="animate-spin" />
                                    Salvando...
                                </>
                            ) : (
                                gestor ? 'Atualizar' : 'Cadastrar'
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
    gestor
}: {
    isOpen: boolean
    onClose: () => void
    gestor: Gestor | null
}) {
    if (!isOpen || !gestor) return null

    const getStatusBadge = (status: string) => {
        const styles = {
            ATIVO: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
            INATIVO: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
            BLOQUEADO: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
        }
        return styles[status as keyof typeof styles] || styles.INATIVO
    }

    const getNivelBadge = (nivel: string) => {
        const styles = {
            COMUM: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
            ADMINUNIDADE: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
        }
        return styles[nivel as keyof typeof styles] || styles.COMUM
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 rounded-lg max-w-2xl w-full mx-4">
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                        Detalhes do Gestor
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
                            <p className="text-lg font-medium text-gray-900 dark:text-gray-100">{gestor.GestorNome}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                            <span className={`inline-block px-2 py-1 mt-1 rounded-full text-xs font-medium ${getStatusBadge(gestor.GestorStatus)}`}>
                                {gestor.GestorStatus}
                            </span>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Unidade</p>
                            <p className="text-base text-gray-900 dark:text-gray-100 flex items-center gap-1">
                                <Building2 size={16} />
                                {gestor.Unidade?.UnidadeNome}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Nível</p>
                            <span className={`inline-block px-2 py-1 mt-1 rounded-full text-xs font-medium ${getNivelBadge(gestor.GestorNivel)}`}>
                                {gestor.GestorNivel === 'ADMINUNIDADE' ? 'Administrador de Unidade' : 'Gestor Comum'}
                            </span>
                        </div>

                        {/* CPF - só mostra se NÃO for ADMINUNIDADE */}
                        {gestor.GestorNivel !== 'ADMINUNIDADE' && (
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">CPF</p>
                                <p className="text-base text-gray-900 dark:text-gray-100">{gestor.GestorCPF}</p>
                            </div>
                        )}

                        {/* Usuário - só mostra se NÃO for ADMINUNIDADE */}
                        {gestor.GestorNivel !== 'ADMINUNIDADE' && (
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Usuário</p>
                                <p className="text-base text-gray-900 dark:text-gray-100">{gestor.GestorUsuario}</p>
                            </div>
                        )}

                        {/* Para ADMINUNIDADE, mostra uma mensagem de informação (opcional) */}
                        {gestor.GestorNivel === 'ADMINUNIDADE' && (
                            <div className="col-span-2">
                                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
                                    <p className="text-sm text-purple-800 dark:text-purple-200 flex items-center gap-2">
                                        <Shield size={16} />
                                        Dados de acesso (CPF e Usuário) são restritos para Administradores de Unidade.
                                    </p>
                                </div>
                            </div>
                        )}

                        {gestor.GestorEmail && (
                            <div className="col-span-2">
                                <p className="text-sm text-gray-500 dark:text-gray-400">E-mail</p>
                                <p className="text-base text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                    <Mail size={16} />
                                    {gestor.GestorEmail}
                                </p>
                            </div>
                        )}

                        {gestor.GestorTelefone && (
                            <div className="col-span-2">
                                <p className="text-sm text-gray-500 dark:text-gray-400">Telefone</p>
                                <p className="text-base text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                    <Phone size={16} />
                                    {gestor.GestorTelefone}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-800">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    )
}

export default function GestoresUnidadePage() {
    const [gestores, setGestores] = useState<Gestor[]>([])
    const [paginacao, setPaginacao] = useState({
        paginaAtual: 1,
        limitePorPagina: 10,
        totalRegistros: 0,
        totalPaginas: 1
    })
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [filters, setFilters] = useState<GestorFilters>({
        pagina: 1,
        limite: 10
    })
    const [showFilters, setShowFilters] = useState(false)
    const [selectedGestor, setSelectedGestor] = useState<Gestor | null>(null)
    const [modalOpen, setModalOpen] = useState(false)
    const [modalLoading, setModalLoading] = useState(false)
    const [confirmModalOpen, setConfirmModalOpen] = useState(false)
    const [gestorToToggle, setGestorToToggle] = useState<Gestor | null>(null)
    const [searchTerm, setSearchTerm] = useState("")
    const [viewModalOpen, setViewModalOpen] = useState(false)
    const [viewingGestor, setViewingGestor] = useState<Gestor | null>(null)

    const { user, isAdminUnidade } = useGestorAuth()
    const router = useRouter()

    // Redirecionar se não for ADMINUNIDADE
    useEffect(() => {
        if (!isAdminUnidade) {
            router.push('/gestor/autenticado/dashboard')
        }
    }, [isAdminUnidade, router])

    useEffect(() => {
        if (isAdminUnidade) {
            carregarGestores()
        }
    }, [filters, isAdminUnidade])

    const carregarGestores = async () => {
        try {
            setIsLoading(true)
            setError(null)
            const response = await listarGestores(filters)
            setGestores(response.data)
            setPaginacao(response.paginacao)
        } catch (err) {
            console.error('Erro ao carregar gestores:', err)
            setError('Não foi possível carregar os gestores')
        } finally {
            setIsLoading(false)
        }
    }

    const handleFilterChange = (key: keyof GestorFilters, value: any) => {
        setFilters({ ...filters, [key]: value, pagina: 1 })
    }

    const handlePageChange = (novaPagina: number) => {
        setFilters({ ...filters, pagina: novaPagina })
    }

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        setFilters({ ...filters, pagina: 1 })
    }

    const handleNewGestor = () => {
        setSelectedGestor(null)
        setModalOpen(true)
    }

    const handleEditGestor = (gestor: Gestor) => {
        setSelectedGestor(gestor)
        setModalOpen(true)
    }

    const handleViewGestor = (gestor: Gestor) => {
        setViewingGestor(gestor)
        setViewModalOpen(true)
    }

    const handleToggleStatus = (gestor: Gestor) => {
        setGestorToToggle(gestor)
        setConfirmModalOpen(true)
    }

    const confirmToggleStatus = async () => {
        if (!gestorToToggle) return

        try {
            setModalLoading(true)
            const novoStatus = gestorToToggle.GestorStatus === 'ATIVO' ? 'INATIVO' : 'ATIVO'
            await alterarStatusGestor(gestorToToggle.GestorId, novoStatus)
            await carregarGestores()
        } catch (err: any) {
            console.error('Erro ao alterar status:', err)
            alert(err.response?.data?.error || 'Erro ao alterar status do gestor')
        } finally {
            setModalLoading(false)
            setGestorToToggle(null)
        }
    }

    const handleSaveGestor = async (data: any) => {
        if (!user?.Unidade?.UnidadeId) {
            alert('Unidade não identificada')
            return
        }

        try {
            setModalLoading(true)
            if (selectedGestor) {
                await alterarGestor(selectedGestor.GestorId, data)
            } else {
                await cadastrarGestor(data)
            }
            setModalOpen(false)
            await carregarGestores()
        } catch (err: any) {
            console.error('Erro ao salvar gestor:', err)
            alert(err.response?.data?.error || 'Erro ao salvar gestor')
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

    const getNivelBadge = (nivel: string) => {
        const styles = {
            COMUM: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
            ADMINUNIDADE: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
        }
        return styles[nivel as keyof typeof styles] || styles.COMUM
    }

    // Filtrar localmente
    const gestoresFiltrados = gestores.filter(g =>
        g.GestorNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.GestorEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.GestorCPF.includes(searchTerm)
    )

    // Se não for ADMINUNIDADE, não renderiza nada (o useEffect redireciona)
    if (!isAdminUnidade) {
        return null
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <Shield size={24} className="text-purple-600" />
                        Gestores da Unidade
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Gerencie os gestores da sua unidade (apenas gestores COMUM)
                    </p>
                    {user?.Unidade && (
                        <p className="text-xs text-purple-600 dark:text-purple-400 mt-1 flex items-center gap-1">
                            <Building2 size={12} />
                            {user.Unidade.UnidadeNome}
                        </p>
                    )}
                </div>
                <button
                    onClick={handleNewGestor}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                    <Plus size={18} />
                    <span>Novo Gestor</span>
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
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-gray-900 dark:text-gray-100"
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
                            onClick={carregarGestores}
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
                                {/* Filtro por Nível */}
                                <div>
                                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                        Nível
                                    </label>
                                    <select
                                        value={filters.nivel || ''}
                                        onChange={(e) => handleFilterChange('nivel', e.target.value || undefined)}
                                        className="w-full px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm"
                                    >
                                        <option value="">Todos</option>
                                        <option value="COMUM">COMUM</option>
                                        <option value="ADMINUNIDADE">ADMINUNIDADE</option>
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
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                    </div>
                ) : gestoresFiltrados.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64">
                        <UserCog size={48} className="text-gray-400 mb-4" />
                        <p className="text-gray-600 dark:text-gray-400 mb-2">Nenhum gestor encontrado</p>
                        <button
                            onClick={handleNewGestor}
                            className="text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                        >
                            <Plus size={16} />
                            Cadastrar primeiro gestor
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
                                        Nível
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Ações
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                {gestoresFiltrados.map((gestor) => (
                                    <tr key={gestor.GestorId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                {gestor.GestorNome}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                {gestor.GestorUsuario}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {gestor.GestorEmail && (
                                                <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                                    <Mail size={14} />
                                                    {gestor.GestorEmail}
                                                </div>
                                            )}
                                            {gestor.GestorTelefone && (
                                                <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1 mt-1">
                                                    <Phone size={14} />
                                                    {gestor.GestorTelefone}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getNivelBadge(gestor.GestorNivel)}`}>
                                                {gestor.GestorNivel === 'ADMINUNIDADE' ? 'Admin Unidade' : 'Comum'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(gestor.GestorStatus)}`}>
                                                {gestor.GestorStatus}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {/* Botão Visualizar - sempre visível */}
                                                <button
                                                    onClick={() => handleViewGestor(gestor)}
                                                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                                                    title="Visualizar"
                                                >
                                                    <Eye size={18} className="text-gray-600 dark:text-gray-400" />
                                                </button>

                                                {/* Se for ADMINUNIDADE, NÃO mostra botões de editar e inativar */}
                                                {gestor.GestorNivel !== 'ADMINUNIDADE' && (
                                                    <>
                                                        {/* Botão Editar */}
                                                        <button
                                                            onClick={() => handleEditGestor(gestor)}
                                                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                                                            title="Editar"
                                                        >
                                                            <Edit size={18} className="text-gray-600 dark:text-gray-400" />
                                                        </button>

                                                        {/* Botão Ativar/Inativar */}
                                                        <button
                                                            onClick={() => handleToggleStatus(gestor)}
                                                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                                                            title={gestor.GestorStatus === 'ATIVO' ? 'Inativar' : 'Ativar'}
                                                        >
                                                            {gestor.GestorStatus === 'ATIVO' ? (
                                                                <XCircle size={18} className="text-red-600 dark:text-red-400" />
                                                            ) : (
                                                                <CheckCircle size={18} className="text-green-600 dark:text-green-400" />
                                                            )}
                                                        </button>
                                                    </>
                                                )}

                                                {/* Se for ADMINUNIDADE, mostra apenas um ícone indicativo (opcional) */}
                                                {gestor.GestorNivel === 'ADMINUNIDADE' && (
                                                    <span className="p-1" title="Administrador de Unidade">
                                                        <Shield size={18} className="text-purple-600 dark:text-purple-400" />
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Paginação */}
                {!isLoading && gestoresFiltrados.length > 0 && (
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
                            <span className="px-3 py-2 bg-purple-600 text-white rounded-lg text-sm">
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
            <GestorModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSave={handleSaveGestor}
                gestor={selectedGestor}
                unidadeId={user?.Unidade?.UnidadeId || 0}
                isLoading={modalLoading}
            />

            <ConfirmModal
                isOpen={confirmModalOpen}
                onClose={() => setConfirmModalOpen(false)}
                onConfirm={confirmToggleStatus}
                title={gestorToToggle?.GestorStatus === 'ATIVO' ? 'Inativar Gestor' : 'Ativar Gestor'}
                message={`Tem certeza que deseja ${gestorToToggle?.GestorStatus === 'ATIVO' ? 'inativar' : 'ativar'} o gestor "${gestorToToggle?.GestorNome}"?`}
                confirmText={gestorToToggle?.GestorStatus === 'ATIVO' ? 'Inativar' : 'Ativar'}
                type={gestorToToggle?.GestorStatus === 'ATIVO' ? 'danger' : 'info'}
            />

            <ViewModal
                isOpen={viewModalOpen}
                onClose={() => setViewModalOpen(false)}
                gestor={viewingGestor}
            />
        </div>
    )
}