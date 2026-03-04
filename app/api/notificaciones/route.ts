import { NextRequest, NextResponse } from "next/server"
import {
  getAllNotificaciones,
  getNotificacionesNoLeidas,
  createNotificacion,
  marcarNotificacionComoLeida,
  marcarTodasLeidasParaUsuario,
  countNotificacionesNoLeidas,
} from "@/db/utils"
import { getAuthUser, requireManager } from "@/lib/auth"

// GET - Obtener notificaciones
export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request)

    if (!user || !requireManager(user)) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get("action")

    // Contar notificaciones no leídas
    if (action === "count") {
      const count = countNotificacionesNoLeidas(user.id)
      return NextResponse.json({ count })
    }

    // Obtener solo no leídas
    if (action === "unread") {
      const notificaciones = getNotificacionesNoLeidas(user.id)
      return NextResponse.json(notificaciones)
    }

    // Obtener todas
    const notificaciones = getAllNotificaciones(user.id)
    return NextResponse.json(notificaciones)
  } catch (error) {
    console.error("Error fetching notificaciones:", error)
    return NextResponse.json(
      { error: "Error fetching notificaciones" },
      { status: 500 }
    )
  }
}

// POST - Crear una notificación o marcar todas como leídas
export async function POST(request: NextRequest) {
  try {
    const user = getAuthUser(request)

    if (!user || !requireManager(user)) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { action, tipo, titulo, mensaje, lead_id, bot_id } = body

    // Marcar todas como leídas
    if (action === "mark_all_read") {
      marcarTodasLeidasParaUsuario(user.id)
      return NextResponse.json({ success: true })
    }

    // Crear notificación (solo super_admin puede crear notificaciones manuales)
    if (user.rol !== "super_admin") {
      return NextResponse.json(
        { error: "Solo super admin puede crear notificaciones" },
        { status: 403 }
      )
    }

    if (!tipo || !titulo || !mensaje) {
      return NextResponse.json(
        { error: "Faltan campos requeridos: tipo, titulo, mensaje" },
        { status: 400 }
      )
    }

    const notificacion = createNotificacion({
      usuario_id: null, // null = para todos los usuarios
      tipo,
      titulo,
      mensaje,
      lead_id: lead_id || null,
      bot_id: bot_id || null,
    })

    return NextResponse.json(notificacion, { status: 201 })
  } catch (error) {
    console.error("Error creating notificacion:", error)
    return NextResponse.json(
      { error: "Error creating notificacion" },
      { status: 500 }
    )
  }
}
