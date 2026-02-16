"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Cliente {
  id: number
  cedula: string
  nombre: string
  apellido: string
  correo?: string
  telefono?: string
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<Partial<Cliente>>({})
  const [editingId, setEditingId] = useState<number | null>(null)
  const [error, setError] = useState("")

  const fetchClientes = async () => {
    setLoading(true)
    const res = await fetch('/api/clientes')
    const data = await res.json()
    setClientes(data)
    setLoading(false)
  }

  useEffect(() => { fetchClientes() }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleCreate = async () => {
    setError("")
    try {
      const res = await fetch('/api/clientes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Error'); return }
      await fetchClientes()
      setForm({})
    } catch (err: any) { setError(err.message || 'Error') }
  }

  const handleUpdate = async () => {
    if (!editingId) return
    setError("")
    try {
      const res = await fetch('/api/clientes', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingId, ...form }) })
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Error'); return }
      setEditingId(null)
      setForm({})
      await fetchClientes()
    } catch (err: any) { setError(err.message || 'Error') }
  }

  const handleEditClick = (c: Cliente) => {
    setEditingId(c.id)
    setForm(c)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar cliente?')) return
    await fetch(`/api/clientes?id=${id}`, { method: 'DELETE' })
    await fetchClientes()
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Clientes</h2>
          <Link href="/dashboard"><Button variant="ghost">Volver</Button></Link>
        </div>

        <div className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div>
              <Label>Cédula</Label>
              <Input name="cedula" value={form.cedula || ''} onChange={handleChange} />
            </div>
            <div>
              <Label>Nombre</Label>
              <Input name="nombre" value={form.nombre || ''} onChange={handleChange} />
            </div>
            <div>
              <Label>Apellido</Label>
              <Input name="apellido" value={form.apellido || ''} onChange={handleChange} />
            </div>
            <div>
              <Label>Correo</Label>
              <Input name="correo" value={form.correo || ''} onChange={handleChange} />
            </div>
            <div>
              <Label>Teléfono</Label>
              <Input name="telefono" value={form.telefono || ''} onChange={handleChange} />
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            {editingId ? (
              <>
                <Button onClick={handleUpdate}>Guardar</Button>
                <Button variant="ghost" onClick={() => { setEditingId(null); setForm({}) }}>Cancelar</Button>
              </>
            ) : (
              <Button onClick={handleCreate}>Agregar cliente</Button>
            )}
          </div>

          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        </div>

        <div>
          {loading ? <p>Cargando...</p> : (
            <table className="w-full table-auto">
              <thead>
                <tr className="text-left">
                  <th>Cédula</th>
                  <th>Nombre</th>
                  <th>Apellido</th>
                  <th>Correo</th>
                  <th>Teléfono</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {clientes.map(c => (
                  <tr key={c.id} className="border-t">
                    <td className="py-2">{c.cedula}</td>
                    <td>{c.nombre}</td>
                    <td>{c.apellido}</td>
                    <td>{c.correo}</td>
                    <td>{c.telefono}</td>
                    <td className="py-2">
                      <div className="flex gap-2">
                        <Button variant="ghost" onClick={() => handleEditClick(c)}>Editar</Button>
                        <Button variant="destructive" onClick={() => handleDelete(c.id)}>Eliminar</Button>
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
