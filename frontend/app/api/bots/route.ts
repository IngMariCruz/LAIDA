import { NextRequest, NextResponse } from "next/server"
import {
  getAllBots,
  getBotById,
  getBotBySlug,
  getBotByTelegramToken,
  getBotsByManagerId,
  createBot,
  updateBot,
  deleteBot,
  asignarBotAUsuario,
  getMarcaByUsuarioId,
} from "@/db/utils"
import { getAuthUser, requireSuperAdmin, requireManager } from "@/lib/auth"

// GET - Obtener todos los bots o uno específico
export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    
    if (!requireManager(user)) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    const slug = searchParams.get("slug")
    const managerId = searchParams.get("managerId")

    const isSuperAdmin = user.rol === "super_admin"

    // Para managers: bots permitidos = asignados en usuario_bots
    const allowedBotsForManager = !isSuperAdmin ? getBotsByManagerId(user.id) : null
    const managerAllowedIds = allowedBotsForManager ? new Set(allowedBotsForManager.map((b) => b.id)) : null

    if (id) {
      const bot = getBotById(Number(id))
      if (!bot) {
        return NextResponse.json({ error: "Bot no encontrado" }, { status: 404 })
      }
      if (managerAllowedIds && !managerAllowedIds.has(bot.id)) {
        return NextResponse.json(
          { error: "No autorizado" },
          { status: 403 }
        )
      }
      return NextResponse.json(bot)
    }

    if (slug) {
      const bot = getBotBySlug(slug)
      if (!bot) {
        return NextResponse.json({ error: "Bot no encontrado" }, { status: 404 })
      }
      if (managerAllowedIds && !managerAllowedIds.has(bot.id)) {
        return NextResponse.json(
          { error: "No autorizado" },
          { status: 403 }
        )
      }
      return NextResponse.json(bot)
    }

    if (managerId) {
      if (!isSuperAdmin && Number(managerId) !== user.id) {
        return NextResponse.json(
          { error: "No autorizado" },
          { status: 403 }
        )
      }
      const bots = getBotsByManagerId(Number(managerId))
      return NextResponse.json(bots)
    }

    if (!isSuperAdmin) {
      return NextResponse.json(allowedBotsForManager || [])
    }

    const bots = getAllBots()
    return NextResponse.json(bots)
  } catch (error) {
    console.error("Error obteniendo bots:", error)
    return NextResponse.json({ error: "Error al obtener bots" }, { status: 500 })
  }
}

// POST - Crear nuevo bot
export async function POST(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    
    if (!requireSuperAdmin(user)) {
      return NextResponse.json(
        { error: "No autorizado. Se requiere rol de Super Admin" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { nombre, slug, telegram_token, openai_key, estado, manager_id } = body

    if (!nombre || !slug || !telegram_token) {
      return NextResponse.json(
        { error: "Nombre, slug y telegram_token son requeridos" },
        { status: 400 }
      )
    }

    // Validar que el slug no contenga espacios ni caracteres especiales
    if (!/^[a-z0-9-_]+$/.test(slug)) {
      return NextResponse.json(
        { error: "El slug solo puede contener letras minúsculas, números, guiones y guiones bajos" },
        { status: 400 }
      )
    }

    // Verificar que el slug no exista
    const botExistente = getBotBySlug(slug)
    if (botExistente) {
      return NextResponse.json(
        { error: "Ya existe un bot con ese slug" },
        { status: 400 }
      )
    }

    // Verificar que el token de Telegram no esté en uso
    const botConToken = getBotByTelegramToken(telegram_token)
    if (botConToken) {
      return NextResponse.json(
        { error: "Ya existe un bot con ese token de Telegram" },
        { status: 400 }
      )
    }

    const nuevoBot = createBot({
      nombre,
      slug,
      telegram_token,
      openai_key: openai_key || null,
      estado: estado || "activo",
      manager_id: manager_id || null,
      marca_id: manager_id ? (getMarcaByUsuarioId(Number(manager_id))?.id ?? null) : null,
    })

    // Si se asignó un manager, crear la relación en usuario_bots
    if (manager_id) {
      asignarBotAUsuario(Number(manager_id), nuevoBot.id)
    }

    return NextResponse.json(
      {
        success: true,
        message: "Bot creado exitosamente",
        bot: nuevoBot,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error("Error creando bot:", error)
    
    if (error.message?.includes("UNIQUE")) {
      return NextResponse.json(
        { error: "Ya existe un bot con ese slug" },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: "Error al crear bot" },
      { status: 500 }
    )
  }
}

// PUT - Actualizar bot
export async function PUT(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    
    if (!requireSuperAdmin(user)) {
      return NextResponse.json(
        { error: "No autorizado. Se requiere rol de Super Admin" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json({ error: "ID es requerido" }, { status: 400 })
    }

    const bot = getBotById(Number(id))
    if (!bot) {
      return NextResponse.json({ error: "Bot no encontrado" }, { status: 404 })
    }

    // Si se está actualizando el slug, validar
    if (data.slug && data.slug !== bot.slug) {
      if (!/^[a-z0-9-_]+$/.test(data.slug)) {
        return NextResponse.json(
          { error: "El slug solo puede contener letras minúsculas, números, guiones y guiones bajos" },
          { status: 400 }
        )
      }

      const botExistente = getBotBySlug(data.slug)
      if (botExistente) {
        return NextResponse.json(
          { error: "Ya existe un bot con ese slug" },
          { status: 400 }
        )
      }
    }

    // Si se está actualizando el token de Telegram, verificar que no esté en uso
    if (data.telegram_token && data.telegram_token !== bot.telegram_token) {
      const botConToken = getBotByTelegramToken(data.telegram_token)
      if (botConToken) {
        return NextResponse.json(
          { error: "Ya existe un bot con ese token de Telegram" },
          { status: 400 }
        )
      }
    }

    const botActualizado = updateBot(Number(id), data)

    return NextResponse.json({
      success: true,
      message: "Bot actualizado exitosamente",
      bot: botActualizado,
    })
  } catch (error) {
    console.error("Error actualizando bot:", error)
    return NextResponse.json({ error: "Error al actualizar bot" }, { status: 500 })
  }
}

// DELETE - Eliminar bot
export async function DELETE(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    
    if (!requireSuperAdmin(user)) {
      return NextResponse.json(
        { error: "No autorizado. Se requiere rol de Super Admin" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID es requerido" }, { status: 400 })
    }

    const bot = getBotById(Number(id))
    if (!bot) {
      return NextResponse.json({ error: "Bot no encontrado" }, { status: 404 })
    }

    const eliminado = deleteBot(Number(id))

    return NextResponse.json({
      success: eliminado,
      message: eliminado ? "Bot eliminado exitosamente" : "No se pudo eliminar el bot",
    })
  } catch (error) {
    console.error("Error eliminando bot:", error)
    return NextResponse.json({ error: "Error al eliminar bot" }, { status: 500 })
  }
}
