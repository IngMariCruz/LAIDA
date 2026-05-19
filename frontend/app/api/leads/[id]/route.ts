import { NextRequest, NextResponse } from "next/server"
import { deleteLead, getLeadById, updateLead } from "@/db/utils"
import { getAuthUser, requireManager } from "@/lib/auth"

// PATCH - Actualizar un lead
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getAuthUser(request)

    if (!requireManager(user)) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 403 }
      )
    }

    const { id: idParam } = await params
    const leadId = Number(idParam)

    if (isNaN(leadId)) {
      return NextResponse.json(
        { error: "ID de lead no válido" },
        { status: 400 }
      )
    }

    const lead = getLeadById(leadId)
    if (!lead) {
      return NextResponse.json(
        { error: "Lead no encontrado" },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { estado, interes, email, telefono, nombre, categoria } = body

    if (estado && !["nuevo", "contactado", "cerrado"].includes(estado)) {
      return NextResponse.json({ error: "Estado no válido" }, { status: 400 })
    }

    if (categoria && !["hot", "warm", "cold"].includes(categoria)) {
      return NextResponse.json({ error: "Categoría no válida" }, { status: 400 })
    }

    const updatedLead = updateLead(leadId, {
      estado: estado ?? lead.estado,
      interes: interes ?? lead.interes,
      email: email ?? lead.email,
      telefono: telefono ?? lead.telefono,
      nombre: nombre ?? lead.nombre,
      categoria: categoria ?? lead.categoria,
      bot_id: lead.bot_id,
      bot_slug: lead.bot_slug,
      bot_nombre: lead.bot_nombre,
      telegram_user_id: lead.telegram_user_id,
    })

    return NextResponse.json(updatedLead)
  } catch (error) {
    console.error("Error updating lead:", error)
    return NextResponse.json(
      { error: "Error updating lead" },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar un lead
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getAuthUser(request)

    if (!requireManager(user)) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 403 }
      )
    }

    const { id: idParam } = await params
    const leadId = Number(idParam)

    if (isNaN(leadId)) {
      return NextResponse.json(
        { error: "ID de lead no válido" },
        { status: 400 }
      )
    }

    const lead = getLeadById(leadId)
    if (!lead) {
      return NextResponse.json(
        { error: "Lead no encontrado" },
        { status: 404 }
      )
    }

    const deleted = deleteLead(leadId)
    if (!deleted) {
      return NextResponse.json(
        { error: "No se pudo eliminar el lead" },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: "Lead eliminado correctamente" })
  } catch (error) {
    console.error("Error deleting lead:", error)
    return NextResponse.json(
      { error: "Error deleting lead" },
      { status: 500 }
    )
  }
}
