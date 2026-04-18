import { NextRequest, NextResponse } from "next/server"
import { deleteEsencia, getEsenciaByMarcaId, saveEsencia, updateEsencia } from "@/db/utils"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const marcaId = searchParams.get("marcaId")

  if (!marcaId) {
    return NextResponse.json({ error: "marcaId requerido" }, { status: 400 })
  }

  const esencia = getEsenciaByMarcaId(Number(marcaId))
  return NextResponse.json(esencia || null)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { valores, diferencia, historia, marcaId } = body

    if (!marcaId) {
      return NextResponse.json({ error: "marcaId requerido" }, { status: 400 })
    }

    if (!valores || !diferencia) {
      return NextResponse.json({ error: "Campos requeridos faltan" }, { status: 400 })
    }

    const esencia = saveEsencia({
      valores: String(valores).trim(),
      diferencia: String(diferencia).trim(),
      historia: String(historia || "").trim(),
      marca_id: Number(marcaId),
    })

    return NextResponse.json(
      {
        success: true,
        message: "Tu esencia quedó guardada. Tu marca ya transmite una historia más humana.",
        data: esencia,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Error en API de esencia de marca:", error)

    return NextResponse.json(
      {
        success: false,
        message: "No pudimos procesar la solicitud. Intenta nuevamente.",
        error: "INVALID_REQUEST",
      },
      { status: 400 },
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { marcaId, valores, diferencia, historia } = body

    if (!marcaId) {
      return NextResponse.json({ error: "marcaId requerido" }, { status: 400 })
    }

    const esenciaActual = getEsenciaByMarcaId(Number(marcaId))
    if (!esenciaActual) {
      return NextResponse.json({ error: "Esencia no encontrada" }, { status: 404 })
    }

    const updated = updateEsencia(esenciaActual.id, {
      valores: valores !== undefined ? String(valores).trim() : undefined,
      diferencia: diferencia !== undefined ? String(diferencia).trim() : undefined,
      historia: historia !== undefined ? String(historia).trim() : undefined,
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error actualizando esencia" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const marcaId = searchParams.get("marcaId")

    if (!marcaId) {
      return NextResponse.json({ error: "marcaId requerido" }, { status: 400 })
    }

    const esenciaActual = getEsenciaByMarcaId(Number(marcaId))
    if (!esenciaActual) {
      return NextResponse.json({ error: "Esencia no encontrada" }, { status: 404 })
    }

    const ok = deleteEsencia(esenciaActual.id)
    return NextResponse.json({ success: ok })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error eliminando esencia" }, { status: 500 })
  }
}
