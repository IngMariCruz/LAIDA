import Database from "better-sqlite3"
import fs from "fs"
import path from "path"

const dbPath = process.env.DB_PATH ?? path.join(process.cwd(), "laida.db")
const dbDir = path.dirname(dbPath)

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}

const db = new Database(dbPath)

// Habilitar foreign keys
db.pragma("foreign_keys = ON")

// Crear tabla de marcas si no existe
const createTableQuery = `
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
`

db.exec(createTableQuery)

// Agregar columna de contraseña si no existe (para migraciones)
try {
  db.exec("ALTER TABLE marcas ADD COLUMN password TEXT DEFAULT 'password123'")
} catch {
  // La columna ya existe, no hacer nada
}

// Crear tabla de clientes si no existe
const createClientesQuery = `
  CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cedula TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    correo TEXT,
    telefono TEXT,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`

db.exec(createClientesQuery)

// Agregar columna 'historia' a marcas si no existe
try {
  db.exec("ALTER TABLE marcas ADD COLUMN historia TEXT DEFAULT ''")
} catch {
  // ya existe
}

// Crear tabla de productos si no existe
const createProductosQuery = `
  CREATE TABLE IF NOT EXISTS productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    precio REAL NOT NULL,
    marca_id INTEGER,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (marca_id) REFERENCES marcas(id) ON DELETE SET NULL
  )
`

db.exec(createProductosQuery)
export default db
