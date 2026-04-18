import { NextRequest, NextResponse } from "next/server"
import { getUsuarioByCorreo, getBotsAsignadosAUsuario } from "@/db/utils"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { correo, password } = body

    // Validar que todos los campos estén presentes
    if (!correo || !password) {
      return NextResponse.json(
        { error: "Correo y contraseña son requeridos" },
        { status: 400 }
      )
    }

    // Buscar el usuario en la base de datos
    const usuario = getUsuarioByCorreo(correo)

    if (!usuario) {
      return NextResponse.json(
        { error: "Correo o contraseña incorrectos" },
        { status: 401 }
      )
    }

    // Comparar contraseña (TODO: usar bcrypt en producción)
    if (usuario.password !== password) {
      return NextResponse.json(
        { error: "Correo o contraseña incorrectos" },
        { status: 401 }
      )
    }

    // Generar un token simple (TODO: usar JWT en producción)
    const token = Buffer.from(`${usuario.id}:${usuario.rol}:${Date.now()}`).toString("base64")

    // Obtener bots asignados si es manager
    let botsAsignados = []
    if (usuario.rol === 'manager') {
      botsAsignados = getBotsAsignadosAUsuario(usuario.id)
    }

    // Retornar información del usuario sin la contraseña
    const usuarioData = {
      id: usuario.id,
      correo: usuario.correo,
      rol: usuario.rol,
      nombre: usuario.nombre,
      botsAsignados: botsAsignados.map(bot => ({
        id: bot.id,
        nombre: bot.nombre,
        slug: bot.slug,
        estado: bot.estado
      }))
    }

    return NextResponse.json(
      {
        success: true,
        message: "Sesión iniciada exitosamente",
        usuario: usuarioData,
        token,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error en login:", error)

    return NextResponse.json(
      { error: "Error al iniciar sesión. Por favor, intenta de nuevo." },
      { status: 500 }
    )
  }
}
