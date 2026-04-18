import Database from "better-sqlite3"
import type { Database as DatabaseType } from "better-sqlite3"
import fs from "fs"
import path from "path"

let db: DatabaseType | null = null

function getDb(): DatabaseType {
  if (db) return db

  // Mantener consistencia con docker-compose (volumen ./bd) cuando no hay DB_PATH.
  const dbPath = process.env.DB_PATH ?? path.join(process.cwd(), "bd", "laida.db")
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
      marca_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (manager_id) REFERENCES usuarios(id) ON DELETE SET NULL
    )
  `)

  // Migración suave: agregar marca_id si la tabla bots ya existía
  try {
    database.exec("ALTER TABLE bots ADD COLUMN marca_id INTEGER")
  } catch {
    // ya existe
  }

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
  // Nota: para poder visualizar clasificación desde el primer mensaje, email/telefono/interes pueden ser NULL.
  database.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT,
      bot_id INTEGER,
      bot_slug TEXT,
      bot_nombre TEXT,
      interes TEXT,
      email TEXT,
      telefono TEXT,
      telegram_user_id INTEGER,
      estado TEXT NOT NULL DEFAULT 'nuevo' CHECK(estado IN ('nuevo', 'contactado', 'cerrado')),
      categoria TEXT DEFAULT 'cold' CHECK(categoria IN ('hot', 'warm', 'cold')),
      producto_id INTEGER,
      detalles_compra TEXT,
      notas TEXT,
      actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(bot_id, telegram_user_id),
      FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE SET NULL,
      FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE SET NULL
    )
  `)

  // Migración: si la tabla leads fue creada con NOT NULL en email/telefono/interes, recrearla.
  // Se conserva el último registro (mayor id) por (bot_id, telegram_user_id) para mantener unicidad.
  try {
    const leadsInfo = database.prepare("PRAGMA table_info(leads)").all() as Array<{ name: string; notnull: number }>
    const emailInfo = leadsInfo.find((c) => c.name === "email")
    const telefonoInfo = leadsInfo.find((c) => c.name === "telefono")
    const interesInfo = leadsInfo.find((c) => c.name === "interes")
    const hasActualizado = leadsInfo.some((c) => c.name === "actualizado_en")
    const needsRebuild = Boolean(emailInfo?.notnull || telefonoInfo?.notnull || interesInfo?.notnull || !hasActualizado)

    if (needsRebuild) {
      database.exec("PRAGMA foreign_keys = OFF")
      database.exec(`
        CREATE TABLE IF NOT EXISTS leads_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre TEXT,
          bot_id INTEGER,
          bot_slug TEXT,
          bot_nombre TEXT,
          interes TEXT,
          email TEXT,
          telefono TEXT,
          telegram_user_id INTEGER,
          estado TEXT NOT NULL DEFAULT 'nuevo' CHECK(estado IN ('nuevo', 'contactado', 'cerrado')),
          categoria TEXT DEFAULT 'cold' CHECK(categoria IN ('hot', 'warm', 'cold')),
          producto_id INTEGER,
          detalles_compra TEXT,
          notas TEXT,
          actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(bot_id, telegram_user_id)
        )
      `)

      // Copiar: último por (bot_id, telegram_user_id). Si telegram_user_id es NULL, se conserva por id.
      database.exec(`
        INSERT INTO leads_new (
          id, nombre, bot_id, bot_slug, bot_nombre, interes, email, telefono,
          telegram_user_id, estado, categoria, producto_id, detalles_compra, notas,
          actualizado_en, created_at
        )
        SELECT
          l.id, NULL AS nombre, l.bot_id, l.bot_slug, l.bot_nombre, l.interes, l.email, l.telefono,
          l.telegram_user_id, l.estado,
          COALESCE(l.categoria, 'cold') AS categoria,
          l.producto_id, l.detalles_compra, l.notas,
          COALESCE(l.actualizado_en, l.created_at, CURRENT_TIMESTAMP) AS actualizado_en,
          COALESCE(l.created_at, CURRENT_TIMESTAMP) AS created_at
        FROM leads l
        INNER JOIN (
          SELECT
            COALESCE(bot_id, -1) AS bot_id_key,
            COALESCE(telegram_user_id, id) AS user_key,
            MAX(id) AS max_id
          FROM leads
          GROUP BY bot_id_key, user_key
        ) t
        ON l.id = t.max_id
      `)

      database.exec("DROP TABLE leads")
      database.exec("ALTER TABLE leads_new RENAME TO leads")
      database.exec("PRAGMA foreign_keys = ON")
    }
  } catch {
    // Si algo falla, no bloquear inicialización. El sistema seguirá con el esquema existente.
    try { database.exec("PRAGMA foreign_keys = ON") } catch {}
  }

  // Migración suave: añadir nombre a leads si no existe
  try { database.exec("ALTER TABLE leads ADD COLUMN nombre TEXT") } catch {}

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
    CREATE TABLE IF NOT EXISTS productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      precio REAL NOT NULL,
      marca_id INTEGER,
      descripcion TEXT,
      imagen_url TEXT,
      activo INTEGER DEFAULT 1,
      fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (marca_id) REFERENCES usuarios(id) ON DELETE SET NULL
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
    CREATE TABLE IF NOT EXISTS campaigns (
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
      FOREIGN KEY (marca_id) REFERENCES usuarios(id) ON DELETE CASCADE
    )
  `)

  // Tabla de config_bot
  database.exec(`
    CREATE TABLE IF NOT EXISTS config_bot (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      marca_id INTEGER NOT NULL UNIQUE,
      mensaje_bienvenida TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (marca_id) REFERENCES usuarios(id) ON DELETE CASCADE
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

  seedDemoData(database)
  ensureDemoLeads(database)
}

