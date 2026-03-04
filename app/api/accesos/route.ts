import { NextRequest, NextResponse } from "next/server"
import {
  asignarBotAUsuario,
  removerBotDeUsuario,
  getBotsAsignadosAUsuario,
  getUsuariosAsignadosABot,
  getUsuarioById,
  getBotById,
} from "@/db/utils"
import { getAuthUser, requireManager } from "@/lib/auth"

// GET - Obtener accesos (bots asignados a un usuario o usuarios asignados a un bot)
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
    const usuarioId = searchParams.get("usuarioId")
    const botId = searchParams.get("botId")

    if (usuarioId) {
      const bots = getBotsAsignadosAUsuario(Number(usuarioId))
      return NextResponse.json({ bots })
    }

    if (botId) {
      const usuarios = getUsuariosAsignadosABot(Number(botId))
      // No retornar contraseñas
      const usuariosSinPassword = usuarios.map(({ password, ...rest }) => rest)
      return NextResponse.json({ usuarios: usuariosSinPassword })
    }

    return NextResponse.json(
      { error: "Se requiere usuarioId o botId" },
      { status: 400 }
    )
  } catch (error) {
    console.error("Error obteniendo accesos:", error)
    return NextResponse.json({ error: "Error al obtener accesos" }, { status: 500 })
  }
}

// POST - Asignar bot a usuario
export async function POST(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    
    if (!user || user.rol !== 'super_admin') {
      return NextResponse.json(
        { error: "No autorizado. Se requiere rol de Super Admin" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { usuarioId, botId } = body

    if (!usuarioId || !botId) {
      return NextResponse.json(
        { error: "usuarioId y botId son requeridos" },
        { status: 400 }
      )
    }

    // Verificar que el usuario existe
    const usuario = getUsuarioById(Number(usuarioId))
    if (!usuario) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    // Verificar que el bot existe
    const bot = getBotById(Number(botId))
    if (!bot) {
      return NextResponse.json({ error: "Bot no encontrado" }, { status: 404 })
    }

    // Verificar que el usuario sea manager
    if (usuario.rol !== "manager") {
      return NextResponse.json(
        { error: "Solo se pueden asignar bots a usuarios con rol 'manager'" },
        { status: 400 }
      )
    }

    asignarBotAUsuario(Number(usuarioId), Number(botId))

    return NextResponse.json({
      success: true,
      message: `Bot "${bot.nombre}" asignado a ${usuario.correo} exitosamente`,
    })
  } catch (error) {
    console.error("Error asignando bot:", error)
    return NextResponse.json({ error: "Error al asignar bot" }, { status: 500 })
  }
}

// DELETE - Remover bot de usuario
export async function DELETE(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    
    if (!user || user.rol !== 'super_admin') {
      return NextResponse.json(
        { error: "No autorizado. Se requiere rol de Super Admin" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const usuarioId = searchParams.get("usuarioId")
    const botId = searchParams.get("botId")

    if (!usuarioId || !botId) {
      return NextResponse.json(
        { error: "usuarioId y botId son requeridos" },
        { status: 400 }
      )
    }

    const removido = removerBotDeUsuario(Number(usuarioId), Number(botId))

    return NextResponse.json({
      success: removido,
      message: removido
        ? "Acceso removido exitosamente"
        : "No se pudo remover el acceso",
    })
  } catch (error) {
    console.error("Error removiendo acceso:", error)
    return NextResponse.json({ error: "Error al remover acceso" }, { status: 500 })
  }
}
