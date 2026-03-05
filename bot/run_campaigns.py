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

DB_PATH = os.getenv("BOT_DB_PATH", "../bd/laida.db")


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
        # Aquí podrías integrar con Telegram/email para enviar el mensaje a cada lead
        for lead in leads:
            # sample output
            print(f"    - {lead['email']} (bot_id={lead['bot_id']} categoria={lead['categoria']})")

        # marcar como ejecutada
        mark_campaign_executed(conn, camp['id'])
        print(f"  Campaña marcada como ejecutada")


if __name__ == '__main__':
    process()