function seedDemoData(database: DatabaseType): void {
  // Seed mínimo e idempotente para entornos nuevos (evita que la app arranque "vacía")
  try {
    const hasAnyBot = database.prepare("SELECT 1 FROM bots LIMIT 1").get()
    const hasAnyProduct = database.prepare("SELECT 1 FROM productos LIMIT 1").get()
    const hasAnyEssence = database.prepare("SELECT 1 FROM esencia LIMIT 1").get()
    const hasAnyConfig = database.prepare("SELECT 1 FROM config_bot LIMIT 1").get()

    if (hasAnyBot || hasAnyProduct || hasAnyEssence || hasAnyConfig) return

    // Crear manager demo si no existe
    const managerEmail = "demo@laida.com"
    const existingManager = database
      .prepare("SELECT id FROM usuarios WHERE correo = ?")
      .get(managerEmail) as { id: number } | undefined

    let managerId = existingManager?.id
    if (!managerId) {
      const result = database.prepare(
        "INSERT INTO usuarios (correo, password, rol, nombre) VALUES (?, ?, ?, ?)"
      ).run(managerEmail, "demo123", "manager", "Marca Demo")
      managerId = Number(result.lastInsertRowid)
    }

    // Crear bot demo (inactivo, token placeholder)
    const botSlug = "bot-demo"
    const existingBot = database
      .prepare("SELECT id FROM bots WHERE slug = ?")
      .get(botSlug) as { id: number } | undefined

    let botId = existingBot?.id
    if (!botId) {
      const result = database.prepare(
        `INSERT INTO bots (nombre, slug, telegram_token, openai_key, estado, manager_id, marca_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(
        "Bot Demo",
        botSlug,
        "000000:demo-token",
        null,
        "inactivo",
        managerId,
        managerId
      )
      botId = Number(result.lastInsertRowid)
    }

    // Asignación usuario_bots
    try {
      database
        .prepare("INSERT OR IGNORE INTO usuario_bots (usuario_id, bot_id) VALUES (?, ?)")
        .run(managerId, botId)
    } catch {
      // ignore
    }

    // Config bot y esencia demo para la marca (manager)
    database
      .prepare(
        "INSERT OR IGNORE INTO config_bot (marca_id, mensaje_bienvenida) VALUES (?, ?)"
      )
      .run(managerId, "¡Hola! Soy tu asistente. ¿Qué estás buscando hoy?")

    database
      .prepare(
        "INSERT OR IGNORE INTO esencia (valores, diferencia, historia, marca_id) VALUES (?, ?, ?, ?)"
      )
      .run(
        "Calidad, confianza, cercanía",
        "Atención personalizada y respuesta rápida",
        "Somos una marca enfocada en ayudarte a elegir mejor.",
        managerId
      )

    // Productos demo
    const insertProducto = database.prepare(
      `INSERT INTO productos (nombre, precio, marca_id, descripcion, activo)
       VALUES (?, ?, ?, ?, ?)`
    )
    insertProducto.run("Producto Demo A", 10000, managerId, "Descripción demo del producto A", 1)
    insertProducto.run("Producto Demo B", 25000, managerId, "Descripción demo del producto B", 1)
    insertProducto.run("Producto Demo C", 0, managerId, "Precio a consultar", 1)

    // Flow config demo (opcional)
    database
      .prepare(
        `INSERT OR IGNORE INTO bot_flow_config (
           bot_id, mensaje_bienvenida, mensaje_sin_interes, mensaje_productos,
           mensaje_caracteristicas, mensaje_confirmacion, mensaje_agradecimiento,
           mostrar_productos_inicio, max_productos_mostrar, permitir_recomendaciones
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        botId,
        "¡Hola! 👋 Bienvenido a nuestra tienda.",
        "Entiendo. Antes de irte, ¿quieres que te muestre algunos productos?",
        "¿Te gustaría ver nuestros productos disponibles?",
        "¿Qué características te interesan?",
        "¿Deseas confirmar tu interés en este producto?",
        "¡Gracias por tu interés! Un asesor se pondrá en contacto contigo pronto. 😊",
        1,
        5,
        1
      )

    console.log("✅ Precarga demo aplicada (BD vacía)")
  } catch {
    // No bloquear arranque si el seed falla
  }
}

function ensureDemoLeads(database: DatabaseType): void {
  // Seed específico de leads para el usuario demo. Idempotente: solo asegura un mínimo.
  try {
    if (process.env.NODE_ENV === "production") return

    const managerEmail = "demo@laida.com"
    const manager = database
      .prepare("SELECT id FROM usuarios WHERE correo = ?")
      .get(managerEmail) as { id: number } | undefined
    if (!manager) return

    const bot = database
      .prepare("SELECT id, slug, nombre FROM bots WHERE slug = ?")
      .get("bot-demo") as { id: number; slug: string; nombre: string } | undefined
    if (!bot) return

    const row = database
      .prepare("SELECT COUNT(1) AS cnt FROM leads WHERE bot_id = ?")
      .get(bot.id) as { cnt: number } | undefined

    const current = Number(row?.cnt ?? 0)
    const target = 52

    const estados = ["nuevo", "contactado", "cerrado"] as const
    const categorias = ["cold", "warm", "hot"] as const
    const intereses = [
      "Producto Demo A",
      "Producto Demo B",
      "Producto Demo C",
      "Consulta general",
      "Cotización",
      "Disponibilidad",
    ]

    const insert = database.prepare(`
      INSERT OR IGNORE INTO leads (
        nombre, bot_id, bot_slug, bot_nombre, interes, email, telefono,
        telegram_user_id, estado, categoria, notas, actualizado_en
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `)

    if (current < target) {
      const tx = database.transaction(() => {
        for (let i = 1; i <= target; i++) {
          const telegramUserId = 9100000000 + i
          const estado = estados[i % estados.length]
          const categoria = categorias[i % categorias.length]
          const interes = intereses[i % intereses.length]

          const isPlaceholder = i % 10 === 0
          const nombre = i % 5 === 0 ? null : `Lead Demo ${i}`
          const email = isPlaceholder ? "lead@laida.com" : `lead${i}@example.com`
          const telefono = isPlaceholder ? "00000000" : `300${String(telegramUserId).slice(-7)}`

          insert.run(
            nombre,
            bot.id,
            bot.slug,
            bot.nombre,
            interes,
            email,
            telefono,
            telegramUserId,
            estado,
            categoria,
            `Seed demo (${categoria}/${estado})`
          )
        }
      })

      tx()
    }

    // Ajustar fechas (created_at/actualizado_en) para que analytics (últimos 7 días) se vea bien.
    // Se actualizan los últimos N leads del bot demo (N = min(total, target)).
    try {
      const leadRows = database
        .prepare("SELECT id FROM leads WHERE bot_id = ? ORDER BY id ASC")
        .all(bot.id) as Array<{ id: number }>

      const total = leadRows.length
      const n = Math.min(total, target)
      if (n > 0) {
        const ids = leadRows.slice(-n).map((r) => r.id)
        const update = database.prepare(
          "UPDATE leads SET created_at = ?, actualizado_en = ? WHERE id = ?"
        )

        const now = new Date()

        const toSqliteDateTime = (d: Date) =>
          d.toISOString().replace("T", " ").slice(0, 19)

        const txUpdate = database.transaction(() => {
          for (let idx = 0; idx < ids.length; idx++) {
            // Los más nuevos quedan más cerca de "hoy".
            const dayOffset = (ids.length - 1 - idx) % 7
            const d = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000)

            // Variación de hora para que no queden todos iguales
            const hour = 9 + (idx % 9)
            const minute = (idx * 13) % 60
            const second = (idx * 7) % 60
            d.setUTCHours(hour, minute, second, 0)

            const ts = toSqliteDateTime(d)
            update.run(ts, ts, ids[idx])
          }
        })

        txUpdate()
      }
    } catch {
      // ignore
    }

    // Backfill: si el lead tiene interes == nombre de producto y producto_id es NULL,
    // asignar producto_id para que filtros/analytics funcionen.
    try {
      const backfillStmt = database.prepare(`
        UPDATE leads
        SET producto_id = (
          SELECT p.id
          FROM productos p
          WHERE p.marca_id = ?
            AND p.nombre = leads.interes
          LIMIT 1
        )
        WHERE bot_id = ?
          AND producto_id IS NULL
          AND interes IS NOT NULL
      `)

      backfillStmt.run(manager.id, bot.id)
    } catch {
      // ignore
    }
  } catch {
    // No bloquear arranque si el seed falla
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
