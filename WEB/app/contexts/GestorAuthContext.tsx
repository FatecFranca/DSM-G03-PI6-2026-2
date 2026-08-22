"use client"

import { createContext, useContext, useEffect, useState } from "react"
import Cookies from "js-cookie"
import { useRouter } from "next/navigation"
import { apiClient } from "@/lib/api"

interface GestorUser {
  GestorId: number
  GestorNome: string
  GestorEmail: string | null
  GestorCPF: string | null
  GestorUsuario: string
  GestorNivel: 'COMUM' | 'ADMINUNIDADE'
  GestorStatus: 'ATIVO' | 'INATIVO' | 'BLOQUEADO'
  Unidade: {
    UnidadeId: number
    UnidadeNome: string
    UnidadeStatus: string
  }
}

interface GestorAuthContextType {
  user: GestorUser | null
  token: string | null
  isLoading: boolean
  login: (usuario: string, senha: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
  isAdminUnidade: boolean
  checkAuth: () => boolean
}

const GestorAuthContext = createContext({} as GestorAuthContextType)

export function GestorAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<GestorUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isClient, setIsClient] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    // Só executar no cliente
    if (!isClient) return

    const loadStoredData = () => {
      try {
        const storedToken = Cookies.get("gestor_token")
        const storedUser = Cookies.get("gestor_user")

        if (storedToken && storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser)
            setToken(storedToken)
            setUser(parsedUser)
            //console.log('✅ Gestor autenticado:', parsedUser.GestorNome)
          } catch (error) {
            console.error('Erro ao parsear usuário:', error)
            // Limpar cookies corrompidos
            Cookies.remove("gestor_token")
            Cookies.remove("gestor_user")
          }
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadStoredData()
  }, [isClient])

  // NOVO: Função para verificar autenticação rapidamente
  const checkAuth = () => {
    if (!isClient) return false
    return !!token && !!user
  }

  const login = async (usuario: string, senha: string) => {
    try {
      const response = await apiClient.post('/gestor/login', {
        GestorUsuario: usuario,
        GestorSenha: senha
      })

      const { data } = response.data

      // Salvar nos cookies
      Cookies.set("gestor_token", data.token, { expires: 1 / 3 })
      Cookies.set("gestor_user", JSON.stringify(data.usuario), { expires: 1 / 3 })

      // ATUALIZAR O ESTADO ANTES DE REDIRECIONAR
      setToken(data.token)
      setUser(data.usuario)

      //console.log('✅ Login realizado com sucesso', data.usuario)

      // AGORA redirecionar (com um pequeno delay para garantir que o estado foi atualizado)
      setTimeout(() => {
        router.push("/gestor/autenticado/dashboard")
      }, 100)

    } catch (error: any) {
      console.error("Erro no login:", error)
      throw error
    }
  }

  const logout = () => {
    Cookies.remove("gestor_token")
    Cookies.remove("gestor_user")
    setToken(null)
    setUser(null)
    console.log('👋 Logout realizado')
    router.push("/gestor/login")
  }

  return (
    <GestorAuthContext.Provider value={{
      user,
      token,
      isLoading,
      login,
      logout,
      isAuthenticated: !!token,
      isAdminUnidade: user?.GestorNivel === 'ADMINUNIDADE',
      checkAuth 
    }}>
      {children}
    </GestorAuthContext.Provider>
  )
}

export const useGestorAuth = () => {
  const context = useContext(GestorAuthContext)
  if (!context) {
    throw new Error('useGestorAuth deve ser usado dentro de GestorAuthProvider')
  }
  return context
}