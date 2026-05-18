import { NextRequest, NextResponse } from "next/server"
import {
  getAllUsuarios,
  getUsuarioById,
  createUsuario,
  updateUsuario,
  deleteUsuario,
} from "@/db/utils"
import { getAuthUser, requireSuperAdmin } from "@/lib/auth"

// GET - Obtener todos los usuarios o uno específico
export async function GET(request: NextRequest) {
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

    if (id) {
      const usuario = getUsuarioById(Number(id))
      if (!usuario) {
        return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
      }
      
      // No retornar la contraseña
      const { password, ...usuarioSinPassword } = usuario
      return NextResponse.json(usuarioSinPassword)
    }

    const usuarios = getAllUsuarios()
    
    // No retornar las contraseñas
    const usuariosSinPassword = usuarios.map(({ password, ...rest }) => rest)
    
    return NextResponse.json(usuariosSinPassword)
  } catch (error) {
    console.error("Error obteniendo usuarios:", error)
    return NextResponse.json({ error: "Error al obtener usuarios" }, { status: 500 })
  }
}

// POST - Crear nuevo usuario
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
    const { correo, password, rol, nombre } = body

    if (!correo || !password || !rol) {
      return NextResponse.json(
        { error: "Correo, contraseña y rol son requeridos" },
        { status: 400 }
      )
    }

    if (rol !== "super_admin") {
      return NextResponse.json(
        { error: "Este endpoint solo permite crear usuarios super_admin. Para managers usa POST /api/registro" },
        { status: 400 }
      )
    }

    const nuevoUsuario = createUsuario({
      correo,
      password, // TODO: password hasheado
      rol,
      nombre: nombre || null,
    })

    const { password: _, ...usuarioSinPassword } = nuevoUsuario

    return NextResponse.json(
      {
        success: true,
        message: "Usuario creado exitosamente",
        usuario: usuarioSinPassword,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error("Error creando usuario:", error)
    
    if (error.message?.includes("UNIQUE")) {
      return NextResponse.json(
        { error: "Ya existe un usuario con ese correo" },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: "Error al crear usuario" },
      { status: 500 }
    )
  }
}

// PUT - Actualizar usuario
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

    const usuario = getUsuarioById(Number(id))
    if (!usuario) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    if ((data as any).rol && !["super_admin", "manager"].includes((data as any).rol)) {
      return NextResponse.json(
        { error: "Rol inválido" },
        { status: 400 }
      )
    }

    // Si se está actualizando la contraseña, hashearla
    // TODO: Hashear contraseña con bcrypt si data.password existe

    const usuarioActualizado = updateUsuario(Number(id), data)
    const { password: _, ...usuarioSinPassword } = usuarioActualizado

    return NextResponse.json({
      success: true,
      message: "Usuario actualizado exitosamente",
      usuario: usuarioSinPassword,
    })
  } catch (error) {
    console.error("Error actualizando usuario:", error)
    return NextResponse.json({ error: "Error al actualizar usuario" }, { status: 500 })
  }
}

// DELETE - Eliminar usuario
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

    const usuario = getUsuarioById(Number(id))
    if (!usuario) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    // No permitir eliminar el último super_admin
    // TODO: Verificar que no sea el último super_admin

    const eliminado = deleteUsuario(Number(id))

    return NextResponse.json({
      success: eliminado,
      message: eliminado ? "Usuario eliminado exitosamente" : "No se pudo eliminar el usuario",
    })
  } catch (error) {
    console.error("Error eliminando usuario:", error)
    return NextResponse.json({ error: "Error al eliminar usuario" }, { status: 500 })
  }
}
