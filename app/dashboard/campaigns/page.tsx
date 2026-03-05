"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Campaign {
  id: number
  nombre: string
  mensaje: string
  categoria_filter?: string | null
  bot_id?: number | null
  programada_para?: string | null
  ejecutada: number
  created_at: string
}

interface Bot {
  id: number
  nombre: string
  slug: string
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [bots, setBots] = useState<Bot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  const [form, setForm] = useState<{
    nombre: string
    mensaje: string
    categoria_filter: string
    bot_id: number | null
    programada_para: string
  }>({ nombre: '', mensaje: '', categoria_filter: '', bot_id: null, programada_para: '' })

  useEffect(() => {
    fetchCampaigns()
    fetchBots()
  }, [])

  const fetchCampaigns = async () => {
    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/campaigns', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (res.ok) {
        setCampaigns(data)
      } else {
        setError(data.error || 'Error cargando campañas')
      }
    } catch (err: any) {
      setError(err.message || 'Error')
    } finally {
      setLoading(false)
    }
  }

  const fetchBots = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/bots', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setBots(data)
      }
    } catch (e) {
      // ignore
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const token = localStorage.getItem('token')
      const body: any = {
        nombre: form.nombre,
        mensaje: form.mensaje,
      }
      if (form.categoria_filter) body.categoria_filter = form.categoria_filter
      if (form.bot_id) body.bot_id = form.bot_id
      if (form.programada_para) body.programada_para = form.programada_para
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Error creando campaña')
      } else {
        setForm({ nombre: '', mensaje: '', categoria_filter: '', bot_id: null, programada_para: '' })
        fetchCampaigns()
      }
    } catch (err: any) {
      setError(err.message || 'Error')
    }
  }

  if (loading) return <div className="flex items-center justify-center py-20">Cargando campañas...</div>

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Campañas automatizadas</h1>
          <p className="text-muted-foreground">
            Programa mensajes para grupos de leads según categoría o bot
          </p>
        </div>

        {error && <p className="text-red-600">{error}</p>}

        <div className="flex justify-end">
          <Button onClick={async () => {
            setError('')
            try {
              const token = localStorage.getItem('token')
              const res = await fetch('/api/campaigns', {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}` }
              })
              const data = await res.json()
              if (!res.ok) {
                setError(data.error || 'Error ejecutando campañas')
              } else {
                alert(`Procesadas ${data.count} campañas`)
                fetchCampaigns()
              }
            } catch (e: any) {
              setError(e.message || 'Error')
            }
          }} className="mb-4" variant="secondary">
            Ejecutar campañas pendientes
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Crear nueva campaña</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="mensaje">Mensaje</Label>
                <Input
                  id="mensaje"
                  value={form.mensaje}
                  onChange={(e) => setForm({ ...form, mensaje: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="categoria_filter">Filtrar por categoría (hot/warm/cold)</Label>
                <Input
                  id="categoria_filter"
                  value={form.categoria_filter}
                  onChange={(e) => setForm({ ...form, categoria_filter: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="bot_id">Bot</Label>
                <Select
                  onValueChange={(val) => setForm({ ...form, bot_id: val ? Number(val) : null })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="(todos los bots)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">(todos)</SelectItem>
                    {bots.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>{b.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="programada_para">Programada para</Label>
                <Input
                  id="programada_para"
                  type="datetime-local"
                  value={form.programada_para}
                  onChange={(e) => setForm({ ...form, programada_para: e.target.value })}
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit">Crear</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Campañas existentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr>
                    <th className="px-2 py-1 text-left">ID</th>
                    <th className="px-2 py-1 text-left">Nombre</th>
                    <th className="px-2 py-1 text-left">Mensaje</th>
                    <th className="px-2 py-1 text-left">Bot</th>
                    <th className="px-2 py-1 text-left">Filtrar</th>
                    <th className="px-2 py-1 text-left">Programada</th>
                    <th className="px-2 py-1 text-left">Ejecutada</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => (
                    <tr key={c.id} className="border-t">
                      <td className="px-2 py-1">{c.id}</td>
                      <td className="px-2 py-1">{c.nombre}</td>
                      <td className="px-2 py-1">{c.mensaje}</td>
                      <td className="px-2 py-1">{c.bot_id || 'Todos'}</td>
                      <td className="px-2 py-1">{c.categoria_filter || '-'}</td>
                      <td className="px-2 py-1">{c.programada_para || '-'}</td>
                      <td className="px-2 py-1">{c.ejecutada ? 'Sí' : 'No'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
