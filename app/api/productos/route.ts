import { NextRequest, NextResponse } from "next/server"
import db from "@/db/init"
import { getAllProductos, getProductoById, createProducto, updateProducto, deleteProducto } from "@/db/utils"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const marcaId = searchParams.get('marcaId')

  if (!marcaId) {
    return NextResponse.json({ error: 'marcaId requerido' }, { status: 400 })
  }

  // check whether marca exists
  let showNulls = false
  try {
    const m = db.prepare('SELECT id FROM marcas WHERE id = ?').get(Number(marcaId))
    if (!m) {
      // if there is no marca record, treat this as request for unassigned products
      showNulls = true
    }
  } catch {
    // if db not accessible, just proceed
  }

  if (id) {
    const producto = getProductoById(Number(id))
    // Validar que el producto pertenezca a la marca del usuario
    if (!producto || (producto.marca_id !== Number(marcaId) && !(showNulls && producto.marca_id == null))) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
    }
    return NextResponse.json(producto)
  }

  if (showNulls) {
    // Return productos without marca_id
    const stmt = db.prepare('SELECT * FROM productos WHERE marca_id IS NULL ORDER BY fecha_registro DESC')
    return NextResponse.json(stmt.all())
  }

  const productos = getAllProductos(Number(marcaId))
  return NextResponse.json(productos)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nombre, precio, marca_id, descripcion, imagen_url, activo } = body

    if (!marca_id) {
      return NextResponse.json({ error: 'marca_id requerido' }, { status: 400 })
    }

    if (!nombre || precio === undefined) {
      return NextResponse.json({ error: 'Campos requeridos faltan' }, { status: 400 })
    }

    const nuevo = createProducto({ 
      nombre, 
      precio: Number(precio), 
      marca_id,
      descripcion: descripcion || null,
      imagen_url: imagen_url || null,
      activo: activo !== undefined ? Number(activo) : 1
    })
    return NextResponse.json(nuevo, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error creando producto' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, marca_id, ...data } = body

    if (!id || !marca_id) {
      return NextResponse.json({ error: 'id y marca_id requeridos' }, { status: 400 })
    }

    // Validar que el producto pertenezca a la marca del usuario
    const producto = getProductoById(Number(id))
    if (!producto || producto.marca_id !== Number(marca_id)) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
    }

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
    const marcaId = searchParams.get('marcaId')

    if (!id || !marcaId) {
      return NextResponse.json({ error: 'id y marcaId requeridos' }, { status: 400 })
    }

    // Validar que el producto pertenezca a la marca del usuario
    const producto = getProductoById(Number(id))
    if (!producto || producto.marca_id !== Number(marcaId)) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
    }

    const ok = deleteProducto(Number(id))
    return NextResponse.json({ success: ok })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error eliminando producto' }, { status: 500 })
  }
}
