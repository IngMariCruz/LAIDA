import db from "./init"

export interface Marca {
  id: number
  nombre_marca: string
  correo_empresa: string
  nombre_representante: string
  numero: string
  correo_personal: string
  fecha_registro: string
  actualizado_en: string
}

// Obtener todas las marcas
export function getAllMarcas(): Marca[] {
  const stmt = db.prepare("SELECT * FROM marcas ORDER BY fecha_registro DESC")
  return stmt.all() as Marca[]
}

// Obtener una marca por ID
export function getMarcaById(id: number): Marca | undefined {
  const stmt = db.prepare("SELECT * FROM marcas WHERE id = ?")
  return stmt.get(id) as Marca | undefined
}

// Obtener una marca por correo de empresa
export function getMarcaByCorreoEmpresa(correoEmpresa: string): Marca | undefined {
  const stmt = db.prepare("SELECT * FROM marcas WHERE correo_empresa = ?")
  return stmt.get(correoEmpresa) as Marca | undefined
}

// Crear una nueva marca
export function createMarca(data: Omit<Marca, "id" | "fecha_registro" | "actualizado_en">): Marca {
  const stmt = db.prepare(`
    INSERT INTO marcas (
      nombre_marca,
      correo_empresa,
      nombre_representante,
      numero,
      correo_personal
    ) VALUES (?, ?, ?, ?, ?)
  `)

  const result = stmt.run(
    data.nombre_marca,
    data.correo_empresa,
    data.nombre_representante,
    data.numero,
    data.correo_personal
  )

  return getMarcaById(Number(result.lastInsertRowid)) as Marca
}

// Actualizar una marca
export function updateMarca(id: number, data: Partial<Omit<Marca, "id" | "fecha_registro">>): Marca {
  const updates = []
  const values = []

  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
      updates.push(`${key} = ?`)
      values.push(value)
    }
  })

  if (updates.length === 0) {
    return getMarcaById(id) as Marca
  }

  updates.push("actualizado_en = CURRENT_TIMESTAMP")
  values.push(id)

  const stmt = db.prepare(`
    UPDATE marcas
    SET ${updates.join(", ")}
    WHERE id = ?
  `)

  stmt.run(...values)

  return getMarcaById(id) as Marca
}

// Eliminar una marca
export function deleteMarca(id: number): boolean {
  const stmt = db.prepare("DELETE FROM marcas WHERE id = ?")
  const result = stmt.run(id)
  return result.changes > 0
}

// Contar total de marcas
export function countMarcas(): number {
  const stmt = db.prepare("SELECT COUNT(*) as count FROM marcas")
  const result = stmt.get() as { count: number }
  return result.count
}

// -------------------- Clientes --------------------
export interface Cliente {
  id: number
  cedula: string
  nombre: string
  apellido: string
  correo?: string
  telefono?: string
  marca_id?: number | null
  fecha_registro: string
}

export function getAllClientes(marcaId?: number): Cliente[] {
  if (marcaId) {
    const stmt = db.prepare("SELECT * FROM clientes WHERE marca_id = ? ORDER BY fecha_registro DESC")
    return stmt.all(marcaId) as Cliente[]
  }
  const stmt = db.prepare("SELECT * FROM clientes ORDER BY fecha_registro DESC")
  return stmt.all() as Cliente[]
}

export function getClienteById(id: number): Cliente | undefined {
  const stmt = db.prepare("SELECT * FROM clientes WHERE id = ?")
  return stmt.get(id) as Cliente | undefined
}

export function createCliente(data: Omit<Cliente, 'id' | 'fecha_registro'>): Cliente {
  const stmt = db.prepare(`INSERT INTO clientes (cedula, nombre, apellido, correo, telefono, marca_id) VALUES (?, ?, ?, ?, ?, ?)`)
  const result = stmt.run(data.cedula, data.nombre, data.apellido, data.correo || '', data.telefono || '', data.marca_id || null)
  return getClienteById(Number(result.lastInsertRowid)) as Cliente
}

export function updateCliente(id: number, data: Partial<Omit<Cliente, 'id' | 'fecha_registro'>>): Cliente {
  const updates: string[] = []
  const values: any[] = []
  Object.entries(data).forEach(([k, v]) => {
    if (v !== undefined) {
      updates.push(`${k} = ?`)
      values.push(v)
    }
  })
  if (updates.length === 0) return getClienteById(id) as Cliente
  values.push(id)
  const stmt = db.prepare(`UPDATE clientes SET ${updates.join(', ')} WHERE id = ?`)
  stmt.run(...values)
  return getClienteById(id) as Cliente
}

