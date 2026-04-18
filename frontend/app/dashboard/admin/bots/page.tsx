"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Pencil, Trash2, Power, PowerOff } from "lucide-react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

interface Bot {
  id: number
  nombre: string
  slug: string
  telegram_token: string
  openai_key?: string | null
  estado: "activo" | "inactivo"
  manager_id?: number | null
  created_at: string
}

export default function BotsPage() {
  const router = useRouter()
  const [bots, setBots] = useState<Bot[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingBot, setEditingBot] = useState<Bot | null>(null)
  const [formData, setFormData] = useState({
    nombre: "",
    slug: "",
    telegram_token: "",
    openai_key: "",
    estado: "activo" as "activo" | "inactivo",
  })

  useEffect(() => {
    verificarAuth()
    cargarBots()
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

  const cargarBots = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch("/api/bots", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setBots(data)
      } else {
        toast.error("Error al cargar bots")
      }
    } catch (error) {
      toast.error("Error al cargar bots")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const token = localStorage.getItem("token")
      const url = editingBot ? "/api/bots" : "/api/bots"
      const method = editingBot ? "PUT" : "POST"

      const body = editingBot
        ? { id: editingBot.id, ...formData }
        : formData

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(
          editingBot
            ? "Bot actualizado exitosamente"
            : "Bot creado exitosamente"
        )
        setDialogOpen(false)
        resetForm()
        cargarBots()
      } else {
        toast.error(data.error || "Error al guardar bot")
      }
    } catch (error) {
      toast.error("Error al guardar bot")
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar este bot?")) return

    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/bots?id=${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast.success("Bot eliminado exitosamente")
        cargarBots()
      } else {
        toast.error(data.error || "Error al eliminar bot")
      }
    } catch (error) {
      toast.error("Error al eliminar bot")
    }
  }

  const handleToggleEstado = async (bot: Bot) => {
    try {
      const token = localStorage.getItem("token")
      const nuevoEstado = bot.estado === "activo" ? "inactivo" : "activo"

      const response = await fetch("/api/bots", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: bot.id,
          estado: nuevoEstado,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(
          `Bot ${nuevoEstado === "activo" ? "activado" : "desactivado"}`
        )
        cargarBots()
      } else {
        toast.error(data.error || "Error al cambiar estado del bot")
      }
    } catch (error) {
      toast.error("Error al cambiar estado del bot")
    }
  }

  const resetForm = () => {
    setFormData({
      nombre: "",
      slug: "",
      telegram_token: "",
      openai_key: "",
      estado: "activo",
    })
    setEditingBot(null)
  }

  const handleEdit = (bot: Bot) => {
    setEditingBot(bot)
    setFormData({
      nombre: bot.nombre,
      slug: bot.slug,
      telegram_token: bot.telegram_token,
      openai_key: bot.openai_key || "",
      estado: bot.estado,
    })
    setDialogOpen(true)
  }

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
          <h1 className="text-3xl font-bold">Gestión de Bots</h1>
          <p className="text-muted-foreground mt-1">
            Crea y administra los bots de Telegram
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Crear Bot
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingBot ? "Editar Bot" : "Crear Nuevo Bot"}
              </DialogTitle>
              <DialogDescription>
                {editingBot
                  ? "Modifica los datos del bot"
                  : "Completa la información para crear un nuevo bot"}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="nombre">Nombre del Bot</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) =>
                    setFormData({ ...formData, nombre: e.target.value })
                  }
                  placeholder="Bot de Ingeniería"
                  required
                />
              </div>

              <div>
                <Label htmlFor="slug">
                  ID (slug) {editingBot && "(no editable)"}
                </Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      slug: e.target.value.toLowerCase().replace(/\s+/g, "-"),
                    })
                  }
                  placeholder="default"
                  required
                  disabled={!!editingBot}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Solo letras minúsculas, números y guiones
                </p>
              </div>

              <div>
                <Label htmlFor="telegram_token">Telegram Token</Label>
                <Input
                  id="telegram_token"
                  value={formData.telegram_token}
                  onChange={(e) =>
                    setFormData({ ...formData, telegram_token: e.target.value })
                  }
                  placeholder="123:ABC"
                  required
                  type="password"
                />
              </div>

              <div>
                <Label htmlFor="openai_key">OpenAI API Key (opcional)</Label>
                <Input
                  id="openai_key"
                  value={formData.openai_key}
                  onChange={(e) =>
                    setFormData({ ...formData, openai_key: e.target.value })
                  }
                  placeholder="sk-..."
                  type="password"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false)
                    resetForm()
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingBot ? "Actualizar" : "Crear Bot"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bots Registrados</CardTitle>
          <CardDescription>
            Total: {bots.length} bot{bots.length !== 1 && "s"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Creado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bots.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No hay bots registrados
                  </TableCell>
                </TableRow>
              ) : (
                bots.map((bot) => (
                  <TableRow key={bot.id}>
                    <TableCell className="font-medium">{bot.nombre}</TableCell>
                    <TableCell>
                      <code className="bg-muted px-2 py-1 rounded text-sm">
                        {bot.slug}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={bot.estado === "activo" ? "default" : "secondary"}
                      >
                        {bot.estado}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(bot.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleEstado(bot)}
                          title={
                            bot.estado === "activo" ? "Desactivar" : "Activar"
                          }
                        >
                          {bot.estado === "activo" ? (
                            <PowerOff className="h-4 w-4" />
                          ) : (
                            <Power className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(bot)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(bot.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
