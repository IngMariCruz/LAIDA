"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Clock, Mail, Phone, Zap } from "lucide-react"

interface Lead {
  id: number
  nombre?: string | null
  bot_id?: number
  bot_slug?: string
  bot_nombre?: string
  interes?: string | null
  email?: string | null
  telefono?: string | null
  telegram_user_id?: number
  estado: "nuevo" | "contactado" | "cerrado"
  categoria?: "hot" | "warm" | "cold" | null
  producto_id?: number | null
  actualizado_en?: string | null
  created_at: string
}

interface Producto {
  id: number
  nombre: string
}

export default function LeadsPage() {
  const router = useRouter()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedEstado, setSelectedEstado] = useState<string>("todos")
  const [selectedProducto, setSelectedProducto] = useState<string>("todos")
  const [productos, setProductos] = useState<Producto[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [stats, setStats] = useState({
    total: 0,
    nuevo: 0,
    contactado: 0,
    cerrado: 0,
  })

  useEffect(() => {
    verificarAuth()
    cargarLeads()
    cargarProductos()
    const interval = setInterval(() => {
      cargarLeads({ silent: true })
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    setPage(1)
  }, [searchTerm, selectedEstado, selectedProducto, pageSize])

  const verificarAuth = () => {
    const usuario = localStorage.getItem("usuario")
    if (!usuario) {
      router.push("/login")
    }
  }

  const cargarProductos = async () => {
    try {
      const rawUser = localStorage.getItem("usuario")
      if (!rawUser) return

      const parsed = JSON.parse(rawUser) as { id?: number }
      const marcaId = parsed?.id
      if (!marcaId) return

      const token = localStorage.getItem("token")
      const res = await fetch(`/api/productos?marcaId=${marcaId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (res.ok) {
        const data = await res.json()
        setProductos(Array.isArray(data) ? data : [])
      }
    } catch {
      // ignore
    }
  }

  const cargarLeads = async (opts?: { silent?: boolean }) => {
    try {
      if (!opts?.silent) setLoading(true)
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
      if (!opts?.silent) setLoading(false)
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
        setLeads((prev: Lead[]) =>
          prev.map((lead: Lead) =>
            lead.id === leadId ? { ...lead, estado: nuevoEstado as any } : lead
          )
        )
      }
    } catch (error) {
      console.error("Error actualizando lead:", error)
    }
  }

  const productosById = useMemo(() => {
    const map = new Map<number, Producto>()
    for (const p of productos) map.set(p.id, p)
    return map
  }, [productos])

  const leadsFiltered = useMemo(() => {
    const term = searchTerm.toLowerCase()
    const selectedProductId = selectedProducto !== "todos" && selectedProducto !== "sin" ? Number(selectedProducto) : null
    const selectedProductName = selectedProductId ? (productosById.get(selectedProductId)?.nombre || "") : ""
    const selectedProductNameLower = selectedProductName.toLowerCase()

    return leads.filter((lead: Lead) => {
      const nombre = (lead.nombre || "").toLowerCase()
      const email = (lead.email || "").toLowerCase()
      const interes = (lead.interes || "").toLowerCase()
      const telefono = lead.telefono || ""

      const matchesSearch =
        nombre.includes(term) ||
        email.includes(term) ||
        interes.includes(term) ||
        telefono.includes(searchTerm)

      const matchesEstado =
        selectedEstado === "todos" || lead.estado === selectedEstado

      const matchesProducto =
        selectedProducto === "todos" ||
        (selectedProducto === "sin"
          ? !lead.producto_id
          : (lead.producto_id !== null && lead.producto_id !== undefined && Number(lead.producto_id) === selectedProductId) ||
            (!lead.producto_id && selectedProductNameLower !== "" && interes === selectedProductNameLower))

      return matchesSearch && matchesEstado && matchesProducto
    })
  }, [leads, searchTerm, selectedEstado, selectedProducto, productosById])

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(leadsFiltered.length / pageSize))
  }, [leadsFiltered.length, pageSize])

  useEffect(() => {
    setPage((prev: number) => Math.min(Math.max(1, prev), totalPages))
  }, [totalPages])

  const leadsPaginated = useMemo(() => {
    const start = (page - 1) * pageSize
    return leadsFiltered.slice(start, start + pageSize)
  }, [leadsFiltered, page, pageSize])

  const getCategoriaBadgeVariant = (categoria?: Lead["categoria"]) => {
    switch (categoria) {
      case "hot":
        return "destructive" as const
      case "warm":
        return "secondary" as const
      case "cold":
      default:
        return "outline" as const
    }
  }

  const getCategoriaLabel = (categoria?: Lead["categoria"]) => {
    switch (categoria) {
      case "hot":
        return "CALIENTE"
      case "warm":
        return "TIBIO"
      case "cold":
      default:
        return "FRÍO"
    }
  }

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
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label htmlFor="lead-search" className="text-sm font-medium">Buscar por nombre, email o teléfono</label>
              <Input
                id="lead-search"
                placeholder="Nombre, email o teléfono"
                value={searchTerm}
                onChange={(e: any) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="lead-estado" className="text-sm font-medium">Estado</label>
              <Select value={selectedEstado} onValueChange={setSelectedEstado}>
                <SelectTrigger id="lead-estado">
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
            <div className="space-y-2">
              <label htmlFor="lead-producto" className="text-sm font-medium">Producto</label>
              <Select value={selectedProducto} onValueChange={setSelectedProducto}>
                <SelectTrigger id="lead-producto">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="sin">Sin producto</SelectItem>
                  {productos.map((p: Producto) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Leads */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-lg">Leads ({leadsFiltered.length})</CardTitle>

              {leadsFiltered.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Ver</span>
                    <Select value={String(pageSize)} onValueChange={(v: string) => setPageSize(Number(v))}>
                      <SelectTrigger className="w-[90px] h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p: number) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    Anterior
                  </Button>

                  <span className="text-sm text-muted-foreground">
                    Página {page} de {totalPages}
                  </span>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p: number) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    Siguiente
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {leadsFiltered.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Sin leads que mostrar
              </div>
            ) : (
              <div className="space-y-3">
                {leadsPaginated.map((lead: Lead) => (
                  <div
                    key={lead.id}
                    className="border rounded-lg p-4 hover:bg-accent transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {lead.nombre && lead.nombre !== 'lead1' ? (
                            <h3 className="font-semibold">{lead.nombre}</h3>
                          ) : (
                            <h3 className="font-semibold italic text-muted-foreground">Nombre pendiente</h3>
                          )}
                          <Badge variant={getCategoriaBadgeVariant(lead.categoria)}>
                            {getCategoriaLabel(lead.categoria)}
                          </Badge>
                          <Badge className={`${getEstadoColor(lead.estado)} border`}>
                            {getEstadoIcon(lead.estado)}
                            <span className="ml-1">{getEstadoLabel(lead.estado)}</span>
                          </Badge>
                        </div>
                        {lead.interes && (
                          <p className="text-sm text-muted-foreground">
                            Interés: {lead.interes}
                          </p>
                        )}
                        {lead.producto_id ? (
                          <p className="text-sm text-muted-foreground">
                            Producto: {productosById.get(lead.producto_id)?.nombre || `#${lead.producto_id}`}
                          </p>
                        ) : null}
                        {lead.bot_nombre && (
                          <p className="text-sm text-muted-foreground">
                            Bot: {lead.bot_nombre}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {formatDate((lead.actualizado_en || lead.created_at) as string)}
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
                      {lead.email && lead.email !== 'lead@laida.com' ? (
                        <a
                          href={`mailto:${lead.email}`}
                          className="flex items-center gap-2 text-primary hover:underline"
                        >
                          <Mail className="h-4 w-4" />
                          {lead.email}
                        </a>
                      ) : (
                        <span className="flex items-center gap-2 text-muted-foreground italic">
                          <Mail className="h-4 w-4" />
                          Sin datos reales aún
                        </span>
                      )}
                      {lead.telefono && lead.telefono !== '00000000' ? (
                        <a
                          href={`tel:${lead.telefono}`}
                          className="flex items-center gap-2 text-primary hover:underline"
                        >
                          <Phone className="h-4 w-4" />
                          {lead.telefono}
                        </a>
                      ) : (
                        <span className="flex items-center gap-2 text-muted-foreground italic">
                          <Phone className="h-4 w-4" />
                          Sin datos reales aún
                        </span>
                      )}
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
