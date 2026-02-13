import Database from "better-sqlite3"
import path from "path"

const dbPath = path.join(process.cwd(), "laida.db")
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

export default db
