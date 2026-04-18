"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Bot as BotIcon, Users, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Bot {
  id: number
  nombre: string
  slug: string
  estado: "activo" | "inactivo"
}

interface Usuario {
  id: number
  correo: string
  rol: string
  nombre?: string | null
  botsAsignados: Bot[]
}

export default function ManagerPage() {
  const router = useRouter()
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    verificarAuth()
  }, [])

  const verificarAuth = () => {
    const usuarioStr = localStorage.getItem("usuario")
    if (!usuarioStr) {
      router.push("/login")
      return
    }

    try {
      const user = JSON.parse(usuarioStr)
      if (user.rol !== "manager") {
        router.push("/dashboard")
        return
      }
      setUsuario(user)
    } catch {
      router.push("/login")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    )
  }

  if (!usuario) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Main content */}
      <main className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Bienvenido, {usuario.nombre || usuario.correo}
          </h1>
          <p className="text-muted-foreground">
            Gestiona tus bots y capturas de leads
          </p>
        </div>

        {/* Bots asignados */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Mis Bots</h2>
          
          {usuario.botsAsignados.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <p className="text-center text-muted-foreground">
                  No tienes bots asignados. Contacta al administrador.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {usuario.botsAsignados.map((bot) => (
                <Card key={bot.id} className="hover:bg-accent transition-colors">
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <BotIcon className="h-8 w-8 text-primary" />
                      <Badge
                        variant={bot.estado === "activo" ? "default" : "secondary"}
                      >
                        {bot.estado}
                      </Badge>
                    </div>
                    <CardTitle>{bot.nombre}</CardTitle>
                    <CardDescription>
                      <code className="bg-muted px-2 py-1 rounded text-xs">
                        {bot.slug}
                      </code>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-2">
                      <Link href={`/dashboard/manager/bot/${bot.slug}/clientes`}>
                        <Button variant="outline" className="w-full justify-start">
                          <Users className="mr-2 h-4 w-4" />
                          Ver Clientes
                        </Button>
                      </Link>
                      <Link href={`/dashboard/manager/bot/${bot.slug}/productos`}>
                        <Button variant="outline" className="w-full justify-start">
                          <Package className="mr-2 h-4 w-4" />
                          Ver Productos
                        </Button>
                      </Link>
                      <Link href={`/dashboard/manager/bot/${bot.slug}/marca`}>
                        <Button variant="outline" className="w-full justify-start">
                          <BotIcon className="mr-2 h-4 w-4" />
                          Configurar Marca
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
