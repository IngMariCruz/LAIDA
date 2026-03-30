import os
import sqlite3

DB_PATH = os.getenv("BOT_DB_PATH", "../bd/laida.db")

print("DB_PATH=", DB_PATH)

con = sqlite3.connect(DB_PATH)
cur = con.cursor()

cols = cur.execute("PRAGMA table_info(leads)").fetchall()
print("leads columns=", [c[1] for c in cols])

master = cur.execute(
    "SELECT type, name, sql FROM sqlite_master WHERE tbl_name = ? AND type IN ('table','index') ORDER BY type, name",
    ("leads",),
).fetchall()
print("sqlite_master(leads)=")
for row in master:
    print("-", row[0], row[1])
    if row[2]:
        print("  ", row[2])

con.close()
