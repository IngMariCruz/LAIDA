/**
 * Script de inicialización de base de datos
 * Se ejecuta antes de que Next.js inicie en el contenedor
 */
const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

// Mantener consistencia con docker-compose (volumen ./bd) cuando no hay DB_PATH.
const dbPath = process.env.DB_PATH ?? path.join(process.cwd(), "bd", "laida.db");
const dbDir = path.dirname(dbPath);

console.log("🗄️  Inicializando base de datos en:", dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log("📁 Directorio creado:", dbDir);
}

const db = new Database(dbPath);

// Habilitar foreign keys
db.pragma("foreign_keys = ON");

// ==================== SISTEMA DE USUARIOS Y ROLES ====================

// Tabla de usuarios
const createUsuariosQuery = `
  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    correo TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    rol TEXT NOT NULL CHECK(rol IN ('super_admin', 'manager')),
    nombre TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`;

db.exec(createUsuariosQuery);
console.log("✅ Tabla usuarios creada/verificada");

// Tabla de bots
const createBotsQuery = `
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
`;

db.exec(createBotsQuery);
console.log("✅ Tabla bots creada/verificada");

// Migración suave: agregar marca_id si la tabla bots ya existía
try {
  db.exec("ALTER TABLE bots ADD COLUMN marca_id INTEGER");
} catch {
  // ya existe
}

// Tabla de relaciones usuario-bot
const createUsuarioBotsQuery = `
  CREATE TABLE IF NOT EXISTS usuario_bots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    bot_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE,
    UNIQUE(usuario_id, bot_id)
  )
`;

db.exec(createUsuarioBotsQuery);
console.log("✅ Tabla usuario_bots creada/verificada");

// Tabla de leads
const createLeadsQuery = `
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bot_id INTEGER,
    bot_slug TEXT,
    bot_nombre TEXT,
    nombre TEXT,
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
    FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE SET NULL
  )
`;

db.exec(createLeadsQuery);
console.log("✅ Tabla leads creada/verificada");

// Migración suave: agregar nombre si la tabla leads ya existía
try {
  db.exec("ALTER TABLE leads ADD COLUMN nombre TEXT");
} catch {
  // ya existe
}

// Tablas mínimas usadas por el bot (evita fallos si se ejecuta bot antes que web)
db.exec(`
  CREATE TABLE IF NOT EXISTS productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    precio REAL NOT NULL,
    marca_id INTEGER,
    descripcion TEXT,
    imagen_url TEXT,
    activo INTEGER DEFAULT 1,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS config_bot (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    marca_id INTEGER NOT NULL UNIQUE,
    mensaje_bienvenida TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS esencia (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    valores TEXT NOT NULL,
    diferencia TEXT NOT NULL,
    historia TEXT NOT NULL,
    marca_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// -------------------- Precarga demo (idempotente) --------------------
// Nota: debe correr DESPUÉS de crear tablas como config_bot / esencia / bot_flow_config.
try {
  const hasAnyBot = db.prepare("SELECT 1 FROM bots LIMIT 1").get();
  const hasAnyProduct = db.prepare("SELECT 1 FROM productos LIMIT 1").get();
  const hasAnyEssence = db.prepare("SELECT 1 FROM esencia LIMIT 1").get();
  const hasAnyConfig = db.prepare("SELECT 1 FROM config_bot LIMIT 1").get();

  if (!hasAnyBot && !hasAnyProduct && !hasAnyEssence && !hasAnyConfig) {
    // Manager demo
    const managerEmail = "demo@laida.com";
    let manager = db.prepare("SELECT id FROM usuarios WHERE correo = ?").get(managerEmail);
    if (!manager) {
      const info = db
        .prepare("INSERT INTO usuarios (correo, password, rol, nombre) VALUES (?, ?, ?, ?)")
        .run(managerEmail, "demo123", "manager", "Marca Demo");
      manager = { id: Number(info.lastInsertRowid) };
    }

    // Bot demo inactivo
    const botSlug = "bot-demo";
    let bot = db.prepare("SELECT id FROM bots WHERE slug = ?").get(botSlug);
    if (!bot) {
      const info = db
        .prepare(
          "INSERT INTO bots (nombre, slug, telegram_token, openai_key, estado, manager_id, marca_id) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .run("Bot Demo", botSlug, "000000:demo-token", null, "inactivo", manager.id, manager.id);
      bot = { id: Number(info.lastInsertRowid) };
    }

    // Relación usuario_bots
    db.prepare("INSERT OR IGNORE INTO usuario_bots (usuario_id, bot_id) VALUES (?, ?)").run(manager.id, bot.id);

    // Config + esencia
    db.prepare("INSERT OR IGNORE INTO config_bot (marca_id, mensaje_bienvenida) VALUES (?, ?)").run(
      manager.id,
      "¡Hola! Soy tu asistente. ¿Qué estás buscando hoy?"
    );
    db.prepare("INSERT OR IGNORE INTO esencia (valores, diferencia, historia, marca_id) VALUES (?, ?, ?, ?)").run(
      "Calidad, confianza, cercanía",
      "Atención personalizada y respuesta rápida",
      "Somos una marca enfocada en ayudarte a elegir mejor.",
      manager.id
    );

    // Productos demo
    const insertProducto = db.prepare(
      "INSERT INTO productos (nombre, precio, marca_id, descripcion, activo) VALUES (?, ?, ?, ?, ?)"
    );
    insertProducto.run("Producto Demo A", 10000, manager.id, "Descripción demo del producto A", 1);
    insertProducto.run("Producto Demo B", 25000, manager.id, "Descripción demo del producto B", 1);
    insertProducto.run("Producto Demo C", 0, manager.id, "Precio a consultar", 1);

    // Flow config demo
    db.prepare(
      `INSERT OR IGNORE INTO bot_flow_config (
         bot_id, mensaje_bienvenida, mensaje_sin_interes, mensaje_productos,
         mensaje_caracteristicas, mensaje_confirmacion, mensaje_agradecimiento,
         mostrar_productos_inicio, max_productos_mostrar, permitir_recomendaciones
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      bot.id,
      "¡Hola! 👋 Bienvenido a nuestra tienda.",
      "Entiendo. Antes de irte, ¿quieres que te muestre algunos productos?",
      "¿Te gustaría ver nuestros productos disponibles?",
      "¿Qué características te interesan?",
      "¿Deseas confirmar tu interés en este producto?",
      "¡Gracias por tu interés! Un asesor se pondrá en contacto contigo pronto. 😊",
      1,
      5,
      1
    );

    console.log("✅ Precarga demo aplicada (BD vacía)");
  }
} catch (e) {
  console.warn("⚠️ Precarga demo falló:", e?.message || e);
}

