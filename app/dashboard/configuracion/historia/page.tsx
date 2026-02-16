"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export default function HistoriaPage() {
  const [historia, setHistoria] = useState("")
  const [comoSeCreo, setComoSeCreo] = useState("")
  const [loImportante, setLoImportante] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [usuarioId, setUsuarioId] = useState<number | null>(null)

  useEffect(() => {
    const u = localStorage.getItem('usuario')
    if (u) {
      try {
        const parsed = JSON.parse(u)
        setUsuarioId(parsed.id)
      } catch {
        setUsuarioId(null)
      }
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!usuarioId) return setError('Usuario no autenticado')
    setLoading(true)
    setError("")

    try {
      const fullHistoria = `Cómo se creó: ${comoSeCreo}\nImportante: ${loImportante}\nHistoria: ${historia}`

      const res = await fetch('/api/marcas/historia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marcaId: usuarioId, historia: fullHistoria })
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Error al guardar la historia')
      } else {
        // Ir a upload de productos
        window.location.href = '/dashboard/configuracion/productos'
      }
    } catch (err: any) {
      setError(err.message || 'Error al guardar la historia')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-secondary/30 bg-background/80 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-4">
          <Link href="/dashboard/configuracion" className="text-sm font-medium">
            Volver
          </Link>
        </nav>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>Cuéntanos de tu negocio</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>¿Cómo se creó?</Label>
                <Textarea value={comoSeCreo} onChange={(e: any) => setComoSeCreo(e.target.value)} placeholder="Breve descripción de cómo nació la marca" />
              </div>

              <div>
                <Label>¿Qué es lo más importante?</Label>
                <Textarea value={loImportante} onChange={(e: any) => setLoImportante(e.target.value)} placeholder="Qué valor aporta tu marca" />
              </div>

              <div>
                <Label>Historia completa</Label>
                <Textarea value={historia} onChange={(e: any) => setHistoria(e.target.value)} placeholder="Cuenta la historia de tu marca" />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Siguiente'}</Button>
                <Link href="/dashboard/configuracion"><Button variant="ghost">Cancelar</Button></Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
