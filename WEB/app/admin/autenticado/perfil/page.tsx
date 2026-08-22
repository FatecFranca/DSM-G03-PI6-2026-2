"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/app/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { 
  User, 
  Mail, 
  Key, 
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff
} from "lucide-react"
import { apiClient } from "@/lib/api"

export default function PerfilPage() {
  const { user, logout } = useAuth()
  const router = useRouter()
  
  const [formData, setFormData] = useState({
    AdministradorUsuario: "",
    AdministradorSenhaAtual: "",
    AdministradorSenha: "",
    AdministradorSenhaConfirm: ""
  })
  
  const [showPassword, setShowPassword] = useState({
    atual: false,
    nova: false,
    confirm: false
  })
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        AdministradorUsuario: user.AdministradorUsuario
      }))
    }
  }, [user])

  const validate = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.AdministradorUsuario.trim()) {
      newErrors.usuario = "Usuário é obrigatório"
    }
    
    if (!formData.AdministradorSenhaAtual) {
      newErrors.senhaAtual = "Senha atual é obrigatória"
    }
    
    if (formData.AdministradorSenha || formData.AdministradorSenhaConfirm) {
      if (formData.AdministradorSenha.length < 6) {
        newErrors.senhaNova = "A nova senha deve ter no mínimo 6 caracteres"
      }
      
      if (formData.AdministradorSenha !== formData.AdministradorSenhaConfirm) {
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
    
    setIsLoading(true)
    
    try {
      const dataToSend: any = {
        AdministradorUsuario: formData.AdministradorUsuario.toUpperCase(),
        AdministradorSenhaAtual: formData.AdministradorSenhaAtual
      }
      
      if (formData.AdministradorSenha) {
        dataToSend.AdministradorSenha = formData.AdministradorSenha
      }
      
      const response = await apiClient.put('/admin/', dataToSend)
      
      setSuccess("Dados atualizados com sucesso!")
      
      // Limpar campos de senha
      setFormData(prev => ({
        ...prev,
        AdministradorSenhaAtual: "",
        AdministradorSenha: "",
        AdministradorSenhaConfirm: ""
      }))
      
    } catch (err: any) {
      console.error('Erro ao atualizar perfil:', err)
      setError(err.response?.data?.error || 'Erro ao atualizar dados')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Meu Perfil
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Gerencie suas informações de acesso
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
          <AlertCircle size={20} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-start gap-3">
          <CheckCircle size={20} className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
        </div>
      )}

      {/* Form */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Usuário */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <div className="flex items-center gap-2">
                <User size={16} />
                Nome de usuário *
              </div>
            </label>
            <input
              type="text"
              value={formData.AdministradorUsuario}
              onChange={(e) => setFormData({ ...formData, AdministradorUsuario: e.target.value.toUpperCase() })}
              className={`w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent outline-none text-gray-900 dark:text-gray-100 ${
                errors.usuario ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
              }`}
              placeholder="Digite seu nome de usuário"
              disabled={isLoading}
            />
            {errors.usuario && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.usuario}</p>
            )}
          </div>

          {/* Divisor */}
          <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
              <Key size={16} />
              Alterar senha
            </h3>

            {/* Senha Atual */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Senha atual *
              </label>
              <div className="relative">
                <input
                  type={showPassword.atual ? "text" : "password"}
                  value={formData.AdministradorSenhaAtual}
                  onChange={(e) => setFormData({ ...formData, AdministradorSenhaAtual: e.target.value })}
                  className={`w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent outline-none text-gray-900 dark:text-gray-100 ${
                    errors.senhaAtual ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
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

            {/* Nova Senha */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nova senha
                </label>
                <div className="relative">
                  <input
                    type={showPassword.nova ? "text" : "password"}
                    value={formData.AdministradorSenha}
                    onChange={(e) => setFormData({ ...formData, AdministradorSenha: e.target.value })}
                    className={`w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent outline-none text-gray-900 dark:text-gray-100 ${
                      errors.senhaNova ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
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
                    value={formData.AdministradorSenhaConfirm}
                    onChange={(e) => setFormData({ ...formData, AdministradorSenhaConfirm: e.target.value })}
                    className={`w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent outline-none text-gray-900 dark:text-gray-100 ${
                      errors.senhaConfirm ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
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

            <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
              Deixe os campos de nova senha em branco se não quiser alterá-la
            </p>
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
              className="flex items-center gap-2 px-6 py-2 bg-gray-900 hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50"
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
          <strong>Dica de segurança:</strong> Altere sua senha regularmente e não compartilhe seus dados de acesso com ninguém.
        </p>
      </div>
    </div>
  )
}