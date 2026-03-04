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

// -------------------- Leads --------------------
export interface Lead {
  id: number
  bot_id?: number | null
  bot_slug?: string | null
  bot_nombre?: string | null
  interes: string
  email: string
  telefono: string
  telegram_user_id?: number | null
  estado: 'nuevo' | 'contactado' | 'cerrado'
  created_at: string
}

export function getAllLeads(): Lead[] {
  const stmt = db.prepare(`
    SELECT l.*,
      COALESCE(b.slug, l.bot_slug) AS bot_slug,
      COALESCE(b.nombre, l.bot_nombre) AS bot_nombre
    FROM leads l
    LEFT JOIN bots b ON b.id = l.bot_id
    ORDER BY l.created_at DESC
  `)

  return stmt.all() as Lead[]
}

export function getLeadsByBotId(botId: number): Lead[] {
  const stmt = db.prepare(`
    SELECT l.*,
      COALESCE(b.slug, l.bot_slug) AS bot_slug,
      COALESCE(b.nombre, l.bot_nombre) AS bot_nombre
    FROM leads l
    LEFT JOIN bots b ON b.id = l.bot_id
    WHERE l.bot_id = ?
    ORDER BY l.created_at DESC
  `)

  return stmt.all(botId) as Lead[]
}

export function getLeadsByBotIds(botIds: number[]): Lead[] {
  if (botIds.length === 0) return []

  const placeholders = botIds.map(() => '?').join(', ')
  const stmt = db.prepare(`
    SELECT l.*,
      COALESCE(b.slug, l.bot_slug) AS bot_slug,
      COALESCE(b.nombre, l.bot_nombre) AS bot_nombre
    FROM leads l
    LEFT JOIN bots b ON b.id = l.bot_id
    WHERE l.bot_id IN (${placeholders})
    ORDER BY l.created_at DESC
  `)

  return stmt.all(...botIds) as Lead[]
}

