"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
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

export default function ManagerProductosPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

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
    const u = localStorage.getItem("usuario")
    if (!u) { router.push("/login"); return }
    try {
      const user = JSON.parse(u)
      if (user.rol !== "manager") { router.push("/dashboard"); return }

      const bot = (user.botsAsignados ?? []).find(
        (b: any) => String(b.slug) === slug || String(b.id) === slug
      )

      const mid = bot ? bot.id : (!isNaN(Number(slug)) ? Number(slug) : user.id)
      setMarcaId(mid)
      fetchProductos(mid)
    } catch { router.push("/login") }
  }, [slug])

  const fetchProductos = async (id?: number | null) => {
    const mid = id ?? marcaId
    if (!mid) return
    setLoading(true)
    const res = await fetch(`/api/productos?marcaId=${mid}`)
    const data = await res.json()
    if (res.ok) setProductos(data)
    else setError(data.error || "Error cargando productos")
    setLoading(false)
  }


  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleCreate = async () => {
    setError("")
    try {
      const res = await fetch("/api/productos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, precio: Number(form.precio), marca_id: marcaId }) })
      if (!res.ok) { const d = await res.json(); setError(d.error || "Error"); return }
      await fetchProductos()
      setForm({})
    } catch (err: any) { setError(err.message || "Error") }
  }

  const handleUpdate = async () => {
    if (!editingId) return
    setError("")
    try {
      const res = await fetch("/api/productos", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editingId, ...form, marca_id: marcaId }) })
      if (!res.ok) { const d = await res.json(); setError(d.error || "Error"); return }
      setEditingId(null)
      setForm({})
      await fetchProductos(marcaId)
    } catch (err: any) { setError(err.message || "Error") }
  }

  const handleDelete = async (id: number) => {
    await fetch(`/api/productos?id=${id}&marcaId=${marcaId}`, { method: "DELETE" })
    await fetchProductos(marcaId)
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !marcaId) return
    setImportLoading(true)
    setError("")
    setImportResult(null)
    try {
      const reader = new FileReader()
      reader.onload = async (event) => {
        try {
          const data = event.target?.result as ArrayBuffer
          const base64 = Buffer.from(data).toString("base64")
          const res = await fetch("/api/productos/import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filename: file.name, data: base64, marcaId })
          })
          const result = await res.json()
          if (!res.ok) { setError(result.error || "Error al importar"); return }
          setImportResult({ inserted: result.inserted, skipped: result.skipped, errors: result.errors || [] })
          await fetchProductos(marcaId)
          if (fileInputRef.current) fileInputRef.current.value = ""
        } catch (err: any) { setError(err.message || "Error procesando archivo") }
        finally { setImportLoading(false) }
      }
      reader.onerror = () => { setError("Error al leer el archivo"); setImportLoading(false) }
      reader.readAsArrayBuffer(file)
    } catch (err: any) { setError(err.message || "Error"); setImportLoading(false) }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/dashboard/manager">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Volver
            </Button>
          </Link>
          <h2 className="text-xl font-semibold">Productos — {slug}</h2>
        </div>

        <input ref={fileInputRef} type="file" accept="*/*" onChange={handleImportFile} className="hidden" />

        <div className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div><Label>Nombre</Label><Input name="nombre" value={form.nombre || ""} onChange={handleChange} /></div>
            <div><Label>Precio</Label><Input name="precio" value={form.precio || ""} onChange={handleChange} /></div>
            <div><Label>Descripción</Label><Input name="descripcion" value={(form as any).descripcion || ""} onChange={handleChange} /></div>
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
                <Button onClick={() => fileInputRef.current?.click()} disabled={importLoading} variant="outline">
                  {importLoading ? "Importando..." : "Importar archivo"}
                </Button>
              </>
            )}
          </div>
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
          {importResult && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm text-blue-800">Insertados: <strong>{importResult.inserted}</strong> | Saltados: <strong>{importResult.skipped}</strong></p>
            </div>
          )}
        </div>

        <div>
          {loading ? <p>Cargando...</p> : (
            <table className="w-full table-auto">
              <thead>
                <tr className="text-left"><th>Nombre</th><th>Precio</th><th>Descripción</th><th></th></tr>
              </thead>
              <tbody>
                {productos.map(p => (
                  <tr key={p.id} className="border-t">
                    <td className="py-2">{p.nombre}</td>
                    <td>{p.precio}</td>
                    <td>{p.descripcion || "-"}</td>
                    <td className="py-2">
                      <div className="flex gap-2">
                        <Button variant="ghost" onClick={() => { setEditingId(p.id); setForm(p) }}>Editar</Button>
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
