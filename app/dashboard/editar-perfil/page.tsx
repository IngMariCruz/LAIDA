"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function EditarPerfilPage() {
  const router = useRouter()
  const [nombre, setNombre] = useState("")
  const [correo, setCorreo] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [usuarioId, setUsuarioId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    const u = localStorage.getItem("usuario")
    if (!u) { router.push("/login"); return }
    try {
      const user = JSON.parse(u)
      setUsuarioId(user.id)
      setNombre(user.nombre || "")
      setCorreo(user.correo || "")
    } catch { router.push("/login") }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (password && password !== confirmPassword) {
      setError("Las contraseñas no coinciden.")
      return
    }

    setLoading(true)
    try {
      const body: any = { id: usuarioId, nombre, correo }
      if (password) body.password = password

      const res = await fetch("/api/usuarios", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (!res.ok) { setError(data.error || "Error al guardar"); return }

      // Actualizar localStorage
      const u = localStorage.getItem("usuario")
      if (u) {
        const user = JSON.parse(u)
        localStorage.setItem("usuario", JSON.stringify({ ...user, nombre, correo }))
      }

      setPassword("")
      setConfirmPassword("")
      setSuccess("Perfil actualizado correctamente.")
    } catch (err: any) {
      setError(err.message || "Error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-lg mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Editar perfil</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="nombre">Nombre</Label>
                <Input id="nombre" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Tu nombre" />
              </div>
              <div>
                <Label htmlFor="correo">Correo</Label>
                <Input id="correo" type="email" value={correo} onChange={e => setCorreo(e.target.value)} placeholder="tu@correo.com" />
              </div>
              <div>
                <Label htmlFor="password">Nueva contraseña</Label>
                <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Dejar en blanco para no cambiar" />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                <Input id="confirmPassword" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repetir nueva contraseña" />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
              {success && <p className="text-sm text-green-600">{success}</p>}

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Guardando..." : "Guardar cambios"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
