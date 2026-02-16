"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function ConfiguracionPage() {
  const [hasDB, setHasDB] = useState<boolean | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState("")

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files && e.target.files[0]
    if (f) setFile(f)
  }

  const arrayBufferToBase64 = async (buffer: ArrayBuffer) => {
    let binary = ""
    const bytes = new Uint8Array(buffer)
    const len = bytes.byteLength
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return window.btoa(binary)
  }

  const handleUpload = async () => {
    if (!file) return setError("Selecciona un archivo")
    setLoading(true)
    setError("")

    try {
      const buffer = await file.arrayBuffer()
      const base64 = await arrayBufferToBase64(buffer)

      const response = await fetch("/api/clientes/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, data: base64 }),
      })

      const data = await response.json()
      if (!response.ok) {
        setError(data.error || "Error al subir el archivo")
      } else {
        setResult(data)
      }
    } catch (err: any) {
      setError(err.message || "Error al subir el archivo")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-secondary/30 bg-background/80 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-4">
          <Link href="/dashboard" className="text-sm font-medium">
            Volver al dashboard
          </Link>
        </nav>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>Configuración inicial</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">¿Tienes base de datos de tus clientes?</p>
              <div className="flex gap-2">
                <Button onClick={() => setHasDB(true)}>Sí</Button>
                <Button variant="ghost" onClick={() => setHasDB(false)}>No</Button>
              </div>

              {hasDB === true && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Sube un archivo Excel (xlsx, xls) o CSV con las columnas: Cedula, Nombre, Apellido, Correo, Telefono</p>
                  <input type="file" accept=".xlsx,.xls,.csv" onChange={onFileChange} />
                  <div className="flex gap-2">
                    <Button onClick={handleUpload} disabled={!file || loading}>
                      {loading ? "Subiendo..." : "Subir y procesar"}
                    </Button>
                    <Link href="/dashboard">
                      <Button variant="ghost">Cancelar</Button>
                    </Link>
                  </div>

                  {error && <p className="text-sm text-red-600">{error}</p>}

                  {result && (
                    <div className="rounded-lg bg-green-50 p-3">
                      <p className="font-medium">Importación completada</p>
                      <p>Insertados: {result.inserted}</p>
                      <p>Omitidos: {result.skipped}</p>
                      {result.errors && result.errors.length > 0 && (
                        <div>
                          <p className="font-medium mt-2">Errores:</p>
                          <ul className="list-disc ml-6">
                            {result.errors.map((err: string, idx: number) => (
                              <li key={idx} className="text-sm text-muted-foreground">{err}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {hasDB === false && (
                <div>
                  <p className="text-sm text-muted-foreground">Puedes crear clientes manualmente más adelante desde el panel.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
