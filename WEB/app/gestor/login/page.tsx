"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ThemeToggle } from "@/app/components/theme-toggle"
import Link from "next/link"
import { apiClient } from "@/lib/api"
import Cookies from "js-cookie"
import { Users } from "lucide-react"

export default function GestorLogin() {
  const [usuario, setUsuario] = useState("")
  const [senha, setSenha] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const response = await apiClient.post('/gestor/login', {
        GestorUsuario: usuario,
        GestorSenha: senha
      })

      const { data } = response.data

      // Salvar nos cookies
      Cookies.set("gestor_token", data.token, { expires: 1 / 3 }) // 8 horas
      Cookies.set("gestor_user", JSON.stringify(data.usuario), { expires: 1 / 3 })

      // Forçar uma pequena pausa para garantir que os cookies foram salvos
      window.location.href = "/gestor/autenticado/dashboard";

    } catch (error: any) {
      console.error("Erro no login:", error)

      if (error.response?.data?.error) {
        setError(error.response.data.error)
      } else {
        setError("Erro ao fazer login. Tente novamente.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col transition-colors">
      {/* Header com botão de tema */}
      <header className="w-full py-4 px-6 flex justify-end">
        <ThemeToggle />
      </header>

      {/* Container do formulário */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          {/* Card de login */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-8">

            {/* Logo e título */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/20 mb-4">
                <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Área do Gestor
              </h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Acesse o sistema de chamados
              </p>
            </div>

            {/* Mensagem de erro */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              </div>
            )}

            {/* Formulário */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Campo usuário */}
              <div>
                <label
                  htmlFor="usuario"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Usuário
                </label>
                <input
                  id="usuario"
                  type="text"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  required
                  disabled={isLoading}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors text-gray-900 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Digite seu usuário"
                  autoComplete="username"
                />
              </div>

              {/* Campo senha */}
              <div>
                <label
                  htmlFor="senha"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Senha
                </label>
                <input
                  id="senha"
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  disabled={isLoading}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors text-gray-900 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Digite sua senha"
                  autoComplete="current-password"
                />
              </div>

              {/* Botão de login */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isLoading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Entrando...
                  </>
                ) : (
                  "Acessar Sistema"
                )}
              </button>
            </form>
          </div>
          <br />
        </div>
      </div>
    </div>
  )
}