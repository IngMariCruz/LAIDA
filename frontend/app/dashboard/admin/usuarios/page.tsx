"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Pencil, Trash2, Shield, User } from "lucide-react"
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

interface Usuario {
  id: number
  correo: string
  rol: "super_admin" | "manager"
  nombre?: string | null
  created_at: string
}

export default function UsuariosPage() {
  const router = useRouter()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUsuario, setEditingUsuario] = useState<Usuario | null>(null)
  const [formData, setFormData] = useState({
    correo: "",
    password: "",
    rol: "super_admin" as "super_admin" | "manager",
    nombre: "",
    nombre_marca: "",
  })

  useEffect(() => {
    verificarAuth()
    cargarUsuarios()
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

  const cargarUsuarios = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch("/api/usuarios", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setUsuarios(data)
      } else {
        toast.error("Error al cargar usuarios")
      }
    } catch {
      toast.error("Error al cargar usuarios")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const token = localStorage.getItem("token")

      // Editar: siempre PUT /api/usuarios
      if (editingUsuario) {
        const body: Record<string, unknown> = {
          id: editingUsuario.id,
          correo: formData.correo,
          rol: formData.rol,
          nombre: formData.nombre || null,
        }
        if (formData.password) body.password = formData.password

        const response = await fetch("/api/usuarios", {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        })
        const data = await response.json()

        if (response.ok) {
          toast.success("Usuario actualizado exitosamente")
          setDialogOpen(false)
          resetForm()
          cargarUsuarios()
        } else {
          toast.error(data.error || "Error al actualizar usuario")
        }
        return
      }

      // Crear manager: POST /api/registro (crea usuario + marca)
      if (formData.rol === "manager") {
        if (!formData.nombre_marca) {
          toast.error("El nombre de la marca es requerido para managers")
          return
        }

        const response = await fetch("/api/registro", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            nombre_marca: formData.nombre_marca,
            nombre: formData.nombre || undefined,
            correo: formData.correo,
            password: formData.password,
          }),
        })
        const data = await response.json()

        if (response.ok) {
          toast.success("Manager y marca creados exitosamente")
          setDialogOpen(false)
          resetForm()
          cargarUsuarios()
        } else {
          toast.error(data.error || "Error al crear manager")
        }
        return
      }

      // Crear super_admin: POST /api/usuarios
      const response = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          correo: formData.correo,
          password: formData.password,
          rol: formData.rol,
          nombre: formData.nombre || null,
        }),
      })
      const data = await response.json()

      if (response.ok) {
        toast.success("Usuario creado exitosamente")
        setDialogOpen(false)
        resetForm()
        cargarUsuarios()
      } else {
        toast.error(data.error || "Error al crear usuario")
      }
    } catch {
      toast.error("Error al guardar usuario")
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar este usuario?")) return

    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/usuarios?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast.success("Usuario eliminado exitosamente")
        cargarUsuarios()
      } else {
        toast.error(data.error || "Error al eliminar usuario")
      }
    } catch {
      toast.error("Error al eliminar usuario")
    }
  }

  const resetForm = () => {
    setFormData({
      correo: "",
      password: "",
      rol: "super_admin",
      nombre: "",
      nombre_marca: "",
    })
    setEditingUsuario(null)
  }

  const handleEdit = (usuario: Usuario) => {
    setEditingUsuario(usuario)
    setFormData({
      correo: usuario.correo,
      password: "",
      rol: usuario.rol,
      nombre: usuario.nombre || "",
      nombre_marca: "",
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
          <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
          <p className="text-muted-foreground mt-1">
            Administra administradores y managers
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Crear Usuario
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingUsuario ? "Editar Usuario" : "Crear Nuevo Usuario"}
              </DialogTitle>
              <DialogDescription>
                {editingUsuario
                  ? "Modifica los datos del usuario"
                  : "Completa la información para crear un nuevo usuario"}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="correo">Correo Electrónico</Label>
                <Input
                  id="correo"
                  type="email"
                  value={formData.correo}
                  onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                  placeholder="correo@dominio.com"
                  required
                />
              </div>

              <div>
                <Label htmlFor="nombre">Nombre Completo</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Juan Pérez"
                />
              </div>

              <div>
                <Label htmlFor="password">
                  Contraseña {editingUsuario && "(dejar en blanco para no cambiar)"}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingUsuario ? "••••••••" : "Contraseña"}
                  required={!editingUsuario}
                />
              </div>

              <div>
                <Label>Rol</Label>
                <select
                  value={formData.rol}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      rol: e.target.value as "super_admin" | "manager",
                      nombre_marca: "",
                    })
                  }
                  className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="super_admin">Super Admin</option>
                  <option value="manager">Manager</option>
                </select>
              </div>

              {/* Campo nombre_marca: solo al crear un manager */}
              {!editingUsuario && formData.rol === "manager" && (
                <div>
                  <Label htmlFor="nombre_marca">Nombre de la marca</Label>
                  <Input
                    id="nombre_marca"
                    value={formData.nombre_marca}
                    onChange={(e) => setFormData({ ...formData, nombre_marca: e.target.value })}
                    placeholder="Mi Empresa"
                    required
                  />
                </div>
              )}

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
                  {editingUsuario ? "Actualizar" : "Crear Usuario"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usuarios Registrados</CardTitle>
          <CardDescription>
            Total: {usuarios.length} usuario{usuarios.length !== 1 && "s"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Correo</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Registrado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuarios.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No hay usuarios registrados
                  </TableCell>
                </TableRow>
              ) : (
                usuarios.map((usuario) => (
                  <TableRow key={usuario.id}>
                    <TableCell className="font-medium">{usuario.correo}</TableCell>
                    <TableCell>{usuario.nombre || "-"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          usuario.rol === "super_admin" ? "default" : "secondary"
                        }
                      >
                        {usuario.rol === "super_admin" ? (
                          <Shield className="mr-1 h-3 w-3" />
                        ) : (
                          <User className="mr-1 h-3 w-3" />
                        )}
                        {usuario.rol === "super_admin" ? "Super Admin" : "Manager"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(usuario.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(usuario)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(usuario.id)}
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
