import { NextRequest, NextResponse } from "next/server"
import db from "@/db/init"
import { createUsuario, createMarca, getUsuarioByCorreo } from "@/db/utils"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nombre_marca, nombre, correo, password } = body

    if (!nombre_marca || !correo || !password) {
      return NextResponse.json(
        { error: "nombre_marca, correo y password son requeridos" },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(String(correo).trim())) {
      return NextResponse.json({ error: "Correo inválido" }, { status: 400 })
    }

    if (String(password).length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 }
      )
    }

    const existingUser = getUsuarioByCorreo(String(correo).trim())
    if (existingUser) {
      return NextResponse.json(
        { error: "Ya existe un usuario con ese correo" },
        { status: 409 }
      )
    }

    const tx = db.transaction(() => {
      const nuevoUsuario = createUsuario({
        correo: String(correo).trim(),
        password: String(password),
        rol: "manager",
        nombre: nombre ? String(nombre).trim() : null,
      })

      const nuevaMarca = createMarca({
        usuario_id: nuevoUsuario.id,
        nombre_marca: String(nombre_marca).trim(),
      })

      return { usuario: nuevoUsuario, marca: nuevaMarca }
    })

    const result = tx()

    return NextResponse.json(
      {
        success: true,
        message: "Registro completado exitosamente",
        usuarioId: result.usuario.id,
        marcaId: result.marca.id,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error en registro:", error)

    if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
      return NextResponse.json(
        { error: "El correo ya está registrado" },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: "Error al registrar. Por favor, intenta de nuevo." },
      { status: 500 }
    )
  }
}
