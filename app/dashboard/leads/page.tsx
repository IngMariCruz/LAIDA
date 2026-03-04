"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Clock, XCircle, Mail, Phone, Zap } from "lucide-react"

interface Lead {
  id: number
  bot_id?: number
  bot_slug?: string
  bot_nombre?: string
  interes: string
  email: string
  telefono: string
  telegram_user_id?: number
  estado: "nuevo" | "contactado" | "cerrado"
  created_at: string
}

export default function LeadsPage() {
  const router = useRouter()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedEstado, setSelectedEstado] = useState<string>("todos")
  const [stats, setStats] = useState({
    total: 0,
    nuevo: 0,
    contactado: 0,
    cerrado: 0,
  })

  useEffect(() => {
    verificarAuth()
    cargarLeads()
  }, [])

  const verificarAuth = () => {
    const usuario = localStorage.getItem("usuario")
    if (!usuario) {
      router.push("/login")
      return
    }
  }

  const cargarLeads = async () => {
    try {
      const token = localStorage.getItem("token")

      const res = await fetch("/api/leads", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (res.ok) {
        const data = await res.json()
        setLeads(data || [])

        // Calcular estadísticas
        const estadisticas = {
          total: data.length,
          nuevo: data.filter((l: Lead) => l.estado === "nuevo").length,
          contactado: data.filter((l: Lead) => l.estado === "contactado").length,
          cerrado: data.filter((l: Lead) => l.estado === "cerrado").length,
        }
        setStats(estadisticas)
      } else {
        console.error("Error cargando leads")
      }
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setLoading(false)
    }
  }

  const cambiarEstado = async (leadId: number, nuevoEstado: string) => {
    try {
      const token = localStorage.getItem("token")

      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ estado: nuevoEstado }),
      })

      if (res.ok) {
        setLeads((prev) =>
          prev.map((lead) =>
            lead.id === leadId ? { ...lead, estado: nuevoEstado as any } : lead
          )
        )
      }
    } catch (error) {
      console.error("Error actualizando lead:", error)
    }
  }

  const leadsFiltered = leads.filter((lead) => {
    const matchesSearch =
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.interes.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.telefono.includes(searchTerm)

    const matchesEstado =
      selectedEstado === "todos" || lead.estado === selectedEstado

    return matchesSearch && matchesEstado
  })

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case "nuevo":
        return <Clock className="h-4 w-4" />
      case "contactado":
        return <Zap className="h-4 w-4" />
      case "cerrado":
        return <CheckCircle className="h-4 w-4" />
      default:
        return null
    }
  }

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case "nuevo":
        return "bg-blue-50 text-blue-700 border-blue-200"
      case "contactado":
        return "bg-amber-50 text-amber-700 border-amber-200"
      case "cerrado":
        return "bg-green-50 text-green-700 border-green-200"
      default:
        return ""
    }
  }

  const getEstadoLabel = (estado: string) => {
    switch (estado) {
      case "nuevo":
        return "Nuevo"
      case "contactado":
        return "Contactado"
      case "cerrado":
        return "Cerrado"
      default:
        return estado
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">Cargando leads...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Leads</h1>
          <p className="text-muted-foreground">
            Gestiona todos los leads capturados por tus bots
          </p>
        </div>

        {/* Estadísticas */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Leads
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Nuevos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.nuevo}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Contactados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{stats.contactado}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Cerrados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.cerrado}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filtros</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar por email o teléfono</label>
              <Input
                placeholder="ejemplo@email.com o 1234567890"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Estado</label>
              <Select value={selectedEstado} onValueChange={setSelectedEstado}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="nuevo">Nuevo</SelectItem>
                  <SelectItem value="contactado">Contactado</SelectItem>
                  <SelectItem value="cerrado">Cerrado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Leads */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Leads ({leadsFiltered.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {leadsFiltered.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Sin leads que mostrar
              </div>
            ) : (
              <div className="space-y-3">
                {leadsFiltered.map((lead) => (
                  <div
                    key={lead.id}
                    className="border rounded-lg p-4 hover:bg-accent transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{lead.interes}</h3>
                          <Badge className={`${getEstadoColor(lead.estado)} border`}>
                            {getEstadoIcon(lead.estado)}
                            <span className="ml-1">{getEstadoLabel(lead.estado)}</span>
                          </Badge>
                        </div>
                        {lead.bot_nombre && (
                          <p className="text-sm text-muted-foreground">
                            Bot: {lead.bot_nombre}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {formatDate(lead.created_at)}
                        </p>
                      </div>
                      <Select
                        value={lead.estado}
                        onValueChange={(value) => cambiarEstado(lead.id, value)}
                      >
                        <SelectTrigger className="w-[150px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nuevo">Nuevo</SelectItem>
                          <SelectItem value="contactado">Contactado</SelectItem>
                          <SelectItem value="cerrado">Cerrado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm">
                      <a
                        href={`mailto:${lead.email}`}
                        className="flex items-center gap-2 text-primary hover:underline"
                      >
                        <Mail className="h-4 w-4" />
                        {lead.email}
                      </a>
                      <a
                        href={`tel:${lead.telefono}`}
                        className="flex items-center gap-2 text-primary hover:underline"
                      >
                        <Phone className="h-4 w-4" />
                        {lead.telefono}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
