"use client"

import { type ChangeEvent, type FormEvent, useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import { useToast } from "@/hooks/use-toast"
import { Check, Pencil, Trash2, X } from "lucide-react"
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
  imagen_url?: string | null
  ejecutada: number
  created_at: string
}

interface Bot {
  id: number
  nombre: string
  slug: string
}

type CampaignUpsert = {
  nombre: string
  mensaje: string
  categoria_filter: string
  bot_id: number | null
  programada_para: string
  imagen_url: string | null
}

export default function CampaignsPage() {
  const { toast } = useToast()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [bots, setBots] = useState<Bot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userLabel, setUserLabel] = useState<string | null>(null)

  const [statusFilter, setStatusFilter] = useState<'todas' | 'pendientes' | 'ejecutadas'>('todas')

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<CampaignUpsert | null>(null)
  const [editImageFile, setEditImageFile] = useState<File | null>(null)
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null)

  const [form, setForm] = useState<CampaignUpsert>({
    nombre: '',
    mensaje: '',
    categoria_filter: '',
    bot_id: null,
    programada_para: '',
    imagen_url: null,
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const editFileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('usuario')
      if (raw) {
        const u = JSON.parse(raw)
        setUserRole(u?.rol || null)
        setUserLabel(u?.nombre || u?.correo || null)
      }
    } catch {
      // ignore
    }
    fetchCampaigns()
    fetchBots()
  }, [])

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>, mode: 'create' | 'edit') => {
    const file = e.target.files?.[0] ?? null
    if (!file) return
    const preview = URL.createObjectURL(file)
    if (mode === 'create') {
      setImageFile(file)
      setImagePreview(preview)
    } else {
      setEditImageFile(file)
      setEditImagePreview(preview)
    }
  }

  const removeImage = (mode: 'create' | 'edit') => {
    if (mode === 'create') {
      setImageFile(null)
      setImagePreview(null)
      setForm(prev => ({ ...prev, imagen_url: null }))
      if (fileInputRef.current) fileInputRef.current.value = ''
    } else {
      setEditImageFile(null)
      setEditImagePreview(null)
      if (editForm) setEditForm({ ...editForm, imagen_url: null })
      if (editFileInputRef.current) editFileInputRef.current.value = ''
    }
  }

  const uploadImage = async (file: File): Promise<string | null> => {
    const token = localStorage.getItem('token')
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/upload/campaign-image', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Error subiendo imagen')
    }
    const data = await res.json()
    return data.url as string
  }

  const runPendingCampaigns = async () => {
    setError('')
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/campaigns', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Error ejecutando campañas')
      } else {
        toast({
          title: data.count === 0 ? 'Sin campañas pendientes' : 'Campañas ejecutadas',
          description: data.count === 0
            ? 'No hay campañas pendientes por ejecutar.'
            : `${data.count} campaña(s) procesada(s) — ${data.sent} mensaje(s) enviado(s) por Telegram.`,
        })
        fetchCampaigns()
      }
    } catch (e: any) {
      setError(e.message || 'Error')
    }
  }

  const requestRunPendingCampaigns = async () => {
    setError('')
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/notificaciones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'request_run_campaigns',
          from: userLabel || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'No se pudo enviar la solicitud')
      } else {
        toast({
          title: 'Solicitud enviada',
          description: 'El super admin recibirá una notificación para ejecutar las campañas.',
        })
      }
    } catch (e: any) {
      setError(e.message || 'Error')
    }
  }

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

  const filteredCampaigns = useMemo(() => {
    if (statusFilter === 'pendientes') return campaigns.filter((c: Campaign) => !c.ejecutada)
    if (statusFilter === 'ejecutadas') return campaigns.filter((c: Campaign) => Boolean(c.ejecutada))
    return campaigns
  }, [campaigns, statusFilter])

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

  const getBotLabel = (botId: number | null | undefined) => {
    if (!botId) return 'Todos'
    const b = bots.find((x: Bot) => x.id === botId)
    return b ? b.nombre : String(botId)
  }

  const CATEGORIA_LABELS: Record<string, string> = { cold: 'Frío', warm: 'Tibio', hot: 'Caliente' }
  const getCategoriaLabel = (val: string | null | undefined) =>
    val ? (CATEGORIA_LABELS[val] ?? val) : '-'

  const formatFecha = (val: string | null | undefined) => {
    if (!val) return '-'
    return val.slice(0, 10)
  }

  const startEdit = (c: Campaign) => {
    setEditingId(c.id)
    setEditForm({
      nombre: c.nombre,
      mensaje: c.mensaje,
      categoria_filter: c.categoria_filter || '',
      bot_id: c.bot_id ?? null,
      programada_para: c.programada_para ? c.programada_para.slice(0, 10) : '',
      imagen_url: c.imagen_url ?? null,
    })
    setEditImageFile(null)
    setEditImagePreview(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm(null)
    setEditImageFile(null)
    setEditImagePreview(null)
  }

  const saveEdit = async (campaignId: number) => {
    if (!editForm) return
    setError('')

    if (userRole === 'manager' && !editForm.bot_id) {
      setError('Para managers, debes seleccionar un bot')
      return
    }

    try {
      const token = localStorage.getItem('token')

      let imagenUrl = editForm.imagen_url
      if (editImageFile) {
        imagenUrl = await uploadImage(editImageFile)
      }

      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nombre: editForm.nombre,
          mensaje: editForm.mensaje,
          categoria_filter: editForm.categoria_filter || null,
          bot_id: editForm.bot_id || null,
          programada_para: editForm.programada_para || null,
          imagen_url: imagenUrl || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Error actualizando campaña')
        return
      }

      setCampaigns((prev: Campaign[]) => prev.map((c: Campaign) => (c.id === campaignId ? data : c)))
      cancelEdit()
    } catch (e: any) {
      setError(e.message || 'Error')
    }
  }

  const deleteOne = async (campaignId: number) => {
    setError('')
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Error borrando campaña')
        return
      }
      if (!data.success) {
        setError('No se pudo borrar la campaña')
        return
      }
      setCampaigns((prev: Campaign[]) => prev.filter((c: Campaign) => c.id !== campaignId))
      if (editingId === campaignId) cancelEdit()
    } catch (e: any) {
      setError(e.message || 'Error')
    }
  }

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (userRole === 'manager' && !form.bot_id) {
      setError('Para managers, debes seleccionar un bot')
      return
    }

    try {
      const token = localStorage.getItem('token')

      let imagenUrl: string | null = null
      if (imageFile) {
        imagenUrl = await uploadImage(imageFile)
      }

      const body: any = {
        nombre: form.nombre,
        mensaje: form.mensaje,
      }
      if (form.categoria_filter) body.categoria_filter = form.categoria_filter
      if (form.bot_id) body.bot_id = form.bot_id
      if (form.programada_para) body.programada_para = form.programada_para
      if (imagenUrl) body.imagen_url = imagenUrl

      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Error creando campaña')
      } else {
        setForm({ nombre: '', mensaje: '', categoria_filter: '', bot_id: null, programada_para: '', imagen_url: null })
        setImageFile(null)
        setImagePreview(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
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
          {userRole === 'super_admin' ? (
            <Button onClick={runPendingCampaigns} className="mb-4" variant="secondary">
              Ejecutar campañas pendientes
            </Button>
          ) : (
            <Button onClick={requestRunPendingCampaigns} className="mb-4" variant="secondary">
              Solicitar ejecución al super admin
            </Button>
          )}
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
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setForm({ ...form, nombre: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="mensaje">Mensaje</Label>
                <Input
                  id="mensaje"
                  value={form.mensaje}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setForm({ ...form, mensaje: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="categoria_filter">Filtrar por categoría</Label>
                <Select
                  value={form.categoria_filter || "todas"}
                  onValueChange={(val: string) =>
                    setForm({ ...form, categoria_filter: val === "todas" ? "" : val })
                  }
                >
                  <SelectTrigger id="categoria_filter">
                    <SelectValue placeholder="Todas las categorías" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas las categorías</SelectItem>
                    <SelectItem value="cold">Frío</SelectItem>
                    <SelectItem value="warm">Tibio</SelectItem>
                    <SelectItem value="hot">Caliente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="bot_id">Bot</Label>
                <Select
                  value={form.bot_id ? String(form.bot_id) : (userRole === 'manager' ? undefined : "todos")}
                  onValueChange={(val: string) =>
                    setForm({
                      ...form,
                      bot_id: val === "todos" || val === "" ? null : Number(val),
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={userRole === 'manager' ? "Selecciona un bot" : "(todos los bots)"} />
                  </SelectTrigger>
                  <SelectContent>
                    {userRole !== 'manager' && <SelectItem value="todos">(todos)</SelectItem>}
                    {bots.map((b: Bot) => (
                      <SelectItem key={b.id} value={String(b.id)}>{b.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="programada_para">Programada para</Label>
                <Input
                  id="programada_para"
                  type="date"
                  value={form.programada_para}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setForm({ ...form, programada_para: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="imagen">Imagen (opcional)</Label>
                <Input
                  id="imagen"
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  ref={fileInputRef}
                  onChange={(e) => handleImageChange(e, 'create')}
                />
                {imagePreview && (
                  <div className="mt-2 flex items-center gap-3">
                    <Image src={imagePreview} alt="Vista previa" width={80} height={80} className="rounded object-cover" unoptimized />
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeImage('create')}>
                      Quitar imagen
                    </Button>
                  </div>
                )}
              </div>
              <div className="flex justify-end">
                <Button type="submit">Crear</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle>Campañas existentes</CardTitle>

              <div className="flex items-center gap-2">
                <Label className="text-sm">Mostrar</Label>
                <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val as 'todas' | 'pendientes' | 'ejecutadas')}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    <SelectItem value="pendientes">Pendientes</SelectItem>
                    <SelectItem value="ejecutadas">Ejecutadas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr>
                    <th className="px-2 py-1 text-left">ID</th>
                    <th className="px-2 py-1 text-left">Nombre</th>
                    <th className="px-2 py-1 text-left">Mensaje</th>
                    <th className="px-2 py-1 text-left">Imagen</th>
                    <th className="px-2 py-1 text-left">Bot</th>
                    <th className="px-2 py-1 text-left">Filtrar</th>
                    <th className="px-2 py-1 text-left">Programada</th>
                    <th className="px-2 py-1 text-left">Ejecutada</th>
                    <th className="px-2 py-1 text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCampaigns.map((c) => (
                    <tr key={c.id} className="border-t">
                      <td className="px-2 py-1">{c.id}</td>
                      {editingId === c.id && editForm ? (
                        <>
                          <td className="px-2 py-1">
                            <Input
                              value={editForm.nombre}
                              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                setEditForm({ ...editForm, nombre: e.target.value })
                              }
                            />
                          </td>
                          <td className="px-2 py-1">
                            <Input
                              value={editForm.mensaje}
                              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                setEditForm({ ...editForm, mensaje: e.target.value })
                              }
                            />
                          </td>
                          <td className="px-2 py-1">
                            <Input
                              type="file"
                              accept="image/jpeg,image/png,image/gif,image/webp"
                              ref={editFileInputRef}
                              onChange={(e) => handleImageChange(e, 'edit')}
                              className="w-40"
                            />
                            {(editImagePreview || editForm.imagen_url) && (
                              <div className="mt-1 flex items-center gap-2">
                                <Image
                                  src={editImagePreview ?? editForm.imagen_url!}
                                  alt="Vista previa"
                                  width={48}
                                  height={48}
                                  className="rounded object-cover"
                                  unoptimized
                                />
                                <button type="button" className="text-xs text-muted-foreground hover:text-destructive" onClick={() => removeImage('edit')}>
                                  Quitar
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="px-2 py-1">
                            <Select
                              value={editForm.bot_id ? String(editForm.bot_id) : (userRole === 'manager' ? undefined : "todos")}
                              onValueChange={(val: string) =>
                                setEditForm({
                                  ...editForm,
                                  bot_id: val === "todos" || val === "" ? null : Number(val),
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={userRole === 'manager' ? "Selecciona un bot" : "(todos los bots)"} />
                              </SelectTrigger>
                              <SelectContent>
                                {userRole !== 'manager' && <SelectItem value="todos">(todos)</SelectItem>}
                                {bots.map((b: Bot) => (
                                  <SelectItem key={b.id} value={String(b.id)}>{b.nombre}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-2 py-1">
                            <Select
                              value={editForm.categoria_filter || "todas"}
                              onValueChange={(val: string) =>
                                setEditForm({ ...editForm, categoria_filter: val === "todas" ? "" : val })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Todas las categorías" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="todas">Todas las categorías</SelectItem>
                                <SelectItem value="cold">Frío</SelectItem>
                                <SelectItem value="warm">Tibio</SelectItem>
                                <SelectItem value="hot">Caliente</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-2 py-1">
                            <Input
                              type="date"
                              value={editForm.programada_para}
                              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                setEditForm({ ...editForm, programada_para: e.target.value })
                              }
                            />
                          </td>
                          <td className="px-2 py-1">{c.ejecutada ? 'Sí' : 'No'}</td>
                          <td className="px-2 py-1">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => saveEdit(c.id)}>
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-10 w-10" onClick={cancelEdit}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-2 py-1">{c.nombre}</td>
                          <td className="px-2 py-1">{c.mensaje}</td>
                          <td className="px-2 py-1">
                            {c.imagen_url
                              ? <Image src={c.imagen_url} alt="imagen" width={40} height={40} className="rounded object-cover" unoptimized />
                              : <span className="text-muted-foreground text-xs">—</span>
                            }
                          </td>
                          <td className="px-2 py-1">{getBotLabel(c.bot_id)}</td>
                          <td className="px-2 py-1">{getCategoriaLabel(c.categoria_filter)}</td>
                          <td className="px-2 py-1">{formatFecha(c.programada_para)}</td>
                          <td className="px-2 py-1">{c.ejecutada ? 'Sí' : 'No'}</td>
                          <td className="px-2 py-1 text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10"
                                onClick={() => startEdit(c)}
                                disabled={userRole === 'manager' ? Boolean(c.ejecutada) : false}
                                aria-label="Editar"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10"
                                onClick={() => {
                                  if (confirm('¿Borrar esta campaña?')) deleteOne(c.id)
                                }}
                                aria-label="Borrar"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </td>
                        </>
                      )}
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
