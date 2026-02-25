"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"


interface Producto {
  id: number
  nombre: string
  precio: number
}

interface ImportResult {
  inserted: number
  skipped: number
  errors: string[]
}

export default function ProductosAdminPage() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<Partial<Producto>>({})
  const [editingId, setEditingId] = useState<number | null>(null)
  const [error, setError] = useState("")
  const [marcaId, setMarcaId] = useState<number | null>(null)
  const [importLoading, setImportLoading] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
 
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
      const res = await fetch('/api/productos', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingId, ...form, marca_id: marcaId }) })
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Error'); return }
      setEditingId(null)
      setForm({})
      await fetchProductos(marcaId)
    } catch (err: any) { setError(err.message || 'Error') }
  }

  const handleEditClick = (p: Producto) => {
    setEditingId(p.id)
    setForm(p)
  }

  const handleDelete = async (id: number) => {
    await fetch(`/api/productos?id=${id}&marcaId=${marcaId}`, { method: 'DELETE' })
    await fetchProductos(marcaId)
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'].includes(file.type) && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setError('Por favor selecciona un archivo Excel (.xlsx o .xls)')
      return
    }

    if (!marcaId) {
      setError('marca_id no disponible')
      return
    }

    setImportLoading(true)
    setError("")
    setImportResult(null)

    try {
      const reader = new FileReader()
      reader.onload = async (event) => {
        try {
          const data = event.target?.result as ArrayBuffer
          const base64 = Buffer.from(data).toString('base64')

          const res = await fetch('/api/productos/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: file.name,
              data: base64,
              marcaId: marcaId
            })
          })

          const result = await res.json()

          if (!res.ok) {
            setError(result.error || 'Error al importar')
            return
          }

          setImportResult({
            inserted: result.inserted,
            skipped: result.skipped,
            errors: result.errors || []
          })

          await fetchProductos(marcaId)

          if (fileInputRef.current) {
            fileInputRef.current.value = ''
          }
        } catch (err: any) {
          setError(err.message || 'Error procesando archivo')
        } finally {
          setImportLoading(false)
        }
      }

      reader.onerror = () => {
        setError('Error al leer el archivo')
        setImportLoading(false)
      }

      reader.readAsArrayBuffer(file)
    } catch (err: any) {
      setError(err.message || 'Error')
      setImportLoading(false)
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Productos</h2>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleImportFile}
            className="hidden"
          />
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
              <>
                <Button onClick={handleCreate}>Agregar producto</Button>
                <Button onClick={triggerFileInput} disabled={importLoading} variant="outline">
                  {importLoading ? 'Importando...' : 'Importar desde Excel'}
                </Button>
              </>
            )}
          </div>

          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

          {importResult && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
              <h3 className="font-semibold text-blue-900 mb-2">Resumen de importación</h3>
              <p className="text-sm text-blue-800">✓ Insertados: <span className="font-semibold">{importResult.inserted}</span></p>
              <p className="text-sm text-blue-800">⊘ Saltados: <span className="font-semibold">{importResult.skipped}</span></p>
              {importResult.errors.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-orange-700 font-semibold">Errores detectados:</p>
                  <ul className="text-xs text-orange-700 list-disc list-inside mt-1">
                    {importResult.errors.slice(0, 5).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                    {importResult.errors.length > 5 && <li>... y {importResult.errors.length - 5} más</li>}
                  </ul>
                </div>
              )}
            </div>
          )}
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
