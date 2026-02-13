import { NextRequest, NextResponse } from "next/server"
import db from "@/db/init"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { nombreMarca, correoEmpresa, nombreRepresentante, numero, correoPersonal, password } = body

    // Validar que todos los campos estén presentes
    if (!nombreMarca || !correoEmpresa || !nombreRepresentante || !numero || !correoPersonal || !password) {
      return NextResponse.json(
        { error: "Todos los campos son requeridos" },
        { status: 400 }
      )
    }

    // Validar emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(correoEmpresa) || !emailRegex.test(correoPersonal)) {
      return NextResponse.json(
        { error: "Correos inválidos" },
        { status: 400 }
      )
    }

    // Validar longitud de contraseña
    if (password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 }
      )
    }

    // Insertar en la base de datos
    const stmt = db.prepare(`
      INSERT INTO marcas (
        nombre_marca,
        correo_empresa,
        nombre_representante,
        numero,
        correo_personal,
        password
      ) VALUES (?, ?, ?, ?, ?, ?)
    `)

    const result = stmt.run(
      nombreMarca,
      correoEmpresa,
      nombreRepresentante,
      numero,
      correoPersonal,
      password
    )

    return NextResponse.json(
      {
        success: true,
        message: "Registro completado exitosamente",
        id: result.lastInsertRowid,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error en registro:", error)

    // Manejar error de correo duplicate
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
      return NextResponse.json(
        { error: "El correo de empresa ya está registrado" },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: "Error al registrar. Por favor, intenta de nuevo." },
      { status: 500 }
    )
  }
}