export function createLead(data: Omit<Lead, 'id' | 'created_at'>): Lead {
  const stmt = db.prepare(`
    INSERT INTO leads (bot_id, bot_slug, bot_nombre, interes, email, telefono, telegram_user_id, estado)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const result = stmt.run(
    data.bot_id || null,
    data.bot_slug || null,
    data.bot_nombre || null,
    data.interes,
    data.email,
    data.telefono,
    data.telegram_user_id || null,
    data.estado || 'nuevo'
  )

  const findStmt = db.prepare("SELECT * FROM leads WHERE id = ?")
  return findStmt.get(Number(result.lastInsertRowid)) as Lead
}

export function getLeadById(id: number): Lead | undefined {
  const stmt = db.prepare("SELECT * FROM leads WHERE id = ?")
  return stmt.get(id) as Lead | undefined
}

export function updateLead(id: number, data: Partial<Omit<Lead, 'id' | 'created_at'>>): Lead {
  const updates: string[] = []
  const values: any[] = []

  Object.entries(data).forEach(([k, v]) => {
    if (v !== undefined) {
      updates.push(`${k} = ?`)
      values.push(v)
    }
  })

  if (updates.length === 0) return getLeadById(id) as Lead

  values.push(id)
  const stmt = db.prepare(`UPDATE leads SET ${updates.join(', ')} WHERE id = ?`)
  stmt.run(...values)

  return getLeadById(id) as Lead
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

// -------------------- Config Bot --------------------
export interface ConfigBot {
  id: number
  marca_id: number
  mensaje_bienvenida: string
  created_at: string
}

export function getConfigBotByMarcaId(marcaId: number): ConfigBot | undefined {
  const stmt = db.prepare("SELECT * FROM config_bot WHERE marca_id = ? LIMIT 1")
  return stmt.get(marcaId) as ConfigBot | undefined
}

export function saveConfigBot(data: { marca_id: number; mensaje_bienvenida: string }): ConfigBot {
  const stmt = db.prepare(`
    INSERT INTO config_bot (marca_id, mensaje_bienvenida)
    VALUES (?, ?)
    ON CONFLICT(marca_id) DO UPDATE SET
      mensaje_bienvenida = excluded.mensaje_bienvenida,
      created_at = CURRENT_TIMESTAMP
  `)

  stmt.run(data.marca_id, data.mensaje_bienvenida)

  return getConfigBotByMarcaId(data.marca_id) as ConfigBot
}

// ==================== NUEVO SISTEMA: USUARIOS Y BOTS ====================

// -------------------- Usuarios --------------------
export interface Usuario {
  id: number
  correo: string
  password: string
  rol: 'super_admin' | 'manager'
  nombre?: string | null
  created_at: string
  actualizado_en: string
}

export function getAllUsuarios(): Usuario[] {
  const stmt = db.prepare("SELECT * FROM usuarios ORDER BY created_at DESC")
  return stmt.all() as Usuario[]
}

export function getUsuarioById(id: number): Usuario | undefined {
  const stmt = db.prepare("SELECT * FROM usuarios WHERE id = ?")
  return stmt.get(id) as Usuario | undefined
}

export function getUsuarioByCorreo(correo: string): Usuario | undefined {
  const stmt = db.prepare("SELECT * FROM usuarios WHERE correo = ?")
  return stmt.get(correo) as Usuario | undefined
}

export function createUsuario(data: Omit<Usuario, 'id' | 'created_at' | 'actualizado_en'>): Usuario {
  const stmt = db.prepare(`
    INSERT INTO usuarios (correo, password, rol, nombre)
    VALUES (?, ?, ?, ?)
  `)
  
  const result = stmt.run(data.correo, data.password, data.rol, data.nombre || null)
  return getUsuarioById(Number(result.lastInsertRowid)) as Usuario
}

export function updateUsuario(id: number, data: Partial<Omit<Usuario, 'id' | 'created_at' | 'actualizado_en'>>): Usuario {
  const updates: string[] = []
  const values: any[] = []
  
  Object.entries(data).forEach(([k, v]) => {
    if (v !== undefined) {
      updates.push(`${k} = ?`)
      values.push(v)
    }
  })
  
  if (updates.length === 0) return getUsuarioById(id) as Usuario
  
  updates.push("actualizado_en = CURRENT_TIMESTAMP")
  values.push(id)
  
  const stmt = db.prepare(`UPDATE usuarios SET ${updates.join(', ')} WHERE id = ?`)
  stmt.run(...values)
  
  return getUsuarioById(id) as Usuario
}

export function deleteUsuario(id: number): boolean {
  const stmt = db.prepare("DELETE FROM usuarios WHERE id = ?")
  const result = stmt.run(id)
  return result.changes > 0
}

// -------------------- Bots --------------------
export interface Bot {
  id: number
  nombre: string
  slug: string
  telegram_token: string
  openai_key?: string | null
  estado: 'activo' | 'inactivo'
  manager_id?: number | null
  created_at: string
  actualizado_en: string
}

export function getAllBots(): Bot[] {
  const stmt = db.prepare("SELECT * FROM bots ORDER BY created_at DESC")
  return stmt.all() as Bot[]
}

export function getBotById(id: number): Bot | undefined {
  const stmt = db.prepare("SELECT * FROM bots WHERE id = ?")
  return stmt.get(id) as Bot | undefined
}

export function getBotBySlug(slug: string): Bot | undefined {
  const stmt = db.prepare("SELECT * FROM bots WHERE slug = ?")
  return stmt.get(slug) as Bot | undefined
}

export function getBotsByManagerId(managerId: number): Bot[] {
  const stmt = db.prepare(`
    SELECT b.* FROM bots b
    INNER JOIN usuario_bots ub ON b.id = ub.bot_id
    WHERE ub.usuario_id = ?
    ORDER BY b.created_at DESC
  `)
  return stmt.all(managerId) as Bot[]
}

export function createBot(data: Omit<Bot, 'id' | 'created_at' | 'actualizado_en'>): Bot {
  const stmt = db.prepare(`
    INSERT INTO bots (nombre, slug, telegram_token, openai_key, estado, manager_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  
  const result = stmt.run(
    data.nombre,
    data.slug,
    data.telegram_token,
    data.openai_key || null,
    data.estado || 'activo',
    data.manager_id || null
  )
  
  return getBotById(Number(result.lastInsertRowid)) as Bot
}

export function updateBot(id: number, data: Partial<Omit<Bot, 'id' | 'created_at' | 'actualizado_en'>>): Bot {
  const updates: string[] = []
  const values: any[] = []
  
  Object.entries(data).forEach(([k, v]) => {
    if (v !== undefined) {
      updates.push(`${k} = ?`)
      values.push(v)
    }
  })
  
  if (updates.length === 0) return getBotById(id) as Bot
  
  updates.push("actualizado_en = CURRENT_TIMESTAMP")
  values.push(id)
  
  const stmt = db.prepare(`UPDATE bots SET ${updates.join(', ')} WHERE id = ?`)
  stmt.run(...values)
  
  return getBotById(id) as Bot
}

export function deleteBot(id: number): boolean {
  const stmt = db.prepare("DELETE FROM bots WHERE id = ?")
  const result = stmt.run(id)
  return result.changes > 0
}

// -------------------- Asignación de Bots a Usuarios --------------------
export interface UsuarioBot {
  id: number
  usuario_id: number
  bot_id: number
  created_at: string
}

export function asignarBotAUsuario(usuarioId: number, botId: number): UsuarioBot {
  const stmt = db.prepare(`
    INSERT INTO usuario_bots (usuario_id, bot_id)
    VALUES (?, ?)
    ON CONFLICT(usuario_id, bot_id) DO NOTHING
  `)
  
  stmt.run(usuarioId, botId)
  
  const findStmt = db.prepare(`
    SELECT * FROM usuario_bots
    WHERE usuario_id = ? AND bot_id = ?
  `)
  
  return findStmt.get(usuarioId, botId) as UsuarioBot
}

export function removerBotDeUsuario(usuarioId: number, botId: number): boolean {
  const stmt = db.prepare(`
    DELETE FROM usuario_bots
    WHERE usuario_id = ? AND bot_id = ?
  `)
  
  const result = stmt.run(usuarioId, botId)
  return result.changes > 0
}

export function getBotsAsignadosAUsuario(usuarioId: number): Bot[] {
  return getBotsByManagerId(usuarioId)
}

export function getUsuariosAsignadosABot(botId: number): Usuario[] {
  const stmt = db.prepare(`
    SELECT u.* FROM usuarios u
    INNER JOIN usuario_bots ub ON u.id = ub.usuario_id
    WHERE ub.bot_id = ?
    ORDER BY u.created_at DESC
  `)
  
  return stmt.all(botId) as Usuario[]
}

