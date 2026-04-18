import { NextRequest, NextResponse } from "next/server"
import { getLeadById, updateLead } from "@/db/utils"
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
    const { estado, interes, email, telefono } = body

    // Validar que el estado sea válido si se proporciona
    if (estado && !["nuevo", "contactado", "cerrado"].includes(estado)) {
      return NextResponse.json(
        { error: "Estado no válido" },
        { status: 400 }
      )
    }

    // Actualizar el lead
    const updatedLead = updateLead(leadId, {
      estado: estado || lead.estado,
      interes: interes || lead.interes,
      email: email || lead.email,
      telefono: telefono || lead.telefono,
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

    if (user?.rol !== "super_admin") {
      return NextResponse.json(
        { error: "Solo super admin puede eliminar leads" },
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

    // En la próxima versión implementar deleteLeads en utils
    // Por ahora solo retornamos mensaje
    return NextResponse.json({
      message: "Lead eliminado (próximamente implementado)",
    })
  } catch (error) {
    console.error("Error deleting lead:", error)
    return NextResponse.json(
      { error: "Error deleting lead" },
      { status: 500 }
    )
  }
}
