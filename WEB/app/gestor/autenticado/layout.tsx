"use client"

import { useState, useEffect } from "react"
import { useGestorAuth } from "@/app/contexts/GestorAuthContext"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { ThemeToggle } from "@/app/components/theme-toggle"

// Ícones
import {
  LayoutDashboard,
  Users,
  Settings,
  BarChart3,
  Briefcase,
  Hammer,
  User,
  BadgeCheck,
  Ticket,
  ClipboardList,
  LogOut,
  Menu,
  ChevronRight,
  ChevronLeft,
  UserCircle,
  Shield,
  FileText,
  Clock,
  Building2,
  Tags
} from "lucide-react"

interface MenuItem {
  title: string
  href: string
  icon: React.ReactNode
  adminOnly?: boolean
  comumOnly?: boolean
}

export default function GestorAutenticadoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const { user, logout, isAuthenticated, isLoading, isAdminUnidade } = useGestorAuth()
  const router = useRouter()
  const pathname = usePathname()

  /*console.log('🔍 Layout Autenticado - Estado:', { 
    isAuthenticated, 
    isLoading, 
    user: user?.GestorNome,
    isAdminUnidade,
    pathname 
  })*/

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Redirecionar se não estiver autenticado - com proteção contra loop
  useEffect(() => {
    //console.log('🔄 Verificando autenticação...', { isLoading, isAuthenticated, pathname })
    
    if (!isLoading) {
      if (!isAuthenticated) {
        //console.log('🚫 Não autenticado, redirecionando para login')
        router.push("/gestor/login")
      } else {
        //console.log('✅ Autenticado como:', user?.GestorNome)
      }
    }
  }, [isAuthenticated, isLoading, router, user?.GestorNome, pathname])

  if (!isClient || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    )
  }

  // Loading state
  if (isLoading) {
    //console.log('⏳ Mostrando loading...')
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    )
  }

  if (!isLoading) {
    
  }

  // Se não estiver autenticado, não renderiza nada (o useEffect redireciona)
  if (!isAuthenticated) {
    //console.log('🚫 Não autenticado, não renderizando layout')
    return null
  }

  //console.log('🎨 Renderizando layout com sidebar')

  // Menu items com caminhos relativos à pasta autenticado
  const menuItems: MenuItem[] = [
    {
      title: "Dashboard",
      href: "/gestor/autenticado/dashboard",
      icon: <LayoutDashboard size={20} />
    },
    {
      title: "Chamados",
      href: "/gestor/autenticado/chamados",
      icon: <Ticket size={20} />
    },
    {
      title: "Tipos Chamados",
      href: "/gestor/autenticado/tiposchamados",
      icon: <Tags size={20} />,
      adminOnly: true
    },
    {
      title: "Equipes",
      href: "/gestor/autenticado/equipes",
      icon: <Users size={20} />
    },
    {
      title: "Técnicos",
      href: "/gestor/autenticado/tecnicos",
      icon: <Hammer size={20} />
    },
    {
      title: "Pessoas",
      href: "/gestor/autenticado/pessoas",
      icon: <User size={20} />
    },
    {
      title: "Gestores",
      href: "/gestor/autenticado/gestores",
      icon: <BadgeCheck size={20} />,
      adminOnly: true
    },
    {
      title: "Departamentos",
      href: "/gestor/autenticado/departamentos",
      icon: <Briefcase size={20} />
    },
  ]

  // Filtrar itens do menu baseado no nível do gestor
  const filteredMenuItems = menuItems.filter(item => {
    if (item.adminOnly && !isAdminUnidade) return false
    if (item.comumOnly && isAdminUnidade) return false
    return true
  })

  const isActive = (href: string) => {
    return pathname === href || pathname?.startsWith(href + "/")
  }

  const currentMenuItem = filteredMenuItems.find(item => isActive(item.href))
  const currentTitle = currentMenuItem?.title || "Página"

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-30 h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800
        transition-all duration-300 ease-in-out
        ${sidebarOpen ? 'w-64' : 'w-20'}
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo area */}
        <div className={`
          h-16 flex items-center border-b border-gray-200 dark:border-gray-800
          ${sidebarOpen ? 'px-4' : 'px-0 justify-center'}
        `}>
          {sidebarOpen ? (
            <div>
              <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Gestor
              </span>
              <div className="flex items-center gap-1 mt-0.5">
                {isAdminUnidade ? (
                  <>
                    <Shield size={12} className="text-purple-600 dark:text-purple-400" />
                    <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                      ADMIN UNIDADE
                    </span>
                  </>
                ) : (
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                    GESTOR COMUM
                  </span>
                )}
              </div>
            </div>
          ) : (
            <span className="text-xl font-bold text-gray-900 dark:text-gray-100">G</span>
          )}
        </div>

        {/* Informações da unidade */}
        {sidebarOpen && user?.Unidade && (
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center gap-2">
              <Building2 size={14} className="text-gray-500 dark:text-gray-400" />
              <p className="text-xs text-gray-500 dark:text-gray-400">Unidade</p>
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate mt-1">
              {user.Unidade.UnidadeNome}
            </p>
          </div>
        )}

        {/* Navigation */}
        <nav className="h-[calc(100vh-8rem)] overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {filteredMenuItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`
                    flex items-center px-3 py-2 rounded-lg transition-colors relative group
                    ${isActive(item.href) 
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-200'
                    }
                  `}
                >
                  <span className="inline-flex items-center justify-center">
                    {item.icon}
                  </span>
                  {sidebarOpen && (
                    <span className="ml-3 text-sm font-medium">{item.title}</span>
                  )}
                  
                  {/* Tooltip */}
                  {!sidebarOpen && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                      {item.title}
                    </div>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Main content */}
      <div className={`
        transition-all duration-300 ease-in-out
        ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}
      `}>
        {/* Top bar */}
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
          <div className="flex items-center justify-between h-16 px-4">
            <div className="flex items-center gap-2">
              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 lg:hidden"
              >
                <Menu size={20} className="text-gray-600 dark:text-gray-400" />
              </button>

              {/* Desktop sidebar toggle */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="hidden lg:flex p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {sidebarOpen ? (
                  <ChevronLeft size={20} className="text-gray-600 dark:text-gray-400" />
                ) : (
                  <ChevronRight size={20} className="text-gray-600 dark:text-gray-400" />
                )}
              </button>

              {/* Breadcrumb */}
              <div className="ml-2">
                <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {currentTitle}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />

              {/* User menu */}
              <div className="relative user-menu">
                <button 
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation()
                    setDropdownOpen(!dropdownOpen)
                  }}
                >
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                    <UserCircle size={20} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {user?.GestorNome?.split(' ')[0] || 'Usuário'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {user?.Unidade?.UnidadeNome?.split(' ')[0] || '...'}
                    </p>
                  </div>
                </button>

                {/* Dropdown menu */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 py-1">
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {user?.GestorNome}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {user?.Unidade?.UnidadeNome}
                      </p>
                      <div className="mt-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          isAdminUnidade 
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        }`}>
                          {isAdminUnidade ? 'ADMIN UNIDADE' : 'GESTOR COMUM'}
                        </span>
                      </div>
                    </div>
                    <Link
                      href="/gestor/autenticado/perfil"
                      className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => setDropdownOpen(false)}
                    >
                      Meu Perfil
                    </Link>
                    <button
                      onClick={() => {
                        setDropdownOpen(false)
                        logout()
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
                    >
                      <LogOut size={16} />
                      Sair
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}