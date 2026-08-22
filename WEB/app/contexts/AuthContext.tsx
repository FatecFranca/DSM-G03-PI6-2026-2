"use client"

import { createContext, useContext, useEffect, useState } from "react"
import Cookies from "js-cookie"
import axios from "axios"
import { apiClient } from "@/lib/api"
import { useRouter } from "next/navigation"

interface AdminUser {
  AdministradorId: number
  AdministradorUsuario: string
}

interface AuthContextType {
  user: AdminUser | null
  token: string | null
  isLoading: boolean
  login: (usuario: string, senha: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext({} as AuthContextType)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Verificar se existe token salvo ao iniciar
    const storedToken = Cookies.get("admin_token")
    const storedUser = Cookies.get("admin_user")

    if (storedToken && storedUser) {
      setToken(storedToken)
      setUser(JSON.parse(storedUser))
    }
    
    setIsLoading(false)
  }, [])

  const login = async (usuario: string, senha: string) => {
    try {
      setIsLoading(true)
      
      const response = await apiClient.post("/admin/login", {
        AdministradorUsuario: usuario,
        AdministradorSenha: senha
      })

      const { data } = response.data
      
      // Salvar nos cookies
      Cookies.set("admin_token", data.token, { expires: 1/3 }) // 8 horas
      Cookies.set("admin_user", JSON.stringify(data.usuario), { expires: 1/3 })
      
      setToken(data.token)
      setUser(data.usuario)
      
      // Redirecionar para dashboard
      router.push("/admin//autenticado/dashboard")
      
    } catch (error: any) {
      console.error("Erro no login:", error)
      
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error)
      } else {
        throw new Error("Erro ao fazer login. Tente novamente.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    Cookies.remove("admin_token")
    Cookies.remove("admin_user")
    setToken(null)
    setUser(null)
    router.push("/admin/login")
  }

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isLoading,
      login,
      logout,
      isAuthenticated: !!token
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)