import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const adminToken = request.cookies.get('admin_token')
  const gestorToken = request.cookies.get('gestor_token')
  
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')
  const isGestorRoute = request.nextUrl.pathname.startsWith('/gestor')
  const isLoginPage = request.nextUrl.pathname === '/admin/login' || 
                      request.nextUrl.pathname === '/gestor/login'

  // Rotas públicas de login
  if (isLoginPage) {
    // Se já tem token, redireciona para o respectivo dashboard
    if (adminToken && request.nextUrl.pathname === '/admin/login') {
      return NextResponse.redirect(new URL('/admin/autenticado/dashboard', request.url))
    }
    if (gestorToken && request.nextUrl.pathname === '/gestor/login') {
      return NextResponse.redirect(new URL('/gestor/autenticado/dashboard', request.url))
    }
    return NextResponse.next()
  }

  // Proteção de rotas admin
  if (isAdminRoute && !adminToken) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  // Proteção de rotas gestor
  if (isGestorRoute && !gestorToken) {
    return NextResponse.redirect(new URL('/gestor/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/gestor/:path*']
}