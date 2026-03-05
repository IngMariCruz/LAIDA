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
  descripcion?: string
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
  const [importMode, setImportMode] = useState<'file' | 'text' | 'url'>('file')
  const [importText, setImportText] = useState('')
  const [importUrl, setImportUrl] = useState('')
  const [replaceExisting, setReplaceExisting] = useState(false)
 
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
    setError('')
    const params = id ? `?marcaId=${id}` : ''
    const res = await fetch(`/api/productos${params}`)
    const data = await res.json()
    if (res.ok) {
      setProductos(data)
    } else {
      // show server error
      setError(data.error || 'Error cargando productos')
      setProductos([])
    }
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
              marcaId: marcaId,
              replaceExisting
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

  const handleImportText = async () => {
    if (!importText.trim()) return
    if (!marcaId) {
      setError('marca_id no disponible')
      return
    }
    setImportLoading(true)
    setError("")
    setImportResult(null)
    try {
      const res = await fetch('/api/productos/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: importText, marcaId, replaceExisting })
      })
      const result = await res.json()
      if (!res.ok) {
        setError(result.error || 'Error al importar')
      } else {
        setImportResult({ inserted: result.inserted, skipped: result.skipped, errors: result.errors || [] })
        await fetchProductos(marcaId)
      }
    } catch (err: any) {
      setError(err.message || 'Error')
    } finally {
      setImportLoading(false)
    }
  }

  const handleImportUrl = async () => {
    if (!importUrl.trim()) return
    if (!marcaId) {
      setError('marca_id no disponible')
      return
    }
    setImportLoading(true)
    setError("")
    setImportResult(null)
    try {
      const res = await fetch('/api/productos/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importUrl, marcaId, replaceExisting })
      })
      const result = await res.json()
      if (!res.ok) {
        setError(result.error || 'Error al importar')
      } else {
        setImportResult({ inserted: result.inserted, skipped: result.skipped, errors: result.errors || [] })
        await fetchProductos(marcaId)
      }
    } catch (err: any) {
      setError(err.message || 'Error')
    } finally {
      setImportLoading(false)
    }
  }


  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Productos</h2>
          <Link href={`/dashboard/productos/atributos?marcaId=${marcaId}`}>
            <Button variant="outline" size="sm">
              Gestionar Atributos
            </Button>
          </Link>
        </div>
        <div className="flex gap-4 items-center mt-2">
          <label className="inline-flex items-center">
            <input
              type="radio"
              name="importMode"
              value="file"
              checked={importMode === 'file'}
              onChange={() => setImportMode('file')}
              className="mr-1"
            />
            Archivo
          </label>
          <label className="inline-flex items-center">
            <input
              type="radio"
              name="importMode"
              value="text"
              checked={importMode === 'text'}
              onChange={() => setImportMode('text')}
              className="mr-1"
            />
            Texto / HTML
          </label>
          <label className="inline-flex items-center">
            <input
              type="radio"
              name="importMode"
              value="url"
              checked={importMode === 'url'}
              onChange={() => setImportMode('url')}
              className="mr-1"
            />
            URL
          </label>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="*/*"
          onChange={handleImportFile}
          className="hidden"
        />

        {/* import controls */}
        <div className="mb-4">
          {importMode === 'file' && (
            <>
              <Button onClick={triggerFileInput} disabled={importLoading}>
                {importLoading ? 'Importando...' : 'Seleccionar archivo'}
              </Button>
              <p className="text-xs text-muted-foreground mt-1">
                Puedes subir Excel, CSV, PDF o Word. El sistema extrae nombre, precio y descripción/ características automáticamente.
              </p>
            </>
          )}
          <div className="mt-2">
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={replaceExisting}
                onChange={(e) => setReplaceExisting(e.target.checked)}
                className="mr-1"
              />
              Reemplazar productos existentes
            </label>
          </div>

          {importMode === 'text' && (
            <textarea
              className="w-full h-32 p-2 border rounded"
              placeholder="Pega aquí texto separado por líneas: nombre - precio"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />
          )}

          {importMode === 'url' && (
            <Input
              placeholder="https://ejemplo.com/productos"
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
            />
          )}

          {importMode !== 'file' && (
            <div className="mt-2">
              <Button
                onClick={importMode === 'text' ? handleImportText : handleImportUrl}
                disabled={importLoading}
              >
                {importLoading ? 'Importando...' : 'Importar'}
              </Button>
            </div>
          )}
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
            <div>
              <Label>Descripción</Label>
              <Input name="descripcion" value={(form as any).descripcion || ''} onChange={handleChange} />
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
          {/* display current marcaId for debugging */}
          {marcaId !== null && <p className="text-xs text-muted-foreground mt-1">marcaId: {marcaId}</p>}

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
              {/* diff */}
              {importResult.diff && (
                <div className="mt-4">
                  <h4 className="font-semibold">Cambios detectados</h4>
                  {importResult.diff.added.length > 0 && (
                    <div>
                      <p className="text-sm">Nuevos:</p>
                      <ul className="list-disc list-inside text-xs">
                        {importResult.diff.added.map((p,i)=>(
                          <li key={i}>
                            <strong>{p.nombre}</strong> - {p.precio}
                            {p.descripcion && <span>: {p.descripcion}</span>}
                            {p.caracteristicas && p.caracteristicas.length > 0 && (
                              <ul className="ml-4 list-disc">
                                {p.caracteristicas.map((c:any,j)=>(<li key={j} className="text-xs">{c}</li>))}
                              </ul>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {importResult.diff.updated.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm">Actualizados:</p>
                      <ul className="list-disc list-inside text-xs">
                        {importResult.diff.updated.map((u,i)=>(
                          <li key={i}>
                            <strong>{u.old.nombre}</strong>:
                            {u.old.precio} → {u.new.precio}
                            {u.new.descripcion && <div className="text-xs">Desc: {u.new.descripcion}</div>}
                            {u.new.caracteristicas && u.new.caracteristicas.length>0 && (
                              <div className="text-xs">
                                Características:
                                <ul className="ml-4 list-disc">
                                  {u.new.caracteristicas.map((c:any,j)=>(<li key={j}>{c}</li>))}
                                </ul>
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {importResult.diff.removed.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm">Eliminados:</p>
                      <ul className="list-disc list-inside text-xs">
                        {importResult.diff.removed.map((p,i)=>(<li key={i}>{p.nombre} - {p.precio}</li>))}
                      </ul>
                    </div>
                  )}
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
                  <th>Descripción</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {productos.map(p => (
                  <tr key={p.id} className="border-t">
                    <td className="py-2">{p.nombre}</td>
                    <td>{p.precio}</td>
                    <td>{p.descripcion || '-'}</td>
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
