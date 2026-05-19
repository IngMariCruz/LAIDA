"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2, User, Bot as BotIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

interface Usuario {
  id: number
  correo: string
  rol: "super_admin" | "manager"
  nombre?: string | null
}

interface Bot {
  id: number
  nombre: string
  slug: string
  estado: "activo" | "inactivo"
  manager_id?: number | null
}

interface Asignacion {
  usuario: Usuario
  bots: Bot[]
}

export default function AccesosPage() {
  const router = useRouter()
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [bots, setBots] = useState<Bot[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    usuarioId: "",
    botId: "",
  })

  useEffect(() => {
    verificarAuth()
    cargarDatos()
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
      toast.error("No tienes permisos para acceder a esta página")
    }
  }

  const cargarDatos = async () => {
    try {
      const token = localStorage.getItem("token")

      // Cargar usuarios
      const usuariosRes = await fetch("/api/usuarios", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const usuariosData = await usuariosRes.json()
      const managers = usuariosData.filter((u: Usuario) => u.rol === "manager")
      setUsuarios(managers)

      // Cargar bots
      const botsRes = await fetch("/api/bots", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const botsData = await botsRes.json()
      setBots(botsData)

      // Cargar asignaciones para cada manager
      const asignacionesPromises = managers.map(async (usuario: Usuario) => {
        const res = await fetch(`/api/accesos?usuarioId=${usuario.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        return {
          usuario,
          bots: data.bots || [],
        }
      })

      const asignacionesData = await Promise.all(asignacionesPromises)
      setAsignaciones(asignacionesData)
    } catch (error) {
      toast.error("Error al cargar datos")
    } finally {
      setLoading(false)
    }
  }

  const handleAsignar = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.usuarioId || !formData.botId) {
      toast.error("Selecciona un usuario y un bot")
      return
    }

    try {
      const token = localStorage.getItem("token")
      const response = await fetch("/api/accesos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          usuarioId: parseInt(formData.usuarioId),
          botId: parseInt(formData.botId),
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success("Bot asignado exitosamente")
        setDialogOpen(false)
        setFormData({ usuarioId: "", botId: "" })
        cargarDatos()
      } else {
        toast.error(data.error || "Error al asignar bot")
      }
    } catch (error) {
      toast.error("Error al asignar bot")
    }
  }

  const handleRemover = async (usuarioId: number, botId: number) => {
    if (!confirm("¿Estás seguro de remover este acceso?")) return

    try {
      const token = localStorage.getItem("token")
      const response = await fetch(
        `/api/accesos?usuarioId=${usuarioId}&botId=${botId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      const data = await response.json()

      if (response.ok && data.success) {
        toast.success("Acceso removido exitosamente")
        cargarDatos()
      } else {
        toast.error(data.error || "Error al remover acceso")
      }
    } catch (error) {
      toast.error("Error al remover acceso")
    }
  }

  // Mapa de botId → nombre del manager que lo tiene asignado
  const botsAsignados = new Map<number, { managerId: number; managerNombre: string }>()
  asignaciones.forEach(({ usuario, bots: botsDelManager }) => {
    botsDelManager.forEach((bot) => {
      botsAsignados.set(bot.id, {
        managerId: usuario.id,
        managerNombre: usuario.nombre || usuario.correo,
      })
    })
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Accesos</h1>
          <p className="text-muted-foreground mt-1">
            Asigna bots a los managers
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Asignar Bot
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Asignar Bot a Manager</DialogTitle>
              <DialogDescription>
                Selecciona un manager y un bot para asignar el acceso
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAsignar} className="space-y-4">
              <div>
                <Label htmlFor="usuario">Manager</Label>
                <Select
                  value={formData.usuarioId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, usuarioId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un manager" />
                  </SelectTrigger>
                  <SelectContent>
                    {usuarios.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No hay managers disponibles
                      </SelectItem>
                    ) : (
                      usuarios.map((usuario) => (
                        <SelectItem key={usuario.id} value={usuario.id.toString()}>
                          {usuario.nombre || usuario.correo}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="bot">Bot</Label>
                <Select
                  value={formData.botId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, botId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un bot" />
                  </SelectTrigger>
                  <SelectContent>
                    {bots.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No hay bots disponibles
                      </SelectItem>
                    ) : (
                      bots.map((bot) => {
                        const asignado = botsAsignados.get(bot.id)
                        const asignadoAOtro =
                          asignado && asignado.managerId !== Number(formData.usuarioId)
                        return (
                          <SelectItem
                            key={bot.id}
                            value={bot.id.toString()}
                            disabled={!!asignadoAOtro}
                          >
                            {bot.nombre} ({bot.slug})
                            {asignadoAOtro
                              ? ` — asignado a ${asignado?.managerNombre}`
                              : ""}
                          </SelectItem>
                        )
                      })
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false)
                    setFormData({ usuarioId: "", botId: "" })
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit">Asignar</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {asignaciones.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground">
                No hay managers con accesos asignados
              </p>
            </CardContent>
          </Card>
        ) : (
          asignaciones.map((asignacion) => (
            <Card key={asignacion.usuario.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {asignacion.usuario.nombre || asignacion.usuario.correo}
                </CardTitle>
                <CardDescription>{asignacion.usuario.correo}</CardDescription>
              </CardHeader>
              <CardContent>
                {asignacion.bots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No tiene bots asignados
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bot</TableHead>
                        <TableHead>ID</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {asignacion.bots.map((bot) => (
                        <TableRow key={bot.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <BotIcon className="h-4 w-4" />
                              {bot.nombre}
                            </div>
                          </TableCell>
                          <TableCell>
                            <code className="bg-muted px-2 py-1 rounded text-sm">
                              {bot.slug}
                            </code>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                bot.estado === "activo" ? "default" : "secondary"
                              }
                            >
                              {bot.estado}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                handleRemover(asignacion.usuario.id, bot.id)
                              }
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
