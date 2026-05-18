import { NextRequest, NextResponse } from "next/server"
import db from "@/db/init"
import * as XLSX from "xlsx"
import mammoth from "mammoth"
import OpenAI from "openai"

// ── Obtener bot vinculado a una marca ────────────────────────────────────────
function getBotByMarcaId(marcaId: number): { id: number; openai_key: string | null } | null {
  // 1. Bot directo por marca_id (caso principal)
  const byMarca = db
    .prepare("SELECT id, openai_key FROM bots WHERE marca_id = ? AND estado = 'activo' LIMIT 1")
    .get(marcaId) as { id: number; openai_key: string | null } | undefined
  if (byMarca) return byMarca

  // 2. Fallback: buscar bot cuyo manager es el usuario dueño de esta marca
  const byManager = db
    .prepare(
      "SELECT b.id, b.openai_key FROM bots b " +
      "INNER JOIN marcas m ON m.usuario_id = b.manager_id " +
      "WHERE m.id = ? AND b.estado = 'activo' LIMIT 1"
    )
    .get(marcaId) as { id: number; openai_key: string | null } | undefined
  return byManager ?? null
}

// ── Extraer texto plano según tipo de archivo ───────────────────────────────
async function extractText(buffer: Buffer, filename: string): Promise<string> {
  if (/\.pdf$/i.test(filename)) {
    // import dinámico evita el bug de pdf-parse al inicializarse en Next.js
    const pdfParse = (await import("pdf-parse")).default
    const parsed = await pdfParse(buffer)
    return parsed.text
  }
  if (/\.xlsx?$/i.test(filename)) {
    const wb = XLSX.read(buffer, { type: "buffer" })
    return wb.SheetNames.map((name) =>
      XLSX.utils.sheet_to_csv(wb.Sheets[name])
    ).join("\n\n")
  }
  if (/\.docx?$/i.test(filename)) {
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }
  // txt / csv / cualquier otro
  return buffer.toString("utf-8")
}

// ── Prompt para OpenAI ──────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Eres un experto en extracción de catálogos de productos y servicios.
Se te entregará texto extraído de un documento (PDF, Excel, Word, etc.).

Tu tarea es extraer TODOS los productos y servicios, siguiendo estas reglas:

1. PRODUCTOS FÍSICOS: extrae cada producto con nombre, precio, categoría y todas sus características
   (material, dimensiones, colores, marca, capacidad, acabado, diseño especial, código de producto, etc.).

2. SERVICIOS CON VARIANTES DE PRECIO: cuando un servicio tiene varias medidas/tamaños con precios distintos,
   crea UN producto por cada variante. Ejemplo: "DTF Bolsillo 10x10cm", "DTF Logo 10x5cm", etc.
   Incluye en caracteristicas: condición mínima, notas importantes.

3. PRODUCTOS SIN PRECIO: si un producto no tiene precio claro, usa precio = 0 e inclúyelo igual.
   NO omitas productos solo por falta de precio.

4. CATEGORÍAS: usa la sección/encabezado más cercano como categoría
   (ej: "MUGS", "CARAMAÑOLAS", "ROMPECABEZAS", "ESTAMPADO DTF", etc.).

5. CARACTERÍSTICAS: extrae TODAS las que aparezcan:
   - Material, Dimensiones, Colores, Marca, Capacidad, Acabado, Diseño, Código de producto,
     Condiciones de venta, Notas, etc.
   - Formato: "Clave: Valor"
   - Si un valor dice "No especificado", "No especificada" o similar, inclúyelo igual.

6. ELIMINACIÓN: descarta solo líneas que sean encabezados de sección sin datos de producto,
   números de página, o texto decorativo. NO descartes productos reales.

7. DEDUPLICACIÓN: si el mismo producto aparece repetido con exactamente los mismos datos, incluye solo uno.

Devuelve ÚNICAMENTE un JSON válido sin texto adicional:
{
  "productos": [
    {
      "nombre": "string",
      "precio": number,
      "descripcion": "string",
      "categoria": "string | null",
      "caracteristicas": ["string"]
    }
  ]
}

