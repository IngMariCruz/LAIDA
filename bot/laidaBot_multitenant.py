#!/usr/bin/env python3
"""
LAIDA Bot - Sistema Multi-Tenant
Bot de Telegram que se conecta a la BD y carga configuración por bot_slug
"""

import os
import re
import sys
import sqlite3
from datetime import datetime
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes, MessageHandler, filters

load_dotenv()

# Configuración de base de datos
DB_PATH = os.getenv("BOT_DB_PATH", "../bd/laida.db")
CONVERSATIONS_DIR = os.getenv("BOT_CONVERSATIONS_DIR", ".")

# Estados del flujo
STATE_WAIT_INTEREST = "WAIT_INTEREST"
STATE_WAIT_EMAIL = "WAIT_EMAIL"
STATE_WAIT_PHONE = "WAIT_PHONE"
STATE_CONFIRM = "CONFIRM"

# Estado global para cada usuario
user_state: Dict[int, str] = {}
user_data: Dict[int, Dict[str, Any]] = {}

# Configuración del bot actual (se carga al iniciar)
bot_config: Optional[Dict[str, Any]] = None


def get_connection() -> sqlite3.Connection:
    """Obtiene una conexión a la base de datos"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def cargar_configuracion_bot(bot_slug: str) -> Optional[Dict[str, Any]]:
    """Carga la configuración del bot desde la base de datos"""
    query = """
        SELECT id, nombre, slug, telegram_token, openai_key, estado
        FROM bots
        WHERE slug = ? AND estado = 'activo'
        LIMIT 1
    """
    
    try:
        with get_connection() as conn:
            row = conn.execute(query, (bot_slug,)).fetchone()
        
        if not row:
            return None
        
        return {
            "id": row["id"],
            "nombre": row["nombre"],
            "slug": row["slug"],
            "telegram_token": row["telegram_token"],
            "openai_key": row["openai_key"],
            "estado": row["estado"],
        }
    except sqlite3.Error as e:
        print(f"❌ Error cargando configuración del bot: {e}")
        return None


def is_valid_email(email: str) -> bool:
    """Valida formato de correo electrónico"""
    return bool(re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email.strip()))


def extract_phone(text: str) -> Optional[str]:
    """Extrae y valida número de teléfono (10 dígitos)"""
    phone = re.sub(r"\D", "", text)
    return phone if len(phone) == 10 else None


def get_conversation_path(bot_id: int) -> str:
    """Obtiene la ruta del archivo de conversaciones para este bot"""
    os.makedirs(CONVERSATIONS_DIR, exist_ok=True)
    return os.path.join(CONVERSATIONS_DIR, f"conversaciones_bot_{bot_id}.txt")


def guardar_conversacion(
    bot_id: int,
    user_id: int,
    estado: str,
    mensaje_usuario: str,
    respuesta_bot: str,
) -> None:
    """Guarda una conversación en el archivo de logs"""
    fecha = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    path = get_conversation_path(bot_id)

    with open(path, "a", encoding="utf-8") as file:
        file.write("====================================\n")
        file.write(f"Fecha: {fecha}\n")
        file.write(f"bot_id: {bot_id}\n")
        file.write(f"user_id: {user_id}\n")
        file.write(f"estado: {estado}\n")
        file.write(f"mensaje_usuario: {mensaje_usuario}\n")
        file.write(f"respuesta_bot: {respuesta_bot}\n\n")


def guardar_lead(bot_id: int, lead_data: Dict[str, Any]) -> bool:
    """Guarda un lead capturado en la base de datos"""
    # TODO: Implementar guardado de leads en BD
    # Por ahora solo registramos en el log
    print(f"📝 Lead capturado para bot {bot_id}: {lead_data}")
    return True


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handler del comando /start"""
    if not update.message or not update.effective_user:
        return

    user_id = update.effective_user.id
    
    if not bot_config:
        await update.message.reply_text("⚠️ Bot no configurado correctamente")
        return

    bot_id = bot_config["id"]
    bot_nombre = bot_config["nombre"]

    # Inicializar datos del usuario
    user_data[user_id] = {
        "bot_id": bot_id,
        "interest": "",
        "email": "",
        "phone": "",
    }
    user_state[user_id] = STATE_WAIT_INTEREST

    respuesta = (
        f"¡Hola! 👋 Bienvenido a {bot_nombre}.\n"
        "Estoy aquí para ayudarte.\n\n"
        "¿En qué producto o servicio estás interesado?"
    )
    
    await update.message.reply_text(respuesta)
    
    guardar_conversacion(
        bot_id=bot_id,
        user_id=user_id,
        estado="WELCOME",
        mensaje_usuario="/start",
        respuesta_bot=respuesta,
    )


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handler de mensajes de texto"""
    if not update.message or not update.effective_user:
        return

    user_id = update.effective_user.id
    text = update.message.text.strip()
    state = user_state.get(user_id)
    lead_data = user_data.get(user_id)

    if not state or not lead_data:
        respuesta = "Escribe /start para comenzar."
        await update.message.reply_text(respuesta)
        return

    if not bot_config:
        await update.message.reply_text("⚠️ Bot no configurado correctamente")
        return

    bot_id = bot_config["id"]

    # Estado: Esperando interés
    if state == STATE_WAIT_INTEREST:
        lead_data["interest"] = text
        user_state[user_id] = STATE_WAIT_EMAIL

        respuesta = "Perfecto. Ahora compárteme tu correo electrónico."
        await update.message.reply_text(respuesta)
        guardar_conversacion(bot_id, user_id, STATE_WAIT_INTEREST, text, respuesta)
        return

    # Estado: Esperando email
    if state == STATE_WAIT_EMAIL:
        if not is_valid_email(text):
            respuesta = "Ese correo no parece válido. Intenta nuevamente con formato nombre@dominio.com"
            await update.message.reply_text(respuesta)
            guardar_conversacion(bot_id, user_id, STATE_WAIT_EMAIL, text, respuesta)
            return

        lead_data["email"] = text
        user_state[user_id] = STATE_WAIT_PHONE

        respuesta = "Gracias. Ahora comparte tu número de teléfono (10 dígitos)."
        await update.message.reply_text(respuesta)
        guardar_conversacion(bot_id, user_id, STATE_WAIT_EMAIL, text, respuesta)
        return

    # Estado: Esperando teléfono
    if state == STATE_WAIT_PHONE:
        phone = extract_phone(text)
        if not phone:
            respuesta = "No pude validar el teléfono. Debe tener 10 dígitos numéricos."
            await update.message.reply_text(respuesta)
            guardar_conversacion(bot_id, user_id, STATE_WAIT_PHONE, text, respuesta)
            return

        lead_data["phone"] = phone
        user_state[user_id] = STATE_CONFIRM

        # Guardar lead en la base de datos
        guardar_lead(bot_id, lead_data)

        respuesta = (
            "¡Gracias! 🎉 Hemos confirmado tus datos:\n\n"
            f"⭐ Interés: {lead_data['interest']}\n"
            f"📧 Correo: {lead_data['email']}\n"
            f"📞 Teléfono: {lead_data['phone']}\n\n"
            "En breve alguien del equipo te contactará."
        )
        await update.message.reply_text(respuesta)
        guardar_conversacion(bot_id, user_id, STATE_CONFIRM, text, respuesta)
        return

    # Estado desconocido
    respuesta = "Escribe /start para reiniciar el flujo."
    await update.message.reply_text(respuesta)
    guardar_conversacion(bot_id, user_id, "UNKNOWN", text, respuesta)


def main(bot_slug: str) -> None:
    """Función principal que inicializa y ejecuta el bot"""
    global bot_config

    print(f"🚀 Iniciando bot con slug: {bot_slug}")

    # Cargar configuración del bot
    bot_config = cargar_configuracion_bot(bot_slug)
    
    if not bot_config:
        print(f"❌ No se encontró un bot activo con slug '{bot_slug}'")
        print("Verifica que el bot exista en la base de datos y esté activo.")
        sys.exit(1)

    token = bot_config["telegram_token"]
    
    if not token:
        print("❌ Token de Telegram no configurado")
        sys.exit(1)

    print(f"✅ Bot configurado: {bot_config['nombre']}")
    print(f"   ID: {bot_config['id']}")
    print(f"   Slug: {bot_config['slug']}")
    print(f"   Estado: {bot_config['estado']}")

    # Crear aplicación de Telegram
    app = Application.builder().token(token).build()

    # Registrar handlers
    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    print(f"🤖 Bot '{bot_config['nombre']}' en ejecución...")
    
    # Ejecutar bot
    app.run_polling()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python laidaBot_multitenant.py <bot_slug>")
        print("Ejemplo: python laidaBot_multitenant.py default")
        sys.exit(1)
    
    bot_slug = sys.argv[1]
    main(bot_slug)
