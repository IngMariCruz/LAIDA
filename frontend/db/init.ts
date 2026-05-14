import Database from "better-sqlite3"
import type { Database as DatabaseType } from "better-sqlite3"
import fs from "fs"
import path from "path"

let db: DatabaseType | null = null

function getDb(): DatabaseType {
  if (db) return db

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

  try {
    database.exec("ALTER TABLE bots ADD COLUMN marca_id INTEGER")
  } catch {
    // ya existe
  }

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

  // Migración: si leads tiene campos NOT NULL que deben ser nullable, o le falta actualizado_en
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
    try { database.exec("PRAGMA foreign_keys = ON") } catch {}
  }

  try { database.exec("ALTER TABLE leads ADD COLUMN nombre TEXT") } catch {}

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

  // ==================== MARCAS (schema nuevo: usuario_id + nombre_marca) ====================

  database.exec(`
    CREATE TABLE IF NOT EXISTS marcas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL UNIQUE,
      nombre_marca TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    )
  `)

  // Migración: si marcas tiene schema antiguo (correo_empresa), reconstruir
  try {
    const marcasInfo = database.prepare("PRAGMA table_info(marcas)").all() as Array<{ name: string }>
    const hasCorreoEmpresa = marcasInfo.some(c => c.name === "correo_empresa")

    if (hasCorreoEmpresa) {
      database.exec("PRAGMA foreign_keys = OFF")

      const oldMarcas = database.prepare("SELECT * FROM marcas").all() as Array<{
        id: number
        nombre_marca: string
        correo_empresa: string
        nombre_representante: string
        numero?: string
        correo_personal?: string
        password?: string
        fecha_registro?: string
        actualizado_en?: string
      }>

      database.exec(`
        CREATE TABLE IF NOT EXISTS marcas_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          usuario_id INTEGER NOT NULL UNIQUE,
          nombre_marca TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
        )
      `)

      const insertMarcaNew = database.prepare(`
        INSERT OR IGNORE INTO marcas_new (id, usuario_id, nombre_marca, created_at, actualizado_en)
        VALUES (?, ?, ?, ?, ?)
      `)

      for (const oldMarca of oldMarcas) {
        let usuario = database.prepare("SELECT id FROM usuarios WHERE correo = ?")
          .get(oldMarca.correo_empresa) as { id: number } | undefined

        if (!usuario) {
          const res = database.prepare(
            "INSERT INTO usuarios (correo, password, rol, nombre) VALUES (?, ?, ?, ?)"
          ).run(
            oldMarca.correo_empresa,
            oldMarca.password || 'password123',
            'manager',
            oldMarca.nombre_representante || oldMarca.nombre_marca
          )
          usuario = { id: Number(res.lastInsertRowid) }
        }

        insertMarcaNew.run(
          oldMarca.id,
          usuario.id,
          oldMarca.nombre_marca,
          oldMarca.fecha_registro || new Date().toISOString().replace('T', ' ').slice(0, 19),
          oldMarca.actualizado_en || new Date().toISOString().replace('T', ' ').slice(0, 19)
        )
      }

      // Managers sin marca → crear marca
      const managers = database.prepare(
        "SELECT id, nombre FROM usuarios WHERE rol = 'manager'"
      ).all() as Array<{ id: number; nombre: string | null }>

      for (const manager of managers) {
        const existing = database.prepare("SELECT id FROM marcas_new WHERE usuario_id = ?")
          .get(manager.id) as { id: number } | undefined
        if (!existing) {
          database.prepare("INSERT INTO marcas_new (usuario_id, nombre_marca) VALUES (?, ?)")
            .run(manager.id, manager.nombre || 'Mi Marca')
        }
      }

      database.exec("DROP TABLE marcas")
      database.exec("ALTER TABLE marcas_new RENAME TO marcas")
      database.exec("PRAGMA foreign_keys = ON")
      console.log("✅ Migración de marcas completada (schema nuevo)")
    } else {
      // Schema nuevo: asegurar que todos los managers tengan marca
      const managers = database.prepare(
        "SELECT id, nombre FROM usuarios WHERE rol = 'manager'"
      ).all() as Array<{ id: number; nombre: string | null }>

      for (const manager of managers) {
        const existing = database.prepare("SELECT id FROM marcas WHERE usuario_id = ?")
          .get(manager.id) as { id: number } | undefined
        if (!existing) {
          database.prepare("INSERT INTO marcas (usuario_id, nombre_marca) VALUES (?, ?)")
            .run(manager.id, manager.nombre || 'Mi Marca')
        }
      }
    }
  } catch (e) {
    try { database.exec("PRAGMA foreign_keys = ON") } catch {}
    console.error("Error migrando tabla marcas:", e)
  }

  // ==================== TABLAS ASOCIADAS A MARCAS ====================

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
      FOREIGN KEY (marca_id) REFERENCES marcas(id) ON DELETE SET NULL
    )
  `)

  // Migración: si productos FK referencia usuarios (schema viejo), remap valores y reconstruir
  try {
    const fks = database.prepare("PRAGMA foreign_key_list(productos)").all() as Array<{ table: string; from: string }>
    const oldFK = fks.some(fk => fk.from === 'marca_id' && fk.table === 'usuarios')

    if (oldFK) {
      database.exec("PRAGMA foreign_keys = OFF")

      // Remap marca_id: usuario_id → marca.id
      database.exec(`
        UPDATE productos
        SET marca_id = (SELECT m.id FROM marcas m WHERE m.usuario_id = productos.marca_id)
        WHERE marca_id IS NOT NULL
      `)

      database.exec(`
        CREATE TABLE IF NOT EXISTS productos_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre TEXT NOT NULL,
          precio REAL NOT NULL,
          marca_id INTEGER,
          descripcion TEXT,
          imagen_url TEXT,
          activo INTEGER DEFAULT 1,
          fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (marca_id) REFERENCES marcas(id) ON DELETE SET NULL
        )
      `)
      database.exec(`
        INSERT INTO productos_new (id, nombre, precio, marca_id, descripcion, imagen_url, activo, fecha_registro)
        SELECT id, nombre, precio, marca_id, descripcion, imagen_url, activo, fecha_registro FROM productos
      `)
      database.exec("DROP TABLE productos")
      database.exec("ALTER TABLE productos_new RENAME TO productos")
      database.exec("PRAGMA foreign_keys = ON")
    }
  } catch (e) {
    try { database.exec("PRAGMA foreign_keys = ON") } catch {}
  }

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

  // Migraciones suaves de esencia (antes del FK migration para garantizar columnas)
  try { database.exec("ALTER TABLE esencia ADD COLUMN diferencia TEXT NOT NULL DEFAULT ''") } catch {}
  try { database.exec("ALTER TABLE esencia ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP") } catch {}

  // Migración: si esencia FK referencia usuarios, remap y reconstruir
  try {
    const fks = database.prepare("PRAGMA foreign_key_list(esencia)").all() as Array<{ table: string; from: string }>
    const oldFK = fks.some(fk => fk.from === 'marca_id' && fk.table === 'usuarios')

    if (oldFK) {
      database.exec("PRAGMA foreign_keys = OFF")

      database.exec(`
        UPDATE esencia
        SET marca_id = (SELECT m.id FROM marcas m WHERE m.usuario_id = esencia.marca_id)
        WHERE marca_id IS NOT NULL
      `)

      database.exec(`
        CREATE TABLE IF NOT EXISTS esencia_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          valores TEXT NOT NULL,
          diferencia TEXT NOT NULL,
          historia TEXT NOT NULL,
          marca_id INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (marca_id) REFERENCES marcas(id) ON DELETE CASCADE
        )
      `)
      database.exec(`
        INSERT INTO esencia_new (id, valores, diferencia, historia, marca_id, created_at)
        SELECT id, valores, diferencia, historia, marca_id, created_at FROM esencia
      `)
      database.exec("DROP TABLE esencia")
      database.exec("ALTER TABLE esencia_new RENAME TO esencia")
      database.exec("PRAGMA foreign_keys = ON")
    }
  } catch (e) {
    try { database.exec("PRAGMA foreign_keys = ON") } catch {}
  }

  database.exec(`
    CREATE TABLE IF NOT EXISTS config_bot (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      marca_id INTEGER NOT NULL UNIQUE,
      mensaje_bienvenida TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (marca_id) REFERENCES marcas(id) ON DELETE CASCADE
    )
  `)

  // Migración: si config_bot FK referencia usuarios, remap y reconstruir
  try {
    const fks = database.prepare("PRAGMA foreign_key_list(config_bot)").all() as Array<{ table: string; from: string }>
    const oldFK = fks.some(fk => fk.from === 'marca_id' && fk.table === 'usuarios')

    if (oldFK) {
      database.exec("PRAGMA foreign_keys = OFF")

      database.exec(`
        UPDATE config_bot
        SET marca_id = (SELECT m.id FROM marcas m WHERE m.usuario_id = config_bot.marca_id)
        WHERE marca_id IS NOT NULL
      `)

      database.exec(`
        CREATE TABLE IF NOT EXISTS config_bot_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          marca_id INTEGER NOT NULL UNIQUE,
          mensaje_bienvenida TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (marca_id) REFERENCES marcas(id) ON DELETE CASCADE
        )
      `)
      database.exec(`
        INSERT INTO config_bot_new (id, marca_id, mensaje_bienvenida, created_at)
        SELECT id, marca_id, mensaje_bienvenida, created_at FROM config_bot
      `)
      database.exec("DROP TABLE config_bot")
      database.exec("ALTER TABLE config_bot_new RENAME TO config_bot")
      database.exec("PRAGMA foreign_keys = ON")
    }
  } catch (e) {
    try { database.exec("PRAGMA foreign_keys = ON") } catch {}
  }

  // Migración: remap bots.marca_id (de usuario_id a marca.id donde no apunte ya a una marca válida)
  try {
    database.exec(`
      UPDATE bots
      SET marca_id = (SELECT m.id FROM marcas m WHERE m.usuario_id = bots.marca_id)
      WHERE marca_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM marcas WHERE id = bots.marca_id)
    `)
  } catch {
    // ignore
  }

  seedDemoData(database)
  ensureDemoLeads(database)
}

function seedDemoData(database: DatabaseType): void {
  try {
    const hasAnyBot = database.prepare("SELECT 1 FROM bots LIMIT 1").get()
    const hasAnyProduct = database.prepare("SELECT 1 FROM productos LIMIT 1").get()
    const hasAnyEssence = database.prepare("SELECT 1 FROM esencia LIMIT 1").get()
    const hasAnyConfig = database.prepare("SELECT 1 FROM config_bot LIMIT 1").get()

    if (hasAnyBot || hasAnyProduct || hasAnyEssence || hasAnyConfig) return

    const managerEmail = "demo@laida.com"
    const existingManager = database
      .prepare("SELECT id FROM usuarios WHERE correo = ?")
      .get(managerEmail) as { id: number } | undefined

    let managerId = existingManager?.id
    if (!managerId) {
      const result = database.prepare(
        "INSERT INTO usuarios (correo, password, rol, nombre) VALUES (?, ?, ?, ?)"
      ).run(managerEmail, "demo123", "manager", "Demo Manager")
      managerId = Number(result.lastInsertRowid)
    }

    // Crear marca demo
    let marcaId: number
    const existingMarca = database
      .prepare("SELECT id FROM marcas WHERE usuario_id = ?")
      .get(managerId) as { id: number } | undefined

    if (!existingMarca) {
      const result = database.prepare(
        "INSERT INTO marcas (usuario_id, nombre_marca) VALUES (?, ?)"
      ).run(managerId, "Marca Demo")
      marcaId = Number(result.lastInsertRowid)
    } else {
      marcaId = existingMarca.id
    }

    // Crear bot demo
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
        marcaId
      )
      botId = Number(result.lastInsertRowid)
    }

    try {
      database
        .prepare("INSERT OR IGNORE INTO usuario_bots (usuario_id, bot_id) VALUES (?, ?)")
        .run(managerId, botId)
    } catch {
      // ignore
    }

    database
      .prepare("INSERT OR IGNORE INTO config_bot (marca_id, mensaje_bienvenida) VALUES (?, ?)")
      .run(marcaId, "¡Hola! Soy tu asistente. ¿Qué estás buscando hoy?")

    database
      .prepare("INSERT OR IGNORE INTO esencia (valores, diferencia, historia, marca_id) VALUES (?, ?, ?, ?)")
      .run(
        "Calidad, confianza, cercanía",
        "Atención personalizada y respuesta rápida",
        "Somos una marca enfocada en ayudarte a elegir mejor.",
        marcaId
      )

    const insertProducto = database.prepare(
      `INSERT INTO productos (nombre, precio, marca_id, descripcion, activo) VALUES (?, ?, ?, ?, ?)`
    )
    insertProducto.run("Producto Demo A", 10000, marcaId, "Descripción demo del producto A", 1)
    insertProducto.run("Producto Demo B", 25000, marcaId, "Descripción demo del producto B", 1)
    insertProducto.run("Producto Demo C", 0, marcaId, "Precio a consultar", 1)

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
  try {
    if (process.env.NODE_ENV === "production") return

    const managerEmail = "demo@laida.com"
    const manager = database
      .prepare("SELECT id FROM usuarios WHERE correo = ?")
      .get(managerEmail) as { id: number } | undefined
    if (!manager) return

    const marca = database
      .prepare("SELECT id FROM marcas WHERE usuario_id = ?")
      .get(manager.id) as { id: number } | undefined

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

    // Ajustar fechas para que analytics (últimos 7 días) se vea bien
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
            const dayOffset = (ids.length - 1 - idx) % 7
            const d = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000)
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

    // Backfill producto_id usando marca.id (no manager.id)
    try {
      if (marca) {
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
        backfillStmt.run(marca.id, bot.id)
      }
    } catch {
      // ignore
    }
  } catch {
    // No bloquear arranque si el seed falla
  }
}

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
