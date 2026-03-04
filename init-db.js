/**
 * Script de inicialización de base de datos
 * Se ejecuta antes de que Next.js inicie en el contenedor
 */
const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

const dbPath = process.env.DB_PATH ?? path.join(process.cwd(), "laida.db");
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (manager_id) REFERENCES usuarios(id) ON DELETE SET NULL
  )
`;

db.exec(createBotsQuery);
console.log("✅ Tabla bots creada/verificada");

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
    interes TEXT NOT NULL,
    email TEXT NOT NULL,
    telefono TEXT NOT NULL,
    telegram_user_id INTEGER,
    estado TEXT NOT NULL DEFAULT 'nuevo' CHECK(estado IN ('nuevo', 'contactado', 'cerrado')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE SET NULL
  )
`;

db.exec(createLeadsQuery);
console.log("✅ Tabla leads creada/verificada");

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
