#!/usr/bin/env python3
"""
LAIDA Bot Manager
Gestor que ejecuta múltiples bots en paralelo según la configuración de la BD
"""

import os
import sys
import sqlite3
import subprocess
import time
import signal
from typing import Dict, List
from multiprocessing import Process

DB_PATH = os.getenv("BOT_DB_PATH", "../bd/laida.db")


def get_connection() -> sqlite3.Connection:
    """Obtiene una conexión a la base de datos"""
    conn = sqlite3.Connection(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def cargar_bots_activos() -> List[Dict]:
    """Carga todos los bots activos desde la base de datos"""
    query = """
        SELECT id, nombre, slug, telegram_token, estado
        FROM bots
        WHERE estado = 'activo'
        ORDER BY id ASC
    """
    
    try:
        with get_connection() as conn:
            rows = conn.execute(query).fetchall()
        
        return [dict(row) for row in rows]
    except sqlite3.Error as e:
        print(f"❌ Error cargando bots: {e}")
        return []


def ejecutar_bot(bot_id: int):
    """Ejecuta un bot en un proceso separado"""
    print(f"🚀 Iniciando proceso para bot id: {bot_id}")

    # bot_launcher decide si usar GPT o modo básico según la openai_key en BD
    subprocess.run([
        sys.executable,
        "bot_launcher.py",
        str(bot_id)
    ])


def main():
    """Función principal del gestor"""
    print("=" * 60)
    print("LAIDA Bot Manager - Sistema Multi-Tenant")
    print("=" * 60)
    
    # Esperar hasta que haya bots activos (la BD puede no estar lista al arrancar)
    bots = []
    while not bots:
        bots = cargar_bots_activos()
        if not bots:
            print("⏳ No hay bots activos. Reintentando en 10 segundos...")
            time.sleep(10)
    
    print(f"\n✅ Se encontraron {len(bots)} bot(s) activo(s):")
    for bot in bots:
        print(f"   - {bot['nombre']} (slug: {bot['slug']})")
    
    # Crear un proceso para cada bot
    procesos = []
    
    for bot in bots:
        proceso = Process(target=ejecutar_bot, args=(bot['id'],))
        proceso.start()
        procesos.append(proceso)
        print(f"✓ Proceso iniciado para '{bot['nombre']}' (id={bot['id']})")
    
    print(f"\n🤖 {len(procesos)} bot(s) en ejecución...")
    print("Presiona Ctrl+C para detener todos los bots\n")
    
    # Esperar a que todos los procesos terminen
    try:
        for proceso in procesos:
            proceso.join()
    except KeyboardInterrupt:
        print("\n\n⚠️  Deteniendo todos los bots...")
        for proceso in procesos:
            proceso.terminate()
            proceso.join()
        print("✓ Todos los bots han sido detenidos")


if __name__ == "__main__":
    main()
