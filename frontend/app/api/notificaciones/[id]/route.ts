import { NextRequest, NextResponse } from "next/server"
import { getNotificacionById, marcarNotificacionComoLeida, deleteNotificacion } from "@/db/utils"
import { getAuthUser, requireManager } from "@/lib/auth"

// PATCH - Marcar notificación como leída
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getAuthUser(request)

    if (!user || !requireManager(user)) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 403 }
      )
    }

    const { id: idParam } = await params
    const notifId = Number(idParam)

    if (isNaN(notifId)) {
      return NextResponse.json(
        { error: "ID de notificación no válido" },
        { status: 400 }
      )
    }

    const notif = getNotificacionById(notifId)
    if (!notif) {
      return NextResponse.json(
        { error: "Notificación no encontrada" },
        { status: 404 }
      )
    }

    // Verificar que la notificación pertenece al usuario o es global
    if (notif.usuario_id !== null && notif.usuario_id !== user.id) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 403 }
      )
    }

    const updatedNotif = marcarNotificacionComoLeida(notifId)
    return NextResponse.json(updatedNotif)
  } catch (error) {
    console.error("Error updating notificacion:", error)
    return NextResponse.json(
      { error: "Error updating notificacion" },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar notificación
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getAuthUser(request)

    if (!user || user.rol !== "super_admin") {
      return NextResponse.json(
        { error: "Solo super admin puede eliminar notificaciones" },
        { status: 403 }
      )
    }

    const { id: idParam } = await params
    const notifId = Number(idParam)

    if (isNaN(notifId)) {
      return NextResponse.json(
        { error: "ID de notificación no válido" },
        { status: 400 }
      )
    }

    const success = deleteNotificacion(notifId)

    if (!success) {
      return NextResponse.json(
        { error: "Notificación no encontrada" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting notificacion:", error)
    return NextResponse.json(
      { error: "Error deleting notificacion" },
      { status: 500 }
    )
  }
}
