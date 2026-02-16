"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Producto {
  id: number
  nombre: string
  precio: number
}

export default function ProductosAdminPage() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<Partial<Producto>>({})
  const [editingId, setEditingId] = useState<number | null>(null)
  const [error, setError] = useState("")
  const [marcaId, setMarcaId] = useState<number | null>(null)
 
  useEffect(() => {
    const u = localStorage.getItem('usuario')
    if (!u) {
      window.location.href = '/login'
      return
    }

    let id: number | null = null
    try { id = JSON.parse(u).id } catch { id = null }
    if (id === null) {
      window.location.href = '/login'
      return
    }
    setMarcaId(id)
    fetchProductos(id)
  }, [])

  const fetchProductos = async (id?: number | null) => {
    setLoading(true)
    const params = id ? `?marcaId=${id}` : ''
    const res = await fetch(`/api/productos${params}`)
    const data = await res.json()
    setProductos(data)
    setLoading(false)
  }

  useEffect(() => { if (marcaId !== null) fetchProductos(marcaId) }, [marcaId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleCreate = async () => {
    setError("")
    try {
      const body = { ...form, precio: Number(form.precio), marca_id: marcaId }
      const res = await fetch('/api/productos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Error'); return }
      await fetchProductos()
      setForm({})
    } catch (err: any) { setError(err.message || 'Error') }
  }

  const handleUpdate = async () => {
    if (!editingId) return
    setError("")
    try {
      const res = await fetch('/api/productos', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingId, ...form }) })
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Error'); return }
      setEditingId(null)
      setForm({})
      await fetchProductos()
    } catch (err: any) { setError(err.message || 'Error') }
  }

  const handleEditClick = (p: Producto) => {
    setEditingId(p.id)
    setForm(p)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar producto?')) return
    await fetch(`/api/productos?id=${id}`, { method: 'DELETE' })
    await fetchProductos()
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Productos</h2>
          <Link href="/dashboard"><Button variant="ghost">Volver</Button></Link>
        </div>

        <div className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div>
              <Label>Nombre</Label>
              <Input name="nombre" value={form.nombre || ''} onChange={handleChange} />
            </div>
            <div>
              <Label>Precio</Label>
              <Input name="precio" value={form.precio || ''} onChange={handleChange} />
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            {editingId ? (
              <>
                <Button onClick={handleUpdate}>Guardar</Button>
                <Button variant="ghost" onClick={() => { setEditingId(null); setForm({}) }}>Cancelar</Button>
              </>
            ) : (
              <Button onClick={handleCreate}>Agregar producto</Button>
            )}
          </div>

          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        </div>

        <div>
          {loading ? <p>Cargando...</p> : (
            <table className="w-full table-auto">
              <thead>
                <tr className="text-left">
                  <th>Nombre</th>
                  <th>Precio</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {productos.map(p => (
                  <tr key={p.id} className="border-t">
                    <td className="py-2">{p.nombre}</td>
                    <td>{p.precio}</td>
                    <td className="py-2">
                      <div className="flex gap-2">
                        <Button variant="ghost" onClick={() => handleEditClick(p)}>Editar</Button>
                        <Button variant="destructive" onClick={() => handleDelete(p.id)}>Eliminar</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
