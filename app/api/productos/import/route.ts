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

    const insertStmt = db.prepare(`INSERT INTO productos (nombre, precio, marca_id) VALUES (?, ?, ?)`)

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const normalized: Record<string, any> = {}
      for (const key of Object.keys(row)) {
        const nk = key.toString().trim().toLowerCase().replace(/\s+/g, "_")
        normalized[nk] = row[key]
      }

      const nombre = (normalized.nombre || normalized.producto || "").toString().trim()
      const precioRaw = (normalized.precio || normalized.price || "").toString().trim()
      const precio = parseFloat(precioRaw.toString().replace(/[^0-9.,-]/g, '').replace(',', '.'))

      if (!nombre || Number.isNaN(precio)) {
        skipped++
        errors.push(`Fila ${i + 2}: falta nombre o precio inválido`)
        continue
      }

      try {
        insertStmt.run(nombre, precio, marcaId)
        inserted++
      } catch (err: any) {
        skipped++
        errors.push(`Fila ${i + 2}: ${err.message}`)
      }
    }

    return NextResponse.json({ success: true, inserted, skipped, errors }, { status: 200 })
  } catch (error: any) {
    console.error("Error importando productos:", error)
    return NextResponse.json({ error: "Error al procesar el archivo" }, { status: 500 })
  }
}
