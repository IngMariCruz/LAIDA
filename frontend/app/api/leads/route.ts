import { NextRequest, NextResponse } from "next/server"
import {
  getAllLeads,
  getLeadsByBotId,
  getLeadsByBotIds,
  createLead,
  createNotificacion,
  getAllUsuarios,
  getBotsAsignadosAUsuario,
} from "@/db/utils"
import { getAuthUser, requireManager } from "@/lib/auth"
import db from "@/db/init"

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
      nombre,
      bot_id,
      bot_slug,
      bot_nombre,
      interes,
      email,
      telefono,
      telegram_user_id,
      estado = "nuevo",
      categoria,
      producto_id,
      detalles_compra,
      notas,
    } = body

    let normalizedProductoId: number | null = null
    if (producto_id !== undefined && producto_id !== null && producto_id !== "") {
      const asNumber = Number(producto_id)
      normalizedProductoId = Number.isFinite(asNumber) && !Number.isNaN(asNumber) ? asNumber : null
    }

    // Si no viene producto_id pero el interés coincide con un producto de la marca del bot, inferirlo.
    if (!normalizedProductoId && bot_id && interes && typeof interes === "string") {
      try {
        const botRow = db
          .prepare("SELECT marca_id FROM bots WHERE id = ?")
          .get(Number(bot_id)) as { marca_id: number | null } | undefined

        const marcaId = botRow?.marca_id
        if (marcaId) {
          const prodRow = db
            .prepare("SELECT id FROM productos WHERE marca_id = ? AND nombre = ? LIMIT 1")
            .get(Number(marcaId), interes) as { id: number } | undefined

          if (prodRow?.id) normalizedProductoId = Number(prodRow.id)
        }
      } catch {
        // ignore
      }
    }

    // Permitir leads parciales (sin email/teléfono) para clasificar desde el primer mensaje.
    // Validar email solo si viene.
    if (email && typeof email === "string" && !email.includes("@")) {
      return NextResponse.json({ error: "Email no válido" }, { status: 400 })
    }

    // Crear el lead
    const lead = createLead({
      nombre: nombre ?? null,
      bot_id: bot_id || null,
      bot_slug: bot_slug || null,
      bot_nombre: bot_nombre || null,
      interes: interes ?? null,
      email: email ?? null,
      telefono: telefono ?? null,
      telegram_user_id: telegram_user_id || null,
      estado: estado || "nuevo",
      categoria: categoria || null,
      producto_id: normalizedProductoId,
      detalles_compra: detalles_compra || null,
      notas: notas || null,
    })

    // Crear notificaciones para usuarios relevantes
    try {
      const usuarios = getAllUsuarios()
      
      // Notificar a super admins
      const superAdmins = usuarios.filter(u => u.rol === 'super_admin')
      for (const admin of superAdmins) {
        createNotificacion({
          usuario_id: admin.id,
          tipo: 'nuevo_lead',
          titulo: '🎉 Nuevo Lead',
          mensaje: email === 'lead@laida.com' ? 'Nuevo lead detectado' : `Lead interesado en "${interes || 'Sin interés registrado'}" - ${email || 'Sin email'}`,
          lead_id: lead.id,
          bot_id: bot_id || null,
        })
      }

      // Notificar a managers asignados al bot (si hay bot_id)
      if (bot_id) {
        const managers = usuarios.filter(u => u.rol === 'manager')
        for (const manager of managers) {
          const botsAsignados = getBotsAsignadosAUsuario(manager.id)
          if (botsAsignados.some(b => b.id === bot_id)) {
            createNotificacion({
              usuario_id: manager.id,
              tipo: 'nuevo_lead',
              titulo: '🎉 Nuevo Lead',
              mensaje: email === 'lead@laida.com' ? 'Nuevo lead detectado' : `Lead interesado en "${interes || 'Sin interés registrado'}" - ${email || 'Sin email'}`,
              lead_id: lead.id,
              bot_id: bot_id,
            })
          }
        }
      }
    } catch (notifError) {
      console.error("Error creando notificaciones:", notifError)
      // No fallar si las notificaciones fallan
    }

    return NextResponse.json(lead, { status: 201 })
  } catch (error) {
    console.error("Error creating lead:", error)
    return NextResponse.json(
      { error: "Error creating lead" },
      { status: 500 }
    )
  }
}
