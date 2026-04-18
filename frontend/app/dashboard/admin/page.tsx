"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Bot, Users, Key, BarChart3, Mail } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface Stats {
  totalBots: number
  totalUsuarios: number
  botsActivos: number
  totalLeads?: number
}

export default function AdminPage() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats>({
    totalBots: 0,
    totalUsuarios: 0,
    botsActivos: 0,
    totalLeads: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    verificarAuth()
    cargarEstadisticas()
  }, [])

  const verificarAuth = () => {
    const usuario = localStorage.getItem("usuario")
    if (!usuario) {
      router.push("/login")
      return
    }

    const user = JSON.parse(usuario)
    if (user.rol !== "super_admin") {
      router.push("/dashboard")
    }
  }

  const cargarEstadisticas = async () => {
    try {
      const token = localStorage.getItem("token")

      // Cargar bots
      const botsRes = await fetch("/api/bots", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const bots = await botsRes.json()

      // Cargar usuarios
      const usuariosRes = await fetch("/api/usuarios", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const usuarios = await usuariosRes.json()

      // Cargar leads
      const leadsRes = await fetch("/api/leads", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const leads = await leadsRes.json()

      setStats({
        totalBots: bots.length,
        totalUsuarios: usuarios.length,
        botsActivos: bots.filter((b: any) => b.estado === "activo").length,
        totalLeads: leads.length,
      })
    } catch (error) {
      console.error("Error cargando estadísticas:", error)
    } finally {
      setLoading(false)
    }
  }

  const menuItems = [
    {
      title: "Gestión de Bots",
      description: "Crea y administra los bots de Telegram",
      icon: Bot,
      href: "/dashboard/admin/bots",
      stat: `${stats.totalBots} bots`,
    },
    {
      title: "Gestión de Usuarios",
      description: "Administra administradores y managers",
      icon: Users,
      href: "/dashboard/admin/usuarios",
      stat: `${stats.totalUsuarios} usuarios`,
    },
    {
      title: "Gestión de Accesos",
      description: "Asigna bots a los managers",
      icon: Key,
      href: "/dashboard/admin/accesos",
      stat: "Permisos",
    },
    {
      title: "Gestión de Leads",
      description: "Ve todos los leads capturados por los bots",
      icon: Mail,
      href: "/dashboard/leads",
      stat: `${stats.totalLeads} leads`,
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Panel de Super Admin</h1>
        <p className="text-muted-foreground">
          Gestiona todos los aspectos de la plataforma LAIDA
        </p>
      </div>

      {/* Estadísticas */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bots</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBots}</div>
            <p className="text-xs text-muted-foreground">
              {stats.botsActivos} activos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsuarios}</div>
            <p className="text-xs text-muted-foreground">
              Admins y managers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estado</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Operativo</div>
            <p className="text-xs text-muted-foreground">
              Sistema funcionando
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Menú de opciones */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {menuItems.map((item) => {
          const Icon = item.icon
          return (
            <Link key={item.href} href={item.href}>
              <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <Icon className="h-8 w-8 text-primary" />
                    <span className="text-sm text-muted-foreground">
                      {item.stat}
                    </span>
                  </div>
                  <CardTitle>{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