- nombre: descriptivo y único, no genérico.
- precio: número sin símbolos ni puntos de miles (ej: 20000, no "$20.000"). Si no hay precio usa 0.
- descripcion: resumen breve máximo 150 caracteres.
- caracteristicas: array de strings "Clave: Valor".`

interface ProductoIA {
  nombre: string
  precio: number
  descripcion: string
  categoria: string | null
  caracteristicas: string[]
}

async function extractProductsWithAI(text: string, apiKey: string): Promise<ProductoIA[]> {
  const client = new OpenAI({ apiKey })

  // Si el texto es muy largo, lo troceamos en chunks de ~12k chars
  const CHUNK_SIZE = 12000
  const chunks: string[] = []
  for (let i = 0; i < text.length; i += CHUNK_SIZE) {
    chunks.push(text.slice(i, i + CHUNK_SIZE))
  }

  const allProducts: ProductoIA[] = []

  for (const chunk of chunks) {
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      temperature: 0,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Texto del documento:\n\n${chunk}` },
      ],
    })

    const raw = response.choices[0]?.message?.content ?? ""
    try {
      // Extraer JSON aunque venga envuelto en ```json ... ```
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (!jsonMatch) continue
      const parsed = JSON.parse(jsonMatch[0]) as { productos: ProductoIA[] }
      if (Array.isArray(parsed.productos)) {
        allProducts.push(...parsed.productos)
      }
    } catch {
      console.error("Error parseando respuesta OpenAI:", raw.slice(0, 200))
    }
  }

  // Deduplicar por nombre (case-insensitive)
  const seen = new Set<string>()
  return allProducts.filter((p) => {
    const key = p.nombre.toLowerCase().trim()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// ── Handler principal ───────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { filename, data, marcaId, replaceExisting } = body

    if (!marcaId) {
      return NextResponse.json({ error: "marcaId es requerido" }, { status: 400 })
    }

    if (!data || !filename) {
      return NextResponse.json({ error: "Se requiere archivo (filename + data)" }, { status: 400 })
    }

    // Resolver bot real (por bot.id o por manager_id)
    const bot = getBotByMarcaId(Number(marcaId))
    if (!bot) {
      return NextResponse.json({ error: "No se encontró un bot activo para este usuario." }, { status: 404 })
    }

    const effectiveMarcaId = Number(marcaId)  // guardar con marcas.id
    const openaiKey = bot.openai_key

    if (!openaiKey) {
      return NextResponse.json(
        { error: "Este bot no tiene una clave de OpenAI configurada. Agrégala desde el panel de Super Admin." },
        { status: 422 }
      )
    }

    // 1. Convertir archivo a texto plano
    const buffer = Buffer.from(data, "base64")
    const rawText = await extractText(buffer, filename)

    if (!rawText.trim()) {
      return NextResponse.json({ error: "No se pudo extraer texto del archivo." }, { status: 422 })
    }

    // 2. Extraer productos con OpenAI
    const productos = await extractProductsWithAI(rawText, openaiKey)

    if (productos.length === 0) {
      return NextResponse.json(
        { error: "No se encontraron productos en el documento. Verifica que el archivo contenga un catálogo." },
        { status: 422 }
      )
    }

    // 3. Guardar en BD
    if (replaceExisting) {
      db.prepare("DELETE FROM productos WHERE marca_id = ?").run(effectiveMarcaId)
    }

    const insert = db.prepare(
      "INSERT INTO productos (nombre, precio, descripcion, marca_id) VALUES (?, ?, ?, ?)"
    )

    let inserted = 0
    let skipped = 0
    const errors: string[] = []

    for (const p of productos) {
      try {
        const descripcionCompleta = [
          p.descripcion,
          p.categoria ? `Categoría: ${p.categoria}` : null,
          ...(p.caracteristicas ?? []),
        ]
          .filter(Boolean)
          .join(" | ")

        insert.run(p.nombre, p.precio, descripcionCompleta || null, effectiveMarcaId)
        inserted++
      } catch (err: any) {
        skipped++
        errors.push(`${p.nombre}: ${err.message}`)
      }
    }

    return NextResponse.json({ success: true, inserted, skipped, errors })
  } catch (error: any) {
    console.error("Error importando productos:", error)
    const message: string = error?.message ?? String(error)
    let msg = "Error al procesar el archivo."
    if (message.includes("API key") || message.includes("api_key")) {
      msg = "Clave de OpenAI inválida o sin créditos."
    } else if (message.includes("quota") || message.includes("billing")) {
      msg = "Cuota de OpenAI agotada o problema de facturación."
    } else if (process.env.NODE_ENV !== "production") {
      msg = `Error: ${message}`
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
