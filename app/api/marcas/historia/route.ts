import { NextRequest, NextResponse } from "next/server"
import db from "@/db/init"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { marcaId, historia } = body

    if (!marcaId || typeof historia !== 'string') {
      return NextResponse.json({ error: 'marcaId e historia son requeridos' }, { status: 400 })
    }

    const stmt = db.prepare('UPDATE marcas SET historia = ?, actualizado_en = CURRENT_TIMESTAMP WHERE id = ?')
    const result = stmt.run(historia, marcaId)

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Marca no encontrada' }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: 'Historia guardada' }, { status: 200 })
  } catch (err) {
    console.error('Error guardando historia:', err)
    return NextResponse.json({ error: 'Error al guardar historia' }, { status: 500 })
  }
}
