import { NextRequest, NextResponse } from "next/server"
import { getAllProductos, getProductoById, createProducto, updateProducto, deleteProducto } from "@/db/utils"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const marcaId = searchParams.get('marcaId')
  if (id) {
    const producto = getProductoById(Number(id))
    if (!producto) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
    return NextResponse.json(producto)
  }
  const productos = getAllProductos(marcaId ? Number(marcaId) : undefined)
  return NextResponse.json(productos)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nombre, precio, marca_id } = body
    if (!nombre || precio === undefined) return NextResponse.json({ error: 'Campos requeridos faltan' }, { status: 400 })
    const nuevo = createProducto({ nombre, precio: Number(precio), marca_id: marca_id || null })
    return NextResponse.json(nuevo, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error creando producto' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })
    const updated = updateProducto(Number(id), data)
    return NextResponse.json(updated)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error actualizando producto' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })
    const ok = deleteProducto(Number(id))
    return NextResponse.json({ success: ok })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error eliminando producto' }, { status: 500 })
  }
}
