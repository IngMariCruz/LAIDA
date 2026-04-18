import { NextRequest, NextResponse } from 'next/server'
import { getAtributosByProductoId, createProductoAtributo, deleteProductoAtributo } from '@/db/utils'
import { getAuthUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const productoId = searchParams.get('productoId')

    if (!productoId) {
      return NextResponse.json({ error: 'productoId requerido' }, { status: 400 })
    }

    const atributos = getAtributosByProductoId(Number(productoId))
    return NextResponse.json(atributos)
  } catch (error) {
    console.error('Error al obtener atributos:', error)
    return NextResponse.json({ 
      error: 'Error al obtener atributos' 
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Solo admins y managers pueden crear atributos
    if (!['super_admin', 'manager'].includes(user.rol)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body = await request.json()
    const { producto_id, nombre, tipo, opciones, requerido, orden } = body

    if (!producto_id || !nombre || !tipo) {
      return NextResponse.json({ 
        error: 'producto_id, nombre y tipo son requeridos' 
      }, { status: 400 })
    }

    // Validar tipo
    const tiposValidos = ['text', 'number', 'select', 'color']
    if (!tiposValidos.includes(tipo)) {
      return NextResponse.json({ 
        error: `Tipo inválido. Debe ser uno de: ${tiposValidos.join(', ')}` 
      }, { status: 400 })
    }

    const nuevoAtributo = createProductoAtributo({
      producto_id: Number(producto_id),
      nombre,
      tipo,
      opciones: opciones || null,
      requerido: requerido !== undefined ? Number(requerido) : 0,
      orden: orden !== undefined ? Number(orden) : 0
    })

    return NextResponse.json(nuevoAtributo, { status: 201 })
  } catch (error) {
    console.error('Error al crear atributo:', error)
    return NextResponse.json({ 
      error: 'Error al crear atributo' 
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Solo admins y managers pueden eliminar atributos
    if (!['super_admin', 'manager'].includes(user.rol)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const atributoId = searchParams.get('id')

    if (!atributoId) {
      return NextResponse.json({ error: 'id requerido' }, { status: 400 })
    }

    const eliminado = deleteProductoAtributo(Number(atributoId))

    if (!eliminado) {
      return NextResponse.json({ error: 'Atributo no encontrado' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Atributo eliminado correctamente' })
  } catch (error) {
    console.error('Error al eliminar atributo:', error)
    return NextResponse.json({ 
      error: 'Error al eliminar atributo' 
    }, { status: 500 })
  }
}
