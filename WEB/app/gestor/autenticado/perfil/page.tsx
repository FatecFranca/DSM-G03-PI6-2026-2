"use client"

import { useState, useEffect } from "react"
import { useGestorAuth } from "@/app/contexts/GestorAuthContext"
import { useRouter } from "next/navigation"
import {
    User,
    Mail,
    Phone,
    Key,
    Save,
    RefreshCw,
    AlertCircle,
    CheckCircle,
    Eye,
    EyeOff,
    Shield,
    Building2,
    Briefcase,
    Lock
} from "lucide-react"
import { alterarGestor, buscarGestorPorId } from "@/lib/gestor-unidade-service"

export default function PerfilGestorPage() {
    const { user, logout } = useGestorAuth()
    const router = useRouter()

    const [formData, setFormData] = useState({
        GestorNome: "",
        GestorEmail: "",
        GestorTelefone: "",
        GestorSenhaAtual: "",
        GestorSenha: "",
        GestorSenhaConfirm: ""
    })

    const [originalData, setOriginalData] = useState({
        GestorNome: "",
        GestorEmail: "",
        GestorTelefone: ""
    })

    const [showPassword, setShowPassword] = useState({
        atual: false,
        nova: false,
        confirm: false
    })

    const [isLoading, setIsLoading] = useState(false)
    const [isPageLoading, setIsPageLoading] = useState(true)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")
    const [errors, setErrors] = useState<Record<string, string>>({})

    useEffect(() => {
        carregarDadosGestor()
    }, [user])

    const carregarDadosGestor = async () => {
        if (!user?.GestorId) return

        try {
            setIsPageLoading(true)
            // Buscar dados atualizados do gestor
            const dadosGestor = await buscarGestorPorId(user.GestorId)

            setFormData({
                GestorNome: dadosGestor.GestorNome,
                GestorEmail: dadosGestor.GestorEmail || "",
                GestorTelefone: dadosGestor.GestorTelefone || "",
                GestorSenhaAtual: "",
                GestorSenha: "",
                GestorSenhaConfirm: ""
            })

            setOriginalData({
                GestorNome: dadosGestor.GestorNome,
                GestorEmail: dadosGestor.GestorEmail || "",
                GestorTelefone: dadosGestor.GestorTelefone || ""
            })

        } catch (error) {
            console.error('Erro ao carregar dados:', error)
            setError('Não foi possível carregar seus dados')
        } finally {
            setIsPageLoading(false)
        }
    }

    const validate = () => {
        const newErrors: Record<string, string> = {}

        if (!formData.GestorNome.trim()) {
            newErrors.nome = "Nome é obrigatório"
        }

        if (formData.GestorEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.GestorEmail)) {
            newErrors.email = "E-mail inválido"
        }

        if (formData.GestorSenha || formData.GestorSenhaConfirm || formData.GestorSenhaAtual) {
            if (!formData.GestorSenhaAtual) {
                newErrors.senhaAtual = "Senha atual é obrigatória para alterar a senha"
            }

            if (formData.GestorSenha && formData.GestorSenha.length < 6) {
                newErrors.senhaNova = "A nova senha deve ter no mínimo 6 caracteres"
            }

            if (formData.GestorSenha !== formData.GestorSenhaConfirm) {
                newErrors.senhaConfirm = "As senhas não coincidem"
            }
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setSuccess("")

        if (!validate()) return

        // Verificar se houve alterações
        const hasChanges =
            formData.GestorNome !== originalData.GestorNome ||
            formData.GestorEmail !== originalData.GestorEmail ||
            formData.GestorTelefone !== originalData.GestorTelefone ||
            formData.GestorSenha

        if (!hasChanges) {
            setError("Nenhuma alteração foi feita")
            return
        }

        setIsLoading(true)

        try {
            const dataToSend: any = {
                GestorNome: formData.GestorNome.trim()
            }

            if (formData.GestorEmail !== originalData.GestorEmail) {
                dataToSend.GestorEmail = formData.GestorEmail.trim() || null
            }

            if (formData.GestorTelefone !== originalData.GestorTelefone) {
                dataToSend.GestorTelefone = formData.GestorTelefone.trim() || null
            }

            // Se estiver alterando a senha
            dataToSend.GestorSenhaAtual = formData.GestorSenhaAtual
            if (formData.GestorSenha) {
                dataToSend.GestorSenha = formData.GestorSenha
            }

            await alterarGestor(user!.GestorId, dataToSend)

            setSuccess("Perfil atualizado com sucesso!")

            // Atualizar dados originais
            setOriginalData({
                GestorNome: formData.GestorNome,
                GestorEmail: formData.GestorEmail,
                GestorTelefone: formData.GestorTelefone
            })

            // Limpar campos de senha
            setFormData(prev => ({
                ...prev,
                GestorSenhaAtual: "",
                GestorSenha: "",
                GestorSenhaConfirm: ""
            }))

        } catch (err: any) {
            console.error('Erro ao atualizar perfil:', err)
            setError(err.response?.data?.error || 'Erro ao atualizar dados')
        } finally {
            setIsLoading(false)
        }
    }

    const formatPhone = (value: string) => {
        const numbers = value.replace(/\D/g, '')
        if (numbers.length === 11) {
            return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
        }
        return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
    }

    if (isPageLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    return (
        <div className="max-w-3xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    Meu Perfil
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Gerencie suas informações pessoais
                </p>
            </div>

            {/* Informações fixas (não editáveis) */}
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <Lock size={20} className="text-gray-500" />
                    Informações do Sistema
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                            <Building2 size={14} />
                            Unidade
                        </p>
                        <p className="text-base font-medium text-gray-900 dark:text-gray-100">
                            {user?.Unidade?.UnidadeNome}
                        </p>
                    </div>

                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                            <Briefcase size={14} />
                            Nível
                        </p>
                        <p className="text-base font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            {user?.GestorNivel === 'ADMINUNIDADE' ? (
                                <>
                                    <Shield size={16} className="text-purple-600" />
                                    Administrador de Unidade
                                </>
                            ) : (
                                'Gestor Comum'
                            )}
                        </p>
                    </div>

                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                            <User size={14} />
                            Usuário
                        </p>
                        <p className="text-base font-medium text-gray-900 dark:text-gray-100">
                            {user?.GestorUsuario}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            Não é possível alterar o nome de usuário
                        </p>
                    </div>

                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                            <Key size={14} />
                            CPF
                        </p>
                        <p className="text-base font-medium text-gray-900 dark:text-gray-100">
                            {user?.GestorCPF || 'Não informado'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            Não é possível alterar o CPF
                        </p>
                    </div>

                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                            <CheckCircle size={14} />
                            Status
                        </p>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${user?.GestorStatus === 'ATIVO'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : user?.GestorStatus === 'INATIVO'
                                    ? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            }`}>
                            {user?.GestorStatus}
                        </span>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            Não é possível alterar seu próprio status
                        </p>
                    </div>
                </div>
            </div>

            {/* Formulário de edição */}
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
                <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        Dados Pessoais
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Altere suas informações de contato e senha
                    </p>
                </div>

                {/* Messages */}
                {error && (
                    <div className="mx-6 mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
                        <AlertCircle size={20} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </div>
                )}

                {success && (
                    <div className="mx-6 mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-start gap-3">
                        <CheckCircle size={20} className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Nome */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            <div className="flex items-center gap-2">
                                <User size={16} />
                                Nome Completo *
                            </div>
                        </label>
                        <input
                            type="text"
                            value={formData.GestorNome}
                            onChange={(e) => setFormData({ ...formData, GestorNome: e.target.value })}
                            className={`w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 dark:text-gray-100 ${errors.nome ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
                                }`}
                            placeholder="Digite seu nome completo"
                            disabled={isLoading}
                        />
                        {errors.nome && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.nome}</p>
                        )}
                    </div>

                    {/* Email e Telefone */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                <div className="flex items-center gap-2">
                                    <Mail size={16} />
                                    E-mail
                                </div>
                            </label>
                            <input
                                type="email"
                                value={formData.GestorEmail}
                                onChange={(e) => setFormData({ ...formData, GestorEmail: e.target.value })}
                                className={`w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 dark:text-gray-100 ${errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
                                    }`}
                                placeholder="seu@email.com"
                                disabled={isLoading}
                            />
                            {errors.email && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                <div className="flex items-center gap-2">
                                    <Phone size={16} />
                                    Telefone
                                </div>
                            </label>
                            <input
                                type="text"
                                value={formatPhone(formData.GestorTelefone)}
                                onChange={(e) => setFormData({ ...formData, GestorTelefone: e.target.value.replace(/\D/g, '') })}
                                maxLength={15}
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 dark:text-gray-100"
                                placeholder="(00) 00000-0000"
                                disabled={isLoading}
                            />
                        </div>

                        {/* Senha Atual */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Senha atual
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword.atual ? "text" : "password"}
                                    value={formData.GestorSenhaAtual}
                                    onChange={(e) => setFormData({ ...formData, GestorSenhaAtual: e.target.value })}
                                    className={`w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 dark:text-gray-100 ${errors.senhaAtual ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
                                        }`}
                                    placeholder="Digite sua senha atual"
                                    disabled={isLoading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword({ ...showPassword, atual: !showPassword.atual })}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                >
                                    {showPassword.atual ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            {errors.senhaAtual && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.senhaAtual}</p>
                            )}
                        </div>
                    </div>

                    {/* Divisor */}
                    <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                            <Key size={16} />
                            Alterar Senha
                        </h3>

                        <div className="space-y-4">

                            {/* Nova Senha e Confirmar */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Nova senha
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword.nova ? "text" : "password"}
                                            value={formData.GestorSenha}
                                            onChange={(e) => setFormData({ ...formData, GestorSenha: e.target.value })}
                                            className={`w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 dark:text-gray-100 ${errors.senhaNova ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
                                                }`}
                                            placeholder="Mínimo 6 caracteres"
                                            disabled={isLoading}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword({ ...showPassword, nova: !showPassword.nova })}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                        >
                                            {showPassword.nova ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                    {errors.senhaNova && (
                                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.senhaNova}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Confirmar nova senha
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword.confirm ? "text" : "password"}
                                            value={formData.GestorSenhaConfirm}
                                            onChange={(e) => setFormData({ ...formData, GestorSenhaConfirm: e.target.value })}
                                            className={`w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 dark:text-gray-100 ${errors.senhaConfirm ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
                                                }`}
                                            placeholder="Confirme a nova senha"
                                            disabled={isLoading}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword({ ...showPassword, confirm: !showPassword.confirm })}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                        >
                                            {showPassword.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                    {errors.senhaConfirm && (
                                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.senhaConfirm}</p>
                                    )}
                                </div>
                            </div>

                            <p className="text-xs text-gray-500 dark:text-gray-500">
                                Para alterar sua senha, preencha a senha atual e a nova senha. Deixe em branco para manter a senha atual.
                            </p>
                        </div>
                    </div>

                    {/* Botões */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            disabled={isLoading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                        >
                            {isLoading ? (
                                <>
                                    <RefreshCw size={16} className="animate-spin" />
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    <Save size={16} />
                                    Salvar alterações
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            {/* Informações adicionais */}
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Informações importantes:</strong> Você não pode alterar seu usuário, CPF, nível, unidade ou status.
                    Essas informações são gerenciadas pelo administrador geral do sistema.
                </p>
            </div>
        </div>
    )
}