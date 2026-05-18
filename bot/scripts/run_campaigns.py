#!/usr/bin/env python3
"""Runner for automated campaigns.

This script reads the `campaigns` table and processes any due campaigns.
By default it simply prints the targets, but you can extend it to send
messages via Telegram or email using the existing bot configuration.

Usage:
    BOT_DB_PATH=../bd/laida.db python3 bot/run_campaigns.py

You can schedule it with cron or include it in the Docker compose setup.
"""

import os
import sqlite3
from datetime import datetime
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv

load_dotenv()

# By default look for database relative to project root
# compute absolute path relative to this script file
DEFAULT_DB = os.path.abspath(os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "bd", "laida.db")))
DB_PATH = os.getenv("BOT_DB_PATH", DEFAULT_DB)
# convert to absolute so relative paths from .env still work
DB_PATH = os.path.abspath(DB_PATH)

# if the path from env does not point to a file, fall back to default
if not os.path.exists(DB_PATH):
    print(f"⚠️ Ruta DB from env not found: {DB_PATH}, using default {DEFAULT_DB}")
    DB_PATH = DEFAULT_DB

print(f"Using database at {DB_PATH}")  # debug output


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def fetch_due_campaigns(conn: sqlite3.Connection) -> List[sqlite3.Row]:
    now = datetime.utcnow().isoformat()
    query = """
        SELECT * FROM campaigns
        WHERE ejecutada = 0
          AND (programada_para IS NULL OR programada_para <= ?)
    """
    return conn.execute(query, (now,)).fetchall()


def fetch_leads_for_campaign(conn: sqlite3.Connection, campaign: sqlite3.Row) -> List[sqlite3.Row]:
    qb = ["SELECT * FROM leads WHERE 1=1"]
    params: List[Any] = []
    if campaign["bot_id"] is not None:
        qb.append("AND bot_id = ?")
        params.append(campaign["bot_id"])
    if campaign["categoria_filter"]:
        qb.append("AND categoria = ?")
        params.append(campaign["categoria_filter"])
    sql = " ".join(qb)
    return conn.execute(sql, params).fetchall()


def mark_campaign_executed(conn: sqlite3.Connection, campaign_id: int) -> None:
    conn.execute("UPDATE campaigns SET ejecutada = 1 WHERE id = ?", (campaign_id,))
    conn.commit()


def get_bot_token(conn: sqlite3.Connection, bot_id: Optional[int]) -> Optional[str]:
    if not bot_id:
        return None
    row = conn.execute("SELECT telegram_token FROM bots WHERE id = ? AND estado = 'activo'", (bot_id,)).fetchone()
    return row["telegram_token"] if row else None


def process():
    conn = get_connection()
    due = fetch_due_campaigns(conn)
    if not due:
        print("No hay campañas pendientes.")
        return

    for camp in due:
        print(f"Procesando campaña #{camp['id']} - {camp['nombre']}")
        leads = fetch_leads_for_campaign(conn, camp)
        print(f"  Objetivo: {len(leads)} leads")

        # prepare telegram bot if possible
        bot_token = None
        if camp["bot_id"] is not None:
            bot_token = get_bot_token(conn, camp["bot_id"])
        # if no bot_id on campaign but leads have bot_id, try first lead
        if not bot_token and leads:
            bot_token = get_bot_token(conn, leads[0]["bot_id"])

        telegram_bot = None
        if bot_token:
            try:
                from telegram import Bot as TgBot
                telegram_bot = TgBot(token=bot_token)
            except Exception as e:
                print(f"⚠️ Error inicializando bot de Telegram: {e}")
                telegram_bot = None

        for lead in leads:
            # attempt to send via telegram if we have token and user id
            if telegram_bot and lead.get("telegram_user_id"):
                try:
                    telegram_bot.send_message(chat_id=lead["telegram_user_id"], text=camp["mensaje"])
                    print(f"    📩 Enviado a {lead['telegram_user_id']} ({lead.get('email')})")
                except Exception as e:
                    print(f"    ⚠️ fallo envío a {lead['telegram_user_id']}: {e}")
            else:
                # fallback: just print info
                print(f"    - {lead.get('email')} (bot_id={lead.get('bot_id')} categoria={lead.get('categoria')})")

        # marcar como ejecutada
        mark_campaign_executed(conn, camp['id'])
        print(f"  Campaña marcada como ejecutada")


if __name__ == '__main__':
    process()
