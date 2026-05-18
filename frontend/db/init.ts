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

  // Migración: agregar marca_id a leads para persistir la marca aunque se borre el bot
  try { database.exec("ALTER TABLE leads ADD COLUMN marca_id INTEGER") } catch {}

  // Backfill: inferir marca_id desde el bot activo (bot_id conocido)
  try {
    database.exec(`
      UPDATE leads
      SET marca_id = (SELECT marca_id FROM bots WHERE id = leads.bot_id)
      WHERE marca_id IS NULL AND bot_id IS NOT NULL
    `)
  } catch {}

  // Backfill: inferir marca_id por slug (bot_id null por borrado del bot)
  try {
    database.exec(`
      UPDATE leads
      SET marca_id = (SELECT marca_id FROM bots WHERE slug = leads.bot_slug)
      WHERE marca_id IS NULL AND bot_slug IS NOT NULL
    `)
  } catch {}

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

  seedInitialData(database)
}

function seedInitialData(database: DatabaseType): void {
  try {
    const managerCount = database.prepare(
      "SELECT COUNT(1) AS cnt FROM usuarios WHERE rol = 'manager'"
    ).get() as { cnt: number }

    if (Number(managerCount.cnt) > 0) return

    const toSqlite = (d: Date) => d.toISOString().replace('T', ' ').slice(0, 19)
    const now = new Date()

    // ---- Manager PALOMA (sin leads ni productos) ----
    const palomaResult = database.prepare(
      "INSERT INTO usuarios (correo, password, rol, nombre) VALUES (?, ?, ?, ?)"
    ).run('paloma@laida.com', 'paloma123', 'manager', 'Manager Paloma')
    const palomaId = Number(palomaResult.lastInsertRowid)

    database.prepare(
      "INSERT INTO marcas (usuario_id, nombre_marca) VALUES (?, ?)"
    ).run(palomaId, 'PALOMA')

    // ---- Manager PADIA ----
    const padiaResult = database.prepare(
      "INSERT INTO usuarios (correo, password, rol, nombre) VALUES (?, ?, ?, ?)"
    ).run('padia@laida.com', 'padia123', 'manager', 'Manager Padia')
    const padiaManagerId = Number(padiaResult.lastInsertRowid)

    const padiaMarcaResult = database.prepare(
      "INSERT INTO marcas (usuario_id, nombre_marca) VALUES (?, ?)"
    ).run(padiaManagerId, 'PADIA')
    const padiaMarcaId = Number(padiaMarcaResult.lastInsertRowid)

    // Productos PADIA
    const insertProducto = database.prepare(
      "INSERT INTO productos (nombre, precio, marca_id, descripcion, activo) VALUES (?, ?, ?, ?, ?)"
    )
    const prod1 = insertProducto.run('Curso IA Básico', 150000, padiaMarcaId, 'Introducción a la inteligencia artificial y sus aplicaciones prácticas.', 1)
    const prod2 = insertProducto.run('Curso IA Intermedio', 280000, padiaMarcaId, 'Modelos de aprendizaje automático y procesamiento de datos avanzado.', 1)
    const prod3 = insertProducto.run('Curso IA Avanzado', 450000, padiaMarcaId, 'Deep learning, redes neuronales y proyectos de IA aplicada.', 1)
    const productoIds = [
      Number(prod1.lastInsertRowid),
      Number(prod2.lastInsertRowid),
      Number(prod3.lastInsertRowid),
    ]
    const productoNombres = ['Curso IA Básico', 'Curso IA Intermedio', 'Curso IA Avanzado']

    // Bot demo PADIA (inactivo)
    const botResult = database.prepare(
      "INSERT INTO bots (nombre, slug, telegram_token, estado, manager_id, marca_id) VALUES (?, ?, ?, ?, ?, ?)"
    ).run('Bot PADIA', 'bot-padia', '000000:padia-token', 'inactivo', padiaManagerId, padiaMarcaId)
    const padiaBotId = Number(botResult.lastInsertRowid)

    database.prepare("INSERT OR IGNORE INTO usuario_bots (usuario_id, bot_id) VALUES (?, ?)")
      .run(padiaManagerId, padiaBotId)

    // 50 Leads PADIA
    const estados = ['nuevo', 'contactado', 'cerrado'] as const
    // Básico (25): 41% hot=10, 34% warm=9, 25% cold=6 | Intermedio (26): 76% warm=20, 24% cold=6 | Avanzado (25): 68% hot=17, 32% warm=8
    const catPorProducto: string[][] = [
      [...Array(10).fill('hot'), ...Array(9).fill('warm'), ...Array(6).fill('cold')],
      [...Array(20).fill('warm'), ...Array(6).fill('cold')],
      [...Array(17).fill('hot'), ...Array(8).fill('warm')],
    ]
    const catContadores: number[] = [0, 0, 0]
    const nombresSeed = [
      'Andrés García', 'María Rodríguez', 'Carlos López', 'Laura Martínez', 'Juan Pérez',
      'Sofía Torres', 'Diego Herrera', 'Valentina Castro', 'Felipe Morales', 'Camila Vargas',
      'Sebastián Ruiz', 'Isabella Sánchez', 'David Jiménez', 'Lucía Gómez', 'Mateo Díaz',
    ]

    const insertLead = database.prepare(`
      INSERT INTO leads (
        nombre, bot_id, bot_slug, bot_nombre, interes, email, telefono,
        telegram_user_id, estado, categoria, producto_id, marca_id, notas
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const leadTx = database.transaction(() => {
      for (let i = 1; i <= 76; i++) {
        const estado = estados[i % estados.length]
        const prodIndex = i % productoIds.length
        const categoria = catPorProducto[prodIndex][catContadores[prodIndex]++]
        insertLead.run(
          nombresSeed[i % nombresSeed.length],
          padiaBotId,
          'bot-padia',
          'Bot PADIA',
          productoNombres[prodIndex],
          `lead${i}@padia-seed.com`,
          `316${String(8200000000 + i).slice(-7)}`,
          8200000000 + i,
          estado,
          categoria,
          productoIds[prodIndex],
          padiaMarcaId,
          `Seed PADIA (${categoria}/${estado})`
        )
      }
    })
    leadTx()

    // Distribuir fechas de leads en los últimos 30 días
    const leadRows = database.prepare(
      "SELECT id FROM leads WHERE marca_id = ? ORDER BY id ASC"
    ).all(padiaMarcaId) as Array<{ id: number }>

    const updateDate = database.prepare("UPDATE leads SET created_at = ?, actualizado_en = ? WHERE id = ?")
    const dateTx = database.transaction(() => {
      leadRows.forEach((row, idx) => {
        const dayOffset = Math.floor(idx * 30 / leadRows.length)
        const d = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000)
        d.setUTCHours(9 + (idx % 9), (idx * 13) % 60, (idx * 7) % 60, 0)
        const ts = toSqlite(d)
        updateDate.run(ts, ts, row.id)
      })
    })
    dateTx()

    // 10 Clientes PADIA
    const clientes = [
      { cedula: '1012345678', nombre: 'Daniela',  apellido: 'Ospina',    correo: 'daniela.ospina@email.com',  telefono: '3101234567' },
      { cedula: '1023456789', nombre: 'Camilo',   apellido: 'Restrepo',  correo: 'camilo.r@email.com',        telefono: '3112345678' },
      { cedula: '1034567890', nombre: 'Natalia',  apellido: 'Henao',     correo: 'natalia.h@email.com',       telefono: '3123456789' },
      { cedula: '1045678901', nombre: 'Andrés',   apellido: 'Cárdenas',  correo: 'andres.c@email.com',        telefono: '3134567890' },
      { cedula: '1056789012', nombre: 'Marcela',  apellido: 'Zuluaga',   correo: 'marcela.z@email.com',       telefono: '3145678901' },
      { cedula: '1067890123', nombre: 'Ricardo',  apellido: 'Montoya',   correo: 'ricardo.m@email.com',       telefono: '3156789012' },
      { cedula: '1078901234', nombre: 'Juliana',  apellido: 'Ríos',      correo: 'juliana.r@email.com',       telefono: '3167890123' },
      { cedula: '1089012345', nombre: 'Santiago', apellido: 'Bedoya',    correo: 'santiago.b@email.com',      telefono: '3178901234' },
      { cedula: '1090123456', nombre: 'Valeria',  apellido: 'Arango',    correo: 'valeria.a@email.com',       telefono: '3189012345' },
      { cedula: '1001234567', nombre: 'Felipe',   apellido: 'Salazar',   correo: 'felipe.s@email.com',        telefono: '3190123456' },
    ]

    const insertCliente = database.prepare(
      "INSERT INTO clientes (cedula, nombre, apellido, correo, telefono, marca_id) VALUES (?, ?, ?, ?, ?, ?)"
    )
    const clienteTx = database.transaction(() => {
      for (const c of clientes) {
        insertCliente.run(c.cedula, c.nombre, c.apellido, c.correo, c.telefono, padiaMarcaId)
      }
    })
    clienteTx()

    console.log('✅ Seed inicial aplicado: PALOMA y PADIA creadas')
  } catch (e) {
    console.error('Error en seedInitialData:', e)
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
