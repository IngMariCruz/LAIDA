import Database from "better-sqlite3"
import type { Database as DatabaseType } from "better-sqlite3"
import fs from "fs"
import path from "path"

let db: DatabaseType | null = null

function getDb(): DatabaseType {
  if (db) return db

  const dbPath = process.env.DB_PATH ?? path.join(process.cwd(), "laida.db")
  const dbDir = path.dirname(dbPath)

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }

  db = new Database(dbPath)
  db.pragma("foreign_keys = ON")

  initTables(db)
  return db
}

function initTables(database: DatabaseType): void {
  // ==================== SISTEMA DE USUARIOS Y ROLES ====================

  // Tabla de usuarios (super_admin y managers)
  database.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      correo TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      rol TEXT NOT NULL CHECK(rol IN ('super_admin', 'manager')),
      nombre TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Tabla de bots
  database.exec(`
    CREATE TABLE IF NOT EXISTS bots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      telegram_token TEXT NOT NULL,
      openai_key TEXT,
      estado TEXT NOT NULL DEFAULT 'activo' CHECK(estado IN ('activo', 'inactivo')),
      manager_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (manager_id) REFERENCES usuarios(id) ON DELETE SET NULL
    )
  `)

  // Tabla de relación usuarios-bots
  database.exec(`
    CREATE TABLE IF NOT EXISTS usuario_bots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      bot_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(usuario_id, bot_id),
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
      FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE
    )
  `)

  // Tabla de leads capturados por bots
  database.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bot_id INTEGER,
      bot_slug TEXT,
      bot_nombre TEXT,
      interes TEXT NOT NULL,
      email TEXT NOT NULL,
      telefono TEXT NOT NULL,
      telegram_user_id INTEGER,
      estado TEXT NOT NULL DEFAULT 'nuevo' CHECK(estado IN ('nuevo', 'contactado', 'cerrado')),
      categoria TEXT DEFAULT 'cold' CHECK(categoria IN ('hot', 'warm', 'cold')),
      producto_id INTEGER,
      detalles_compra TEXT,
      notas TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE SET NULL,
      FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE SET NULL
    )
  `)

  // Tabla de notificaciones
  database.exec(`
    CREATE TABLE IF NOT EXISTS notificaciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER,
      tipo TEXT NOT NULL CHECK(tipo IN ('nuevo_lead', 'lead_actualizado', 'nuevo_bot', 'sistema')),
      titulo TEXT NOT NULL,
      mensaje TEXT NOT NULL,
      lead_id INTEGER,
      bot_id INTEGER,
      leida INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL,
      FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE SET NULL
    )
  `)

  // Crear usuario super admin por defecto si no existe
  const defaultAdmin = database
    .prepare("SELECT id FROM usuarios WHERE correo = ?")
    .get("admin@laida.com") as { id: number } | undefined

  if (!defaultAdmin) {
    database.prepare(`
      INSERT INTO usuarios (correo, password, rol, nombre)
      VALUES (?, ?, ?, ?)
    `).run('admin@laida.com', 'admin123', 'super_admin', 'Super Admin')
    console.log('✅ Usuario super admin creado: admin@laida.com / admin123')
  }

  // ==================== TABLAS LEGACY (MANTENER COMPATIBILIDAD) ====================

  // Tabla de marcas
  database.exec(`
    CREATE TABLE IF NOT EXISTS marcas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre_marca TEXT NOT NULL,
      correo_empresa TEXT NOT NULL UNIQUE,
      nombre_representante TEXT NOT NULL,
      numero TEXT NOT NULL,
      correo_personal TEXT NOT NULL,
      password TEXT NOT NULL,
      fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
      actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Migraciones
  try {
    database.exec("ALTER TABLE marcas ADD COLUMN password TEXT DEFAULT 'password123'")
  } catch {
    // La columna ya existe
  }

  // Tabla de clientes
  database.exec(`
    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cedula TEXT NOT NULL UNIQUE,
      nombre TEXT NOT NULL,
      apellido TEXT NOT NULL,
      correo TEXT,
      telefono TEXT,
      marca_id INTEGER,
      fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (marca_id) REFERENCES marcas(id) ON DELETE CASCADE
    )
  `)

  // Tabla de productos
  database.exec(`
    CRdescripcion TEXT,
      imagen_url TEXT,
      activo INTEGER DEFAULT 1,
      fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (marca_id) REFERENCES marcas(id) ON DELETE SET NULL
    )
  `)

  // Tabla de atributos de productos
  database.exec(`
    CREATE TABLE IF NOT EXISTS producto_atributos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      producto_id INTEGER NOT NULL,
      nombre TEXT NOT NULL,
      tipo TEXT NOT NULL CHECK(tipo IN ('text', 'number', 'select', 'color')),
      opciones TEXT,
      requerido INTEGER DEFAULT 1,
      orden INTEGER DEFAULT 0,
      FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
    )
  `)

  // Tabla de configuración de flujo del bot
  database.exec(`
    CREATE TABLE IF NOT EXISTS bot_flow_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bot_id INTEGER NOT NULL UNIQUE,
      mensaje_bienvenida TEXT,
      mensaje_sin_interes TEXT,
      mensaje_productos TEXT,
      mensaje_caracteristicas TEXT,
      mensaje_confirmacion TEXT,
      mensaje_agradecimiento TEXT,
      mostrar_productos_inicio INTEGER DEFAULT 1,
      max_productos_mostrar INTEGER DEFAULT 5,
      permitir_recomendaciones INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE
    )
  `)

  // Tabla de interacciones del bot (para análisis)
  database.exec(`
    CREATE TABLE IF NOT EXISTS bot_interacciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bot_id INTEGER,
      telegram_user_id INTEGER,
      tipo TEXT NOT NULL CHECK(tipo IN ('inicio', 'producto_visto', 'caracteristica', 'compra', 'abandono', 'desinteres')),
      producto_id INTEGER,
      datos TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE SET NULL,
      FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE SET NULL
    )
  `)

  // Tabla de campañas automatizadas
  database.exec(`
    CREATE TABLE IF NOT EXISTS campañas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      mensaje TEXT NOT NULL,
      categoria_filter TEXT,
      bot_id INTEGER,
      programada_para DATETIME,
      ejecutada INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE SET NULL
    )
  `)

  // Tabla de esencia
  database.exec(`
    CREATE TABLE IF NOT EXISTS esencia (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      valores TEXT NOT NULL,
      diferencia TEXT NOT NULL,
      historia TEXT NOT NULL,
      marca_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (marca_id) REFERENCES marcas(id) ON DELETE CASCADE
    )
  `)

  // Tabla de config_bot
  database.exec(`
    CREATE TABLE IF NOT EXISTS config_bot (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      marca_id INTEGER NOT NULL UNIQUE,
      mensaje_bienvenida TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (marca_id) REFERENCES marcas(id) ON DELETE CASCADE
    )
  `)

  // Migraciones adicionales
  try {
    database.exec("ALTER TABLE esencia ADD COLUMN diferencia TEXT NOT NULL DEFAULT ''")
  } catch {
    // La columna ya existe
  }

  try {
    database.exec("ALTER TABLE esencia ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP")
  } catch {
    // La columna ya existe
  }
}

// Export a proxy that lazily initializes the database
const dbProxy = new Proxy({} as DatabaseType, {
  get(_, prop: keyof DatabaseType) {
    const database = getDb()
    const value = database[prop]
    if (typeof value === 'function') {
      return value.bind(database)
    }
    return value
  }
})

export default dbProxy
