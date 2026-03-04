import { NextRequest, NextResponse } from "next/server"
import db from "@/db/init"
import * as XLSX from "xlsx"

import pdf from "pdf-parse"
import mammoth from "mammoth"
import fetch from "node-fetch"
import { JSDOM } from "jsdom"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { filename, data, marcaId, text, url, replaceExisting } = body

    if (!marcaId) {
      return NextResponse.json({ error: "marcaId es requerido" }, { status: 400 })
    }

    // ensure marcaId refers to an existing marca; otherwise use null so FK doesn't fail
    const marcaRow = db.prepare(`SELECT id FROM marcas WHERE id = ?`).get(marcaId)
    const effectiveMarcaId = marcaRow ? marcaId : null

    // if the client asked to replace existing products, delete them first (use effective id)
    if (replaceExisting) {
      db.prepare(`DELETE FROM productos WHERE marca_id = ?`).run(effectiveMarcaId)
    }

    // helper to parse lines into productos
    function parseLines(lines: string[]): { nombre: string; precio: number }[] {
      const products: { nombre: string; precio: number }[] = []
      // match "name <sep> price" where sep can be hyphen, comma, semicolon, tab, pipe, with optional spaces
      const re = /(.+?)\s*[-\t,;|]+\s*([0-9]+(?:[\.,][0-9]+)?)/
      lines.forEach((raw, idx) => {
        const line = raw.trim()
        if (!line) return
        const m = line.match(re)
        if (m) {
          const nombre = m[1].trim()
          const precio = parseFloat(m[2].replace(',', '.'))
          if (nombre && !Number.isNaN(precio)) {
            products.push({ nombre, precio })
          }
        }
      })
      return products
    }

    let lines: string[] = []

    if (data && filename) {
      const buffer = Buffer.from(data, "base64")
      if (/\.(xlsx?|xls)$/i.test(filename)) {
        // spreadsheet
        const workbook = XLSX.read(buffer, { type: "buffer" })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" })
        // convert rows to text lines for reuse of parser
        rows.forEach((row) => {
          const nombre = row.nombre || row.producto || ''
          const precio = row.precio || row.price || ''
          if (nombre || precio) lines.push(`${nombre}\t${precio}`)
        })
      } else if (/\.pdf$/i.test(filename)) {
        const parsed = await pdf(buffer)
        lines = parsed.text.split(/\r?\n/)
      } else if (/\.docx?$/i.test(filename)) {
        const result = await mammoth.extractRawText({ buffer })
        lines = result.value.split(/\r?\n/)
      } else if (/\.html?$/i.test(filename)) {
        const dom = new JSDOM(buffer.toString())
        lines = dom.window.document.body.textContent?.split(/\r?\n/) || []
      } else {
        // plain text fallback
        lines = buffer.toString('utf-8').split(/\r?\n/)
      }
    } else if (text) {
      lines = text.split(/\r?\n/)
    } else if (url) {
      const resp = await fetch(url)
      const html = await resp.text()
      const dom = new JSDOM(html)
      lines = dom.window.document.body.textContent?.split(/\r?\n/) || []
    } else {
      return NextResponse.json({ error: "Se requiere archivo, texto o URL" }, { status: 400 })
    }

    const products = parseLines(lines)

    // find existing products for comparison
    const existingStmt = db.prepare(`SELECT id, nombre, precio FROM productos WHERE marca_id = ?`)
    const existing: {id:number,nombre:string,precio:number}[] = existingStmt.all(effectiveMarcaId)

    const added: typeof products = []
    const removed: typeof existing = []
    const updated: Array<{old:any,new:any}> = []

    // build map by nombre for existing
    const existingMap: Record<string,{id:number,precio:number}> = {}
    existing.forEach(e=>{ existingMap[e.nombre] = {id:e.id,precio:e.precio} })

    products.forEach(p=>{
      const e = existingMap[p.nombre]
      if (!e) {
        added.push(p)
      } else if (e.precio !== p.precio) {
        updated.push({old:e,new:p})
      }
      delete existingMap[p.nombre]
    })
    // remaining keys in existingMap are removed
    for (const name in existingMap) {
      const e=existingMap[name]
      removed.push({id:e.id,nombre:name,precio:e.precio})
    }

    let inserted = 0
    let skipped = 0
    const errors: string[] = []
    const insertStmt = db.prepare(`INSERT INTO productos (nombre, precio, marca_id) VALUES (?, ?, ?)`)

    products.forEach((p, idx) => {
      try {
        insertStmt.run(p.nombre, p.precio, effectiveMarcaId)
        inserted++
      } catch (err: any) {
        skipped++
        errors.push(`Línea ${idx + 1}: ${err.message}`)
      }
    })

    return NextResponse.json({ success: true, inserted, skipped, errors, diff:{added,removed,updated} }, { status: 200 })
  } catch (error: any) {
    console.error("Error importando productos:", error)
    return NextResponse.json({ error: "Error al procesar el archivo" }, { status: 500 })
  }
}
