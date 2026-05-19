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

// Tabla de marcas
db.exec(`
  CREATE TABLE IF NOT EXISTS marcas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL UNIQUE,
    nombre_marca TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
  )
`);
console.log("✅ Tabla marcas creada/verificada");

// Tabla de clientes
db.exec(`
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
`);
console.log("✅ Tabla clientes creada/verificada");

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
    marca_id INTEGER,
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

db.exec(`
  CREATE TABLE IF NOT EXISTS campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    mensaje TEXT NOT NULL,
    categoria_filter TEXT,
    bot_id INTEGER,
    programada_para DATETIME,
    imagen_url TEXT,
    ejecutada INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE SET NULL
  )
`);
console.log("✅ Tabla campaigns creada/verificada");

// -------------------- Seed inicial PALOMA + PADIA (idempotente) --------------------
try {
  const managerCount = db.prepare("SELECT COUNT(1) AS cnt FROM usuarios WHERE rol = 'manager'").get();

  if (Number(managerCount.cnt) === 0) {
    const now = new Date();
    const toSqlite = (d) => d.toISOString().replace('T', ' ').slice(0, 19);

    // ---- Manager PALOMA (sin leads ni productos) ----
    const palomaInfo = db.prepare(
      "INSERT INTO usuarios (correo, password, rol, nombre) VALUES (?, ?, ?, ?)"
    ).run('paloma@laida.com', 'paloma123', 'manager', 'Manager Paloma');
    const palomaId = Number(palomaInfo.lastInsertRowid);

    db.prepare(
      "INSERT INTO marcas (usuario_id, nombre_marca) VALUES (?, ?)"
    ).run(palomaId, 'PALOMA');

    // ---- Manager PADIA ----
    const padiaInfo = db.prepare(
      "INSERT INTO usuarios (correo, password, rol, nombre) VALUES (?, ?, ?, ?)"
    ).run('padia@laida.com', 'padia123', 'manager', 'Manager Padia');
    const padiaManagerId = Number(padiaInfo.lastInsertRowid);

    const padiaMarcaInfo = db.prepare(
      "INSERT INTO marcas (usuario_id, nombre_marca) VALUES (?, ?)"
    ).run(padiaManagerId, 'PADIA');
    const padiaMarcaId = Number(padiaMarcaInfo.lastInsertRowid);

    // Productos PADIA
    const insertProducto = db.prepare(
      "INSERT INTO productos (nombre, precio, marca_id, descripcion, activo) VALUES (?, ?, ?, ?, ?)"
    );
    const prod1 = insertProducto.run('Curso IA Básico', 150000, padiaMarcaId, 'Introducción a la inteligencia artificial y sus aplicaciones prácticas.', 1);
    const prod2 = insertProducto.run('Curso IA Intermedio', 280000, padiaMarcaId, 'Modelos de aprendizaje automático y procesamiento de datos avanzado.', 1);
    const prod3 = insertProducto.run('Curso IA Avanzado', 450000, padiaMarcaId, 'Deep learning, redes neuronales y proyectos de IA aplicada.', 1);
    const productoIds = [Number(prod1.lastInsertRowid), Number(prod2.lastInsertRowid), Number(prod3.lastInsertRowid)];
    const productoNombres = ['Curso IA Básico', 'Curso IA Intermedio', 'Curso IA Avanzado'];

    // Bot demo PADIA (inactivo)
    const botInfo = db.prepare(
      "INSERT INTO bots (nombre, slug, telegram_token, estado, manager_id, marca_id) VALUES (?, ?, ?, ?, ?, ?)"
    ).run('Bot PADIA', 'bot-padia', '000000:padia-token', 'inactivo', padiaManagerId, padiaMarcaId);
    const padiaBotId = Number(botInfo.lastInsertRowid);

    db.prepare("INSERT OR IGNORE INTO usuario_bots (usuario_id, bot_id) VALUES (?, ?)").run(padiaManagerId, padiaBotId);

    // 50 Leads PADIA
    const estados = ['nuevo', 'contactado', 'cerrado'];
    // Básico (25): 41% hot=10, 34% warm=9, 25% cold=6 | Intermedio (26): 76% warm=20, 24% cold=6 | Avanzado (25): 68% hot=17, 32% warm=8
    const catPorProducto = [
      [...Array(10).fill('hot'), ...Array(9).fill('warm'), ...Array(6).fill('cold')],
      [...Array(20).fill('warm'), ...Array(6).fill('cold')],
      [...Array(17).fill('hot'), ...Array(8).fill('warm')],
    ];
    const catContadores = [0, 0, 0];
    const nombresSeed = [
      'Andrés García', 'María Rodríguez', 'Carlos López', 'Laura Martínez', 'Juan Pérez',
      'Sofía Torres', 'Diego Herrera', 'Valentina Castro', 'Felipe Morales', 'Camila Vargas',
      'Sebastián Ruiz', 'Isabella Sánchez', 'David Jiménez', 'Lucía Gómez', 'Mateo Díaz',
    ];

    const insertLead = db.prepare(`
      INSERT INTO leads (
        nombre, bot_id, bot_slug, bot_nombre, interes, email, telefono,
        telegram_user_id, estado, categoria, producto_id, marca_id, notas
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const leadTx = db.transaction(() => {
      for (let i = 1; i <= 76; i++) {
        const estado = estados[i % estados.length];
        const prodIndex = i % productoIds.length;
        const categoria = catPorProducto[prodIndex][catContadores[prodIndex]++];
        insertLead.run(
          nombresSeed[i % nombresSeed.length],
          padiaBotId, 'bot-padia', 'Bot PADIA',
          productoNombres[prodIndex],
          `lead${i}@padia-seed.com`,
          `316${String(8200000000 + i).slice(-7)}`,
          8200000000 + i,
          estado, categoria,
          productoIds[prodIndex],
          padiaMarcaId,
          `Seed PADIA (${categoria}/${estado})`
        );
      }
    });
    leadTx();

    // Distribuir fechas de leads en los últimos 30 días
    const leadRows = db.prepare("SELECT id FROM leads WHERE marca_id = ? ORDER BY id ASC").all(padiaMarcaId);
    const updateDate = db.prepare("UPDATE leads SET created_at = ?, actualizado_en = ? WHERE id = ?");
    const dateTx = db.transaction(() => {
      leadRows.forEach((row, idx) => {
        const dayOffset = Math.floor(idx * 30 / leadRows.length);
        const d = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000);
        d.setUTCHours(9 + (idx % 9), (idx * 13) % 60, (idx * 7) % 60, 0);
        const ts = toSqlite(d);
        updateDate.run(ts, ts, row.id);
      });
    });
    dateTx();

    // 10 Clientes PADIA
    const clientes = [
      { cedula: '1012345678', nombre: 'Daniela',  apellido: 'Ospina',   correo: 'daniela.ospina@email.com', telefono: '3101234567' },
      { cedula: '1023456789', nombre: 'Camilo',   apellido: 'Restrepo', correo: 'camilo.r@email.com',       telefono: '3112345678' },
      { cedula: '1034567890', nombre: 'Natalia',  apellido: 'Henao',    correo: 'natalia.h@email.com',      telefono: '3123456789' },
      { cedula: '1045678901', nombre: 'Andrés',   apellido: 'Cárdenas', correo: 'andres.c@email.com',       telefono: '3134567890' },
      { cedula: '1056789012', nombre: 'Marcela',  apellido: 'Zuluaga',  correo: 'marcela.z@email.com',      telefono: '3145678901' },
      { cedula: '1067890123', nombre: 'Ricardo',  apellido: 'Montoya',  correo: 'ricardo.m@email.com',      telefono: '3156789012' },
      { cedula: '1078901234', nombre: 'Juliana',  apellido: 'Ríos',     correo: 'juliana.r@email.com',      telefono: '3167890123' },
      { cedula: '1089012345', nombre: 'Santiago', apellido: 'Bedoya',   correo: 'santiago.b@email.com',     telefono: '3178901234' },
      { cedula: '1090123456', nombre: 'Valeria',  apellido: 'Arango',   correo: 'valeria.a@email.com',      telefono: '3189012345' },
      { cedula: '1001234567', nombre: 'Felipe',   apellido: 'Salazar',  correo: 'felipe.s@email.com',       telefono: '3190123456' },
    ];
    const insertCliente = db.prepare(
      "INSERT INTO clientes (cedula, nombre, apellido, correo, telefono, marca_id) VALUES (?, ?, ?, ?, ?, ?)"
    );
    const clienteTx = db.transaction(() => {
      for (const c of clientes) {
        insertCliente.run(c.cedula, c.nombre, c.apellido, c.correo, c.telefono, padiaMarcaId);
      }
    });
    clienteTx();

    console.log("✅ Seed inicial aplicado: PALOMA y PADIA creadas");
  }
} catch (e) {
  console.warn("⚠️ Seed inicial falló:", e?.message || e);
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
