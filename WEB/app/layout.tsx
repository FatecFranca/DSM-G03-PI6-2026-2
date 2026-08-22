import { ThemeProvider } from "next-themes"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { AuthProvider } from "@/app/contexts/AuthContext" // Provider do ADMIN
import { GestorAuthProvider } from "@/app/contexts/GestorAuthContext" // Provider do GESTOR
import "./globals.css";

export const metadata = {
  title: "Sistema Chamados",
  description: "Sistema de chamados para prefeituras",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* Ordem não importa, desde que ambos estejam disponíveis */}
          <AuthProvider>
            <GestorAuthProvider>
              {children}
            </GestorAuthProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}