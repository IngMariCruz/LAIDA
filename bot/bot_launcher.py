#!/usr/bin/env python3
"""
Bot Manager - LAIDA Multi-tenant Bot System
Este script ejecuta un bot específico leyendo su configuración desde la base de datos.
Cada bot tiene su propio telegram_token y openai_key.

Uso:
    python3 bot_launcher.py <bot_id>
    
Ejemplo:
    python3 bot_launcher.py 1
"""

import os
import sys
import sqlite3
from typing import Optional, Dict, Any

# Configuración de base de datos
DB_PATH = os.getenv("BOT_DB_PATH", "../bd/laida.db")


def get_bot_config(bot_id: int) -> Optional[Dict[str, Any]]:
    """Obtener configuración del bot desde la base de datos"""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, nombre, slug, telegram_token, openai_key, estado
            FROM bots
            WHERE id = ?
        """, (bot_id,))
        
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            return None
        
        return dict(row)
    except Exception as e:
        print(f"❌ Error al obtener configuración del bot: {e}")
        return None


def validate_bot_config(config: Dict[str, Any]) -> tuple[bool, str]:
    """Validar que la configuración del bot sea válida"""
    if not config.get("telegram_token"):
        return False, "El bot no tiene configurado telegram_token"
    
    if config.get("estado") != "activo":
        return False, f"El bot está en estado '{config.get('estado')}', debe estar 'activo'"
    
    return True, "OK"


def main():
    """Función principal"""
    if len(sys.argv) < 2:
        print("❌ Uso: python3 bot_launcher.py <bot_id>")
        print("   Ejemplo: python3 bot_launcher.py 1")
        sys.exit(1)
    
    try:
        bot_id = int(sys.argv[1])
    except ValueError:
        print("❌ Error: bot_id debe ser un número")
        sys.exit(1)
    
    print(f"🔍 Cargando configuración del bot {bot_id}...")
    
    # Obtener configuración del bot
    config = get_bot_config(bot_id)
    
    if not config:
        print(f"❌ Error: No se encontró el bot con id {bot_id}")
        print("   Verifica que el bot exista en la base de datos")
        sys.exit(1)
    
    # Validar configuración
    valid, msg = validate_bot_config(config)
    if not valid:
        print(f"❌ Error: {msg}")
        sys.exit(1)
    
    print(f"✅ Bot encontrado: {config['nombre']} (@{config['slug']})")
    print(f"   Estado: {config['estado']}")
    print(f"   Telegram Token: {'✅ Configurado' if config['telegram_token'] else '❌ Falta'}")
    print(f"   OpenAI Key: {'✅ Configurado' if config.get('openai_key') else '⚠️  No configurado (modo básico)'}")
    
    # Exportar configuración como variables de entorno
    os.environ["TELEGRAM_TOKEN"] = config["telegram_token"]
    os.environ["BOT_ID"] = str(config["id"])
    os.environ["BOT_NOMBRE"] = config["nombre"]
    os.environ["BOT_SLUG"] = config["slug"]
    
    if config.get("openai_key"):
        os.environ["OPENAI_API_KEY"] = config["openai_key"]
    
    # Decidir qué bot ejecutar según si tiene OpenAI configurado
    if config.get("openai_key"):
        print("\n🧠 Iniciando bot con inteligencia GPT...\n")
        # Importar y ejecutar bot con GPT
        try:
            from laidaBot_gpt import main as run_gpt_bot
            run_gpt_bot()
        except ImportError:
            print("❌ Error: No se pudo importar laidaBot_gpt.py")
            print("   Asegúrate de que el archivo existe y las dependencias están instaladas")
            sys.exit(1)
    else:
        print("\n🤖 Iniciando bot básico (sin GPT)...\n")
        # Importar y ejecutar bot básico
        try:
            from laidaBot_conversacional import main as run_basic_bot
            run_basic_bot()
        except ImportError:
            print("❌ Error: No se pudo importar laidaBot_conversacional.py")
            print("   Asegúrate de que el archivo existe y las dependencias están instaladas")
            sys.exit(1)


if __name__ == "__main__":
    main()
