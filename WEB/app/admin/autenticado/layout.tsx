"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/app/contexts/AuthContext"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ThemeToggle } from "@/app/components/theme-toggle"

import {
  LayoutDashboard,
  Tags,
  Building2,
  LogOut,
  Menu,
  ChevronRight,
  ChevronLeft,
  UserCircle
} from "lucide-react"

interface MenuItem {
  title: string
  href: string
  icon: React.ReactNode
  submenu?: MenuItem[]
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user, logout, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/admin/login")
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  const menuItems: MenuItem[] = [
    {
      title: "Dashboard",
      href: "/admin/autenticado/dashboard",
      icon: <LayoutDashboard size={20} />
    },
    {
      title: "Unidades",
      href: "/admin/autenticado/unidades",
      icon: <Building2 size={20} />
    },
    {
      title: "Gestores",
      href: "/admin/autenticado/gestores",
      icon: <UserCircle size={20} />
    },
    {
      title: "Tipos Chamados",
      href: "/admin/autenticado/tiposchamados",
      icon: <Tags size={20} />
    }
  ]

  const isActive = (href: string) => {
    return pathname === href || pathname?.startsWith(href + "/")
  }

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
            <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Sistema<span className="text-gray-500 dark:text-gray-400"> Chamados</span>
            </span>
          ) : (
            <span className="text-xl font-bold text-gray-900 dark:text-gray-100">A</span>
          )}
        </div>

        {/* Navigation */}
        <nav className="h-[calc(100vh-4rem)] overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {menuItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`
                    flex items-center px-3 py-2 rounded-lg transition-colors relative group
                    ${isActive(item.href) 
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100' 
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
                  
                  {/* Tooltip quando sidebar está fechada */}
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
                  {menuItems.find(item => isActive(item.href))?.title || "Página"}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />

              {/* User menu */}
              <div className="relative group">
                <button className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                  <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    <UserCircle size={20} className="text-gray-600 dark:text-gray-400" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:block">
                    {user?.AdministradorUsuario}
                  </span>
                </button>

                {/* Dropdown menu */}
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-800">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Logado como</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {user?.AdministradorUsuario}
                    </p>
                  </div>
                  <Link
                    href="/admin/autenticado/perfil"
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    Meu Perfil
                  </Link>
                  <button
                    onClick={logout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
                  >
                    <LogOut size={16} />
                    Sair
                  </button>
                </div>
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