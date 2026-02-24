import { NextRequest, NextResponse } from "next/server"
import db from "@/db/init"
import * as XLSX from "xlsx"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { filename, data, marcaId } = body

    if (!data || !marcaId) {
      return NextResponse.json({ error: "No se proporcionó archivo o marcaId" }, { status: 400 })
    }

    const buffer = Buffer.from(data, "base64")
    const workbook = XLSX.read(buffer, { type: "buffer" })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" })

    let inserted = 0
    let skipped = 0
    const errors: string[] = []

    const insertStmt = db.prepare(`INSERT INTO clientes (cedula, nombre, apellido, correo, telefono, marca_id) VALUES (?, ?, ?, ?, ?, ?)`)

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      // Normalizar keys
      const normalized: Record<string, any> = {}
      for (const key of Object.keys(row)) {
        const nk = key.toString().trim().toLowerCase().replace(/\s+/g, "_")
        normalized[nk] = row[key]
      }

      const cedula = (normalized.cedula || normalized.dni || normalized.id || "").toString().trim()
      const nombre = (normalized.nombre || "").toString().trim()
      const apellido = (normalized.apellido || "").toString().trim()
      const correo = (normalized.correo || normalized.email || "").toString().trim()
      const telefono = (normalized.telefono || normalized.telephone || normalized.phone || "").toString().trim()

      if (!cedula || !nombre || !apellido) {
        skipped++
        errors.push(`Fila ${i + 2}: faltan campos requeridos`)
        continue
      }

      try {
        const result = insertStmt.run(cedula, nombre, apellido, correo, telefono, marcaId)
        if (result.changes && result.changes > 0) inserted++
        else skipped++
      } catch (err: any) {
        skipped++
        errors.push(`Fila ${i + 2}: ${err.message}`)
      }
    }

    return NextResponse.json({ success: true, inserted, skipped, errors }, { status: 200 })
  } catch (error: any) {
    console.error("Error importando clientes:", error)
    return NextResponse.json({ error: "Error al procesar el archivo" }, { status: 500 })
  }
}
