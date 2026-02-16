"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface Usuario {
  id: number
  nombreMarca: string
  correoEmpresa: string
  nombreRepresentante: string
  numero: string
  correoPersonal: string
}

export default function DashboardPage() {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Obtener datos del usuario del localStorage
    const usuarioStr = localStorage.getItem("usuario")
    if (usuarioStr) {
      try {
        setUsuario(JSON.parse(usuarioStr))
      } catch {
        window.location.href = "/login"
      }
    } else {
      window.location.href = "/login"
    }
    setLoading(false)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("usuario")
    localStorage.removeItem("token")
    window.location.href = "/"
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    )
  }

  if (!usuario) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="border-b border-secondary/30 bg-background/80 backdrop-blur-xl sticky top-0">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <span className="text-lg font-bold text-primary-foreground">L</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">
              LAID<span className="text-secondary">A</span>
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">{usuario.nombreRepresentante}</p>
              <p className="text-xs text-muted-foreground">{usuario.correoEmpresa}</p>
            </div>
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </Button>
          </div>
        </nav>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Bienvenido, {usuario.nombreRepresentante}
          </h1>
          <p className="text-muted-foreground">
            Esta es tu área de control de LAIDA
          </p>
          <div className="mt-4">
            <Link href="/dashboard/configuracion">
              <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-full px-4 py-2 font-semibold">
                Iniciar configuración
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Información de la empresa */}
          <Card>
            <CardHeader>
              <CardTitle>Información de tu empresa</CardTitle>
              <CardDescription>Datos de registro de {usuario.nombreMarca}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Nombre de la marca</p>
                <p className="font-medium text-foreground">{usuario.nombreMarca}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Correo de la empresa</p>
                <p className="font-medium text-foreground">{usuario.correoEmpresa}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Correo personal</p>
                <p className="font-medium text-foreground">{usuario.correoPersonal}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Teléfono</p>
                <p className="font-medium text-foreground">{usuario.numero}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
