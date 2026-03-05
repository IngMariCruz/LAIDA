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

    // helper to convert array of lines or raw text into product objects including description
    function parseTextToProducts(text: string): { nombre: string; precio: number; descripcion?: string; caracteristicas?: string[] }[] {
      const results: { nombre: string; precio: number; descripcion?: string; caracteristicas?: string[] }[] = []
      // split into sections separated by empty lines - each section may describe one product
      const sections = text.split(/\r?\n\s*\r?\n/) // blank line

      sections.forEach((section) => {
        const lines = section.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
        if (lines.length === 0) return

        let nombre = ''
        let precio: number | null = null
        const descripcionParts: string[] = []
        const caracteristicas: string[] = []

        const reNamePrice = /(.+?)\s*[-\t,;|]+\s*([0-9]+(?:[\.,][0-9]+)?)/

        lines.forEach((line) => {
          const low = line.toLowerCase()
          if (low.startsWith('nombre:')) {
            nombre = line.split(/:\s*/)[1].trim()
          } else if (low.startsWith('precio:')) {
            precio = parseFloat(line.split(/:\s*/)[1].replace(',', '.'))
          } else if (low.startsWith('descripci')) {
            descripcionParts.push(line.split(/:\s*/)[1].trim())
          } else if (line.includes(':') && !low.startsWith('nombre:') && !low.startsWith('precio:') && !low.startsWith('descripci')) {
            // any other key:value is treated as característica
            caracteristicas.push(line)
          } else if (!nombre && !precio) {
            // try match on same line
            const m = line.match(reNamePrice)
            if (m) {
              nombre = m[1].trim()
              precio = parseFloat(m[2].replace(',', '.'))
            } else {
              // if still nothing, treat as potential description
              descripcionParts.push(line)
            }
          } else {
            // otherwise this line is part of description
            descripcionParts.push(line)
          }
        })

        if (nombre && precio !== null && !Number.isNaN(precio)) {
          const product: any = { nombre, precio, descripcion: descripcionParts.join(' ') || undefined }
          if (caracteristicas.length) product.caracteristicas = caracteristicas
          results.push(product)
        }
      })

      return results
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

    // join lines to raw text and parse into structured products
    const rawText = lines.join('\n')
    const products = parseTextToProducts(rawText)

    // find existing products for comparison
    const existingStmt = db.prepare(`SELECT id, nombre, precio, descripcion FROM productos WHERE marca_id = ?`)
    const existing: {id:number,nombre:string,precio:number,descripcion?:string}[] = existingStmt.all(effectiveMarcaId)

    const added: typeof products = []
    const removed: typeof existing = []
    const updated: Array<{old:any,new:any}> = []

    // build map by nombre for existing
    const existingMap: Record<string,{id:number,precio:number,descripcion?:string}> = {}
    existing.forEach(e=>{ existingMap[e.nombre] = {id:e.id,precio:e.precio,descripcion:e.descripcion} })

    products.forEach(p=>{
      const e = existingMap[p.nombre]
      if (!e) {
        added.push(p)
      } else {
        const descChanged = (p.descripcion||'') !== (e.descripcion||'')
        if (e.precio !== p.precio || descChanged) {
          updated.push({old:e,new:p})
        }
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
    const insertStmt = db.prepare(`INSERT INTO productos (nombre, precio, descripcion, marca_id) VALUES (?, ?, ?, ?)`)

    products.forEach((p, idx) => {
      try {
        insertStmt.run(p.nombre, p.precio, p.descripcion || null, effectiveMarcaId)
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
