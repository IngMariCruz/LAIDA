import sqlite3
import os

os.makedirs("../bd", exist_ok=True)

conn = sqlite3.connect("../bd/laida.db")
cursor = conn.cursor()

cursor.execute("""
CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT,
    email TEXT,
    phone TEXT,
    interest TEXT,
    source TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
""")

conn.commit()
conn.close()

print("✅ Base de datos creada en /bd")
