import os
import sqlite3

DB_PATH = os.getenv("BOT_DB_PATH", "../bd/laida.db")


def column_names(cur: sqlite3.Cursor, table: str) -> set[str]:
    rows = cur.execute(f"PRAGMA table_info({table})").fetchall()
    return {r[1] for r in rows}


def table_exists(cur: sqlite3.Cursor, table: str) -> bool:
    row = cur.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name=? LIMIT 1",
        (table,),
    ).fetchone()
    return row is not None


def migrate_leads(con: sqlite3.Connection) -> None:
    cur = con.cursor()

    if not table_exists(cur, "leads"):
        return

    cols = column_names(cur, "leads")
    if {"categoria", "actualizado_en"}.issubset(cols):
        return

    cur.execute("PRAGMA foreign_keys=OFF")
    con.execute("BEGIN")

    # Nueva tabla con el esquema actualizado
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS leads_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
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
          FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE SET NULL
        )
        """
    )

    # Copiar datos antiguos (si existen)
    # Para antiguos leads, ponemos categoria en 'warm' por defecto y actualizado_en = created_at
    cur.execute(
        """
        INSERT INTO leads_new (
          id, bot_id, bot_slug, bot_nombre, interes, email, telefono, telegram_user_id, estado,
          categoria, actualizado_en, created_at
        )
        SELECT
          id, bot_id, bot_slug, bot_nombre,
          interes,
          NULLIF(email, ''),
          NULLIF(telefono, ''),
          telegram_user_id,
          estado,
          'warm',
          COALESCE(created_at, CURRENT_TIMESTAMP),
          COALESCE(created_at, CURRENT_TIMESTAMP)
        FROM leads
        """
    )

    cur.execute("DROP TABLE leads")
    cur.execute("ALTER TABLE leads_new RENAME TO leads")

    con.commit()
    cur.execute("PRAGMA foreign_keys=ON")


def main() -> None:
    print("DB_PATH=", DB_PATH)
    con = sqlite3.connect(DB_PATH)
    try:
        migrate_leads(con)
        print("✅ Migración de leads verificada/aplicada")
    finally:
        con.close()


if __name__ == "__main__":
    main()
