import { NextRequest, NextResponse } from "next/server"
import db from "@/db/init"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { correoEmpresa, password } = body

    // Validar que todos los campos estén presentes
    if (!correoEmpresa || !password) {
      return NextResponse.json(
        { error: "Correo y contraseña son requeridos" },
        { status: 400 }
      )
    }

    // Buscar la marca en la base de datos
    const stmt = db.prepare(`
      SELECT id, nombre_marca, correo_empresa, nombre_representante, numero, correo_personal, password
      FROM marcas
      WHERE correo_empresa = ?
    `)

    const marca = stmt.get(correoEmpresa) as any

    if (!marca) {
      return NextResponse.json(
        { error: "Correo o contraseña incorrectos" },
        { status: 401 }
      )
    }

    // Comparar contraseña (en producción, usar bcrypt)
    // Por ahora, comparación simple
    if (marca.password !== password) {
      return NextResponse.json(
        { error: "Correo o contraseña incorrectos" },
        { status: 401 }
      )
    }

    // Generar un token simple (en producción, usar JWT)
    const token = Buffer.from(`${marca.id}:${Date.now()}`).toString("base64")

    // Retornar información del usuario sin la contraseña
    const usuario = {
      id: marca.id,
      nombreMarca: marca.nombre_marca,
      correoEmpresa: marca.correo_empresa,
      nombreRepresentante: marca.nombre_representante,
      numero: marca.numero,
      correoPersonal: marca.correo_personal,
    }

    return NextResponse.json(
      {
        success: true,
        message: "Sesión iniciada exitosamente",
        usuario,
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
