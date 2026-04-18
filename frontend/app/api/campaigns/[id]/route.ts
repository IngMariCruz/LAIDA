import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import db from "@/db/init"
import { deleteCampaign, getCampaignById, updateCampaign } from "@/db/utils"

function canManagerAccessBot(userId: number, botId: number): boolean {
  const stmt = db.prepare(
    "SELECT 1 as ok FROM usuario_bots WHERE usuario_id = ? AND bot_id = ? LIMIT 1"
  )
  const row = stmt.get(userId, botId) as { ok: 1 } | undefined
  return Boolean(row)
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await context.params
    const idNum = Number(id)
    if (!Number.isFinite(idNum)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }

    const campaign = getCampaignById(idNum)
    if (!campaign) {
      return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 })
    }

    if (user.rol === "manager") {
      if (!campaign.bot_id) {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 })
      }
      if (!canManagerAccessBot(user.id, campaign.bot_id)) {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 })
      }
    }

    return NextResponse.json(campaign)
  } catch (error) {
    console.error("Error obteniendo campaña:", error)
    return NextResponse.json({ error: "Error al obtener campaña" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await context.params
    const idNum = Number(id)
    if (!Number.isFinite(idNum)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }

    const current = getCampaignById(idNum)
    if (!current) {
      return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 })
    }

    // Managers: solo pueden editar campañas no ejecutadas y asociadas a sus bots
    if (user.rol === "manager") {
      if (current.ejecutada) {
        return NextResponse.json(
          { error: "No se puede editar una campaña ya ejecutada" },
          { status: 403 }
        )
      }
      if (!current.bot_id) {
        return NextResponse.json(
          { error: "No autorizado para editar campañas sin bot" },
          { status: 403 }
        )
      }
      if (!canManagerAccessBot(user.id, current.bot_id)) {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 })
      }
    }

    const body = await request.json()
    const nextNombre = body.nombre
    const nextMensaje = body.mensaje
    const nextCategoria = body.categoria_filter
    const nextBotId = body.bot_id
    const nextProgramada = body.programada_para

    if (!nextNombre || !nextMensaje) {
      return NextResponse.json(
        { error: "nombre y mensaje son requeridos" },
        { status: 400 }
      )
    }

    // Managers: bot_id requerido y debe ser de sus bots
    if (user.rol === "manager") {
      if (!nextBotId) {
        return NextResponse.json(
          { error: "bot_id es requerido para managers" },
          { status: 400 }
        )
      }
      if (!canManagerAccessBot(user.id, Number(nextBotId))) {
        return NextResponse.json(
          { error: "No autorizado para ese bot" },
          { status: 403 }
        )
      }
    }

    const updated = updateCampaign(idNum, {
      nombre: String(nextNombre),
      mensaje: String(nextMensaje),
      categoria_filter: nextCategoria ? String(nextCategoria) : null,
      bot_id: nextBotId ? Number(nextBotId) : null,
      programada_para: nextProgramada ? String(nextProgramada) : null,
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error("Error actualizando campaña:", error)
    return NextResponse.json(
      { error: error.message || "Error al actualizar campaña" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await context.params
    const idNum = Number(id)
    if (!Number.isFinite(idNum)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }

    const current = getCampaignById(idNum)
    if (!current) {
      return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 })
    }

    if (user.rol === "manager") {
      if (!current.bot_id) {
        return NextResponse.json(
          { error: "No autorizado para borrar campañas sin bot" },
          { status: 403 }
        )
      }
      if (!canManagerAccessBot(user.id, current.bot_id)) {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 })
      }
    }

    const ok = deleteCampaign(idNum)
    return NextResponse.json({ success: ok })
  } catch (error) {
    console.error("Error borrando campaña:", error)
    return NextResponse.json({ error: "Error al borrar campaña" }, { status: 500 })
  }
}
