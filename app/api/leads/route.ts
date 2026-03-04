import { NextRequest, NextResponse } from "next/server"
import {
  getAllLeads,
  getLeadsByBotId,
  getLeadsByBotIds,
  createLead,
} from "@/db/utils"
import { getAuthUser, requireManager } from "@/lib/auth"
import { getBotsAsignadosAUsuario } from "@/db/utils"

// GET - Obtener leads
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
    const botId = searchParams.get("botId")
    const estado = searchParams.get("estado")

    let leads: any[] = []

    if (user.rol === "super_admin") {
      // Super admin puede ver todos los leads
      leads = getAllLeads()
    } else if (user.rol === "manager") {
      // Manager solo ve leads de sus bots
      const botsAsignados = getBotsAsignadosAUsuario(user.id)
      const botIds = botsAsignados.map(b => b.id)
      if (botIds.length > 0) {
        leads = getLeadsByBotIds(botIds)
      }
    }

    // Filtrar por botId si se proporciona
    if (botId) {
      leads = leads.filter(l => l.bot_id === Number(botId))
    }

    // Filtrar por estado si se proporciona
    if (estado) {
      leads = leads.filter(l => l.estado === estado)
    }

    return NextResponse.json(leads)
  } catch (error) {
    console.error("Error fetching leads:", error)
    return NextResponse.json(
      { error: "Error fetching leads" },
      { status: 500 }
    )
  }
}

// POST - Crear un lead (puede ser desde el bot o manualmente)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      bot_id,
      bot_slug,
      bot_nombre,
      interes,
      email,
      telefono,
      telegram_user_id,
      estado = "nuevo"
    } = body

    // Validar campos requeridos
    if (!interes || !email || !telefono) {
      return NextResponse.json(
        { error: "Faltan campos requeridos: interes, email, telefono" },
        { status: 400 }
      )
    }

    // Validar email básico
    if (!email.includes("@")) {
      return NextResponse.json(
        { error: "Email no válido" },
        { status: 400 }
      )
    }

    // Crear el lead
    const lead = createLead({
      bot_id: bot_id || null,
      bot_slug: bot_slug || null,
      bot_nombre: bot_nombre || null,
      interes,
      email,
      telefono,
      telegram_user_id: telegram_user_id || null,
      estado: estado || "nuevo"
    })

    return NextResponse.json(lead, { status: 201 })
  } catch (error) {
    console.error("Error creating lead:", error)
    return NextResponse.json(
      { error: "Error creating lead" },
      { status: 500 }
    )
  }
}
