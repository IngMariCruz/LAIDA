"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
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

interface ImportResult {
  inserted: number
  skipped: number
  errors: string[]
}

export default function ManagerClientesPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<Partial<Cliente>>({})
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
      // Buscar el bot asignado que coincida con el slug
      const bot = user.botsAsignados?.find((b: any) => String(b.slug) === slug || String(b.id) === slug)
      if (bot) setMarcaId(bot.id)
      else setMarcaId(user.id)
    } catch { router.push("/login") }
  }, [slug])

  const fetchClientes = async () => {
    if (!marcaId) return
    setLoading(true)
    const res = await fetch(`/api/clientes?marcaId=${marcaId}`)
    const data = await res.json()
    setClientes(data)
    setLoading(false)
  }

  useEffect(() => { if (marcaId !== null) fetchClientes() }, [marcaId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleCreate = async () => {
    setError("")
    try {
      const res = await fetch("/api/clientes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, marcaId }) })
      if (!res.ok) { const d = await res.json(); setError(d.error || "Error"); return }
      await fetchClientes()
      setForm({})
    } catch (err: any) { setError(err.message || "Error") }
  }

  const handleUpdate = async () => {
    if (!editingId) return
    setError("")
    try {
      const res = await fetch("/api/clientes", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editingId, ...form, marcaId }) })
      if (!res.ok) { const d = await res.json(); setError(d.error || "Error"); return }
      setEditingId(null)
      setForm({})
      await fetchClientes()
    } catch (err: any) { setError(err.message || "Error") }
  }

  const handleDelete = async (id: number) => {
    await fetch(`/api/clientes?id=${id}&marcaId=${marcaId}`, { method: "DELETE" })
    await fetchClientes()
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
          const res = await fetch("/api/clientes/import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filename: file.name, data: base64, marcaId })
          })
          const result = await res.json()
          if (!res.ok) { setError(result.error || "Error al importar"); return }
          setImportResult({ inserted: result.inserted, skipped: result.skipped, errors: result.errors || [] })
          await fetchClientes()
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
          <h2 className="text-xl font-semibold">Clientes — {slug}</h2>
        </div>

        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImportFile} className="hidden" />

        <div className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div><Label>Cédula</Label><Input name="cedula" value={form.cedula || ""} onChange={handleChange} /></div>
            <div><Label>Nombre</Label><Input name="nombre" value={form.nombre || ""} onChange={handleChange} /></div>
            <div><Label>Apellido</Label><Input name="apellido" value={form.apellido || ""} onChange={handleChange} /></div>
            <div><Label>Correo</Label><Input name="correo" value={form.correo || ""} onChange={handleChange} /></div>
            <div><Label>Teléfono</Label><Input name="telefono" value={form.telefono || ""} onChange={handleChange} /></div>
          </div>
          <div className="mt-3 flex gap-2">
            {editingId ? (
              <>
                <Button onClick={handleUpdate}>Guardar</Button>
                <Button variant="ghost" onClick={() => { setEditingId(null); setForm({}) }}>Cancelar</Button>
              </>
            ) : (
              <>
                <Button onClick={handleCreate}>Agregar cliente</Button>
                <Button onClick={() => fileInputRef.current?.click()} disabled={importLoading} variant="outline">
                  {importLoading ? "Importando..." : "Importar desde Excel"}
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
                <tr className="text-left">
                  <th>Cédula</th><th>Nombre</th><th>Apellido</th><th>Correo</th><th>Teléfono</th><th></th>
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
                        <Button variant="ghost" onClick={() => { setEditingId(c.id); setForm(c) }}>Editar</Button>
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