// -------------------- Seed leads demo (idempotente) --------------------
// Asegura un mínimo de leads para que el dashboard del usuario demo no se vea vacío.
try {
  if (process.env.NODE_ENV !== "production") {
    const managerEmail = "demo@laida.com";
    const manager = db.prepare("SELECT id FROM usuarios WHERE correo = ?").get(managerEmail);

    const botSlug = "bot-demo";
    const bot = db.prepare("SELECT id, slug, nombre FROM bots WHERE slug = ?").get(botSlug);

    if (manager && bot) {
      const row = db.prepare("SELECT COUNT(1) AS cnt FROM leads WHERE bot_id = ?").get(bot.id);
      const current = Number(row?.cnt ?? 0);
      const target = 50;

      if (current < target) {
        const estados = ["nuevo", "contactado", "cerrado"];
        const categorias = ["cold", "warm", "hot"];
        const intereses = [
          "Producto Demo A",
          "Producto Demo B",
          "Producto Demo C",
          "Consulta general",
          "Cotización",
          "Disponibilidad",
        ];

        const insert = db.prepare(`
          INSERT OR IGNORE INTO leads (
            bot_id, bot_slug, bot_nombre, nombre, interes, email, telefono,
            telegram_user_id, estado, categoria, notas, actualizado_en
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `);

        const tx = db.transaction(() => {
          for (let i = 1; i <= target; i++) {
            const telegramUserId = 9100000000 + i;
            const estado = estados[i % estados.length];
            const categoria = categorias[i % categorias.length];
            const interes = intereses[i % intereses.length];

            const isPlaceholder = i % 10 === 0;
            const nombre = i % 5 === 0 ? null : `Lead Demo ${i}`;
            const email = isPlaceholder ? "lead@laida.com" : `lead${i}@example.com`;
            const telefono = isPlaceholder ? "00000000" : `300${String(telegramUserId).slice(-7)}`;

            insert.run(
              bot.id,
              bot.slug,
              bot.nombre,
              nombre,
              interes,
              email,
              telefono,
              telegramUserId,
              estado,
              categoria,
              `Seed demo (${categoria}/${estado})`
            );
          }
        });

        tx();
        console.log("✅ Seed demo aplicado: leads de ejemplo creados/asegurados");
      }
    }
  }
} catch (e) {
  console.warn("⚠️ Seed demo leads falló:", e?.message || e);
}

db.exec(`
  CREATE TABLE IF NOT EXISTS bot_interacciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bot_id INTEGER,
    telegram_user_id INTEGER,
    tipo TEXT NOT NULL,
    producto_id INTEGER,
    datos TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Verificar si ya existe admin por correo
const adminExistente = db
  .prepare("SELECT id FROM usuarios WHERE correo = ?")
  .get("admin@laida.com");

if (!adminExistente) {
  // Crear usuario Super Admin por defecto (TODO: cambiar en producción!)
  db.prepare(
    `
    INSERT INTO usuarios (correo, password, rol, nombre)
    VALUES (?, ?, ?, ?)
  `
  ).run("admin@laida.com", "admin123", "super_admin", "Super Administrador");

  console.log(
    "✅ Usuario Super Admin creado: admin@laida.com / admin123 (CAMBIAR EN PRODUCCIÓN)"
  );
} else {
  console.log("ℹ️  Usuario Super Admin ya existe");
}

db.close();
console.log("✅ Base de datos inicializada correctamente\n");