export function deleteCliente(id: number): boolean {
  const stmt = db.prepare("DELETE FROM clientes WHERE id = ?")
  const result = stmt.run(id)
  return result.changes > 0
}

// -------------------- Productos --------------------
export interface Producto {
  id: number
  nombre: string
  precio: number
  marca_id?: number | null
  fecha_registro: string
}

export function getAllProductos(marcaId?: number): Producto[] {
  if (marcaId) {
    const stmt = db.prepare("SELECT * FROM productos WHERE marca_id = ? ORDER BY fecha_registro DESC")
    return stmt.all(marcaId) as Producto[]
  }
  const stmt = db.prepare("SELECT * FROM productos ORDER BY fecha_registro DESC")
  return stmt.all() as Producto[]
}

export function getProductoById(id: number): Producto | undefined {
  const stmt = db.prepare("SELECT * FROM productos WHERE id = ?")
  return stmt.get(id) as Producto | undefined
}

export function createProducto(data: Omit<Producto, 'id' | 'fecha_registro'>): Producto {
  const stmt = db.prepare(`INSERT INTO productos (nombre, precio, marca_id) VALUES (?, ?, ?)`)
  const result = stmt.run(data.nombre, data.precio, data.marca_id || null)
  return getProductoById(Number(result.lastInsertRowid)) as Producto
}

export function updateProducto(id: number, data: Partial<Omit<Producto, 'id' | 'fecha_registro'>>): Producto {
  const updates: string[] = []
  const values: any[] = []
  Object.entries(data).forEach(([k, v]) => {
    if (v !== undefined) {
      updates.push(`${k} = ?`)
      values.push(v)
    }
  })
  if (updates.length === 0) return getProductoById(id) as Producto
  values.push(id)
  const stmt = db.prepare(`UPDATE productos SET ${updates.join(', ')} WHERE id = ?`)
  stmt.run(...values)
  return getProductoById(id) as Producto
}

export function deleteProducto(id: number): boolean {
  const stmt = db.prepare("DELETE FROM productos WHERE id = ?")
  const result = stmt.run(id)
  return result.changes > 0
}

// -------------------- Esencia --------------------
export interface Esencia {
  id: number
  valores: string
  diferencia: string
  historia: string
  marca_id: number
  created_at?: string
  fecha_registro?: string
  actualizado_en?: string
}

export function getEsenciaByMarcaId(marcaId: number): Esencia | undefined {
  const stmt = db.prepare("SELECT * FROM esencia WHERE marca_id = ? ORDER BY id DESC LIMIT 1")
  return stmt.get(marcaId) as Esencia | undefined
}

export function getEsenciaById(id: number): Esencia | undefined {
  const stmt = db.prepare("SELECT * FROM esencia WHERE id = ?")
  return stmt.get(id) as Esencia | undefined
}

export function createEsencia(data: Omit<Esencia, 'id' | 'created_at' | 'fecha_registro' | 'actualizado_en'>): Esencia {
  const stmt = db.prepare(`
    INSERT INTO esencia (valores, diferencia, historia, marca_id)
    VALUES (?, ?, ?, ?)
  `)

  const result = stmt.run(
    data.valores,
    data.diferencia,
    data.historia || '',
    data.marca_id,
  )

  const findStmt = db.prepare("SELECT * FROM esencia WHERE id = ?")
  return findStmt.get(Number(result.lastInsertRowid)) as Esencia
}

export function updateEsencia(id: number, data: Partial<Omit<Esencia, 'id' | 'marca_id' | 'created_at' | 'fecha_registro' | 'actualizado_en'>>): Esencia {
  const updates: string[] = []
  const values: any[] = []

  Object.entries(data).forEach(([k, v]) => {
    if (v !== undefined) {
      updates.push(`${k} = ?`)
      values.push(v)
    }
  })

  if (updates.length === 0) return getEsenciaById(id) as Esencia

  values.push(id)
  const stmt = db.prepare(`UPDATE esencia SET ${updates.join(', ')} WHERE id = ?`)
  stmt.run(...values)

  return getEsenciaById(id) as Esencia
}

export function saveEsencia(data: Omit<Esencia, 'id' | 'created_at' | 'fecha_registro' | 'actualizado_en'>): Esencia {
  const existing = getEsenciaByMarcaId(data.marca_id)

  if (!existing) {
    return createEsencia(data)
  }

  return updateEsencia(existing.id, {
    valores: data.valores,
    diferencia: data.diferencia,
    historia: data.historia,
  })
}

export function deleteEsencia(id: number): boolean {
  const stmt = db.prepare("DELETE FROM esencia WHERE id = ?")
  const result = stmt.run(id)
  return result.changes > 0
}
