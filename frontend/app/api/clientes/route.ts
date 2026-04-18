import { NextRequest, NextResponse } from "next/server"
import { getAllClientes, getClienteById, createCliente, updateCliente, deleteCliente } from "@/db/utils"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const marcaId = searchParams.get('marcaId')

  if (!marcaId) {
    return NextResponse.json({ error: 'marcaId requerido' }, { status: 400 })
  }

  if (id) {
    const cliente = getClienteById(Number(id))
    // Validar que el cliente pertenezca a la marca del usuario
    if (!cliente || cliente.marca_id !== Number(marcaId)) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }
    return NextResponse.json(cliente)
  }

  const clientes = getAllClientes(Number(marcaId))
  return NextResponse.json(clientes)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { cedula, nombre, apellido, correo, telefono, marcaId } = body

    if (!marcaId) {
      return NextResponse.json({ error: 'marcaId requerido' }, { status: 400 })
    }

    if (!cedula || !nombre || !apellido) {
      return NextResponse.json({ error: 'Campos requeridos faltan' }, { status: 400 })
    }

    const nuevo = createCliente({ cedula, nombre, apellido, correo, telefono, marca_id: marcaId })
    return NextResponse.json(nuevo, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error creando cliente' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, marcaId, ...data } = body

    if (!id || !marcaId) {
      return NextResponse.json({ error: 'id y marcaId requeridos' }, { status: 400 })
    }

    // Validar que el cliente pertenezca a la marca del usuario
    const cliente = getClienteById(Number(id))
    if (!cliente || cliente.marca_id !== Number(marcaId)) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }

    const updated = updateCliente(Number(id), data)
    return NextResponse.json(updated)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error actualizando cliente' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const marcaId = searchParams.get('marcaId')

    if (!id || !marcaId) {
      return NextResponse.json({ error: 'id y marcaId requeridos' }, { status: 400 })
    }

    // Validar que el cliente pertenezca a la marca del usuario
    const cliente = getClienteById(Number(id))
    if (!cliente || cliente.marca_id !== Number(marcaId)) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }

    const ok = deleteCliente(Number(id))
    return NextResponse.json({ success: ok })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error eliminando cliente' }, { status: 500 })
  }
}
