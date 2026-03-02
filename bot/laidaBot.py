## hol
import os
import re
import sqlite3
from datetime import datetime
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes, MessageHandler, filters

load_dotenv()

TOKEN = os.getenv("TELEGRAM_TOKEN")
DB_PATH = os.getenv("BOT_DB_PATH", "../bd/laida.db")
CONVERSATIONS_DIR = os.getenv("BOT_CONVERSATIONS_DIR", ".")

if not TOKEN:
    raise ValueError("❌ No se encontró la variable TELEGRAM_TOKEN")

STATE_WAIT_INTEREST = "WAIT_INTEREST"
STATE_WAIT_EMAIL = "WAIT_EMAIL"
STATE_WAIT_PHONE = "WAIT_PHONE"
STATE_CONFIRM = "CONFIRM"

user_state: Dict[int, str] = {}
user_data: Dict[int, Dict[str, Any]] = {}


def is_valid_email(email: str) -> bool:
    return bool(re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email.strip()))


def extract_phone(text: str) -> Optional[str]:
    phone = re.sub(r"\D", "", text)
    return phone if len(phone) == 10 else None


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def consultar_marca(marca_id: int) -> Optional[Dict[str, Any]]:
    query = "SELECT id, nombre FROM marca WHERE id = ? LIMIT 1"
    with get_connection() as conn:
        row = conn.execute(query, (marca_id,)).fetchone()
    return dict(row) if row else None


def consultar_esencia(marca_id: int) -> Optional[Dict[str, Any]]:
    query = "SELECT marca_id, valores, diferencia, historia FROM esencia WHERE marca_id = ? LIMIT 1"
    with get_connection() as conn:
        row = conn.execute(query, (marca_id,)).fetchone()
    return dict(row) if row else None


def consultar_productos(marca_id: int) -> List[Dict[str, Any]]:
    query = "SELECT marca_id, nombre, precio FROM productos WHERE marca_id = ? ORDER BY id ASC"
    with get_connection() as conn:
        rows = conn.execute(query, (marca_id,)).fetchall()
    return [dict(row) for row in rows]


def get_conversation_path(marca_id: int) -> str:
    os.makedirs(CONVERSATIONS_DIR, exist_ok=True)
    return os.path.join(CONVERSATIONS_DIR, f"conversaciones_marca_{marca_id}.txt")


def guardar_conversacion(
    marca_id: int,
    user_id: int,
    estado: str,
    mensaje_usuario: str,
    respuesta_bot: str,
) -> None:
    fecha = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    path = get_conversation_path(marca_id)

    with open(path, "a", encoding="utf-8") as file:
        file.write("====================================\n")
        file.write(f"Fecha: {fecha}\n")
        file.write(f"marca_id: {marca_id}\n")
        file.write(f"user_id: {user_id}\n")
        file.write(f"estado: {estado}\n")
        file.write(f"mensaje_usuario: {mensaje_usuario}\n")
        file.write(f"respuesta_bot: {respuesta_bot}\n\n")


def construir_contexto_dinamico(marca: Dict[str, Any], esencia: Optional[Dict[str, Any]], productos: List[Dict[str, Any]]) -> str:
    valores = esencia.get("valores") if esencia else "No definido"
    diferencia = esencia.get("diferencia") if esencia else "No definida"
    historia = esencia.get("historia") if esencia else "No definida"

    if productos:
        lista_productos = "\n".join(
            [f"- {producto['nombre']} (${producto['precio']})" for producto in productos]
        )
    else:
        lista_productos = "- Sin productos registrados"

    return (
        f"Marca: {marca['nombre']}\n"
        f"Valores: {valores}\n"
        f"Diferencia: {diferencia}\n"
        f"Historia: {historia}\n"
        f"Productos:\n{lista_productos}"
    )


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not update.message or not update.effective_user:
        return

    user_id = update.effective_user.id
    raw_args = context.args

    if not raw_args:
        respuesta = "Uso correcto: /start <marca_id>\nEjemplo: /start 3"
        await update.message.reply_text(respuesta)
        return

    try:
        marca_id = int(raw_args[0])
    except ValueError:
        respuesta = "El marca_id debe ser numérico. Ejemplo: /start 3"
        await update.message.reply_text(respuesta)
        return

    try:
        marca = consultar_marca(marca_id)
    except sqlite3.Error:
        respuesta = "No pude consultar la base de datos. Intenta nuevamente más tarde."
        await update.message.reply_text(respuesta)
        return

    if not marca:
        respuesta = f"No existe una marca con id {marca_id}. Verifica el enlace de inicio."
        await update.message.reply_text(respuesta)
        return

    try:
        esencia = consultar_esencia(marca_id)
        productos = consultar_productos(marca_id)
    except sqlite3.Error:
        respuesta = "No pude cargar la configuración de la marca. Intenta nuevamente más tarde."
        await update.message.reply_text(respuesta)
        return

    contexto_dinamico = construir_contexto_dinamico(marca, esencia, productos)

    user_data[user_id] = {
        "marca_id": marca_id,
        "marca": marca,
        "esencia": esencia,
        "productos": productos,
        "contexto_dinamico": contexto_dinamico,
        "interest": "",
        "email": "",
        "phone": "",
    }
    user_state[user_id] = STATE_WAIT_INTEREST

    respuesta = (
        f"¡Hola! 👋 Bienvenido a {marca['nombre']}.\n"
        "Estoy aquí para ayudarte.\n\n"
        "¿En qué producto estás interesado hoy?"
    )
    await update.message.reply_text(respuesta)

    guardar_conversacion(
        marca_id=marca_id,
        user_id=user_id,
        estado="WELCOME",
        mensaje_usuario=f"/start {marca_id}",
        respuesta_bot=respuesta,
    )


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not update.message or not update.effective_user:
        return

    user_id = update.effective_user.id
    text = update.message.text.strip()
    state = user_state.get(user_id)
    lead_data = user_data.get(user_id)

    if not state or not lead_data:
        respuesta = "Escribe /start <marca_id> para comenzar. Ejemplo: /start 3"
        await update.message.reply_text(respuesta)
        return

    marca_id = lead_data["marca_id"]

    if state == STATE_WAIT_INTEREST:
        lead_data["interest"] = text
        user_state[user_id] = STATE_WAIT_EMAIL

        respuesta = "Perfecto. Ahora compárteme tu correo electrónico."
        await update.message.reply_text(respuesta)
        guardar_conversacion(marca_id, user_id, STATE_WAIT_INTEREST, text, respuesta)
        return

    if state == STATE_WAIT_EMAIL:
        if not is_valid_email(text):
            respuesta = "Ese correo no parece válido. Intenta nuevamente con formato nombre@dominio.com"
            await update.message.reply_text(respuesta)
            guardar_conversacion(marca_id, user_id, STATE_WAIT_EMAIL, text, respuesta)
            return

        lead_data["email"] = text
        user_state[user_id] = STATE_WAIT_PHONE

        respuesta = "Gracias. Ahora comparte tu número de teléfono (10 dígitos)."
        await update.message.reply_text(respuesta)
        guardar_conversacion(marca_id, user_id, STATE_WAIT_EMAIL, text, respuesta)
        return

    if state == STATE_WAIT_PHONE:
        phone = extract_phone(text)
        if not phone:
            respuesta = "No pude validar el teléfono. Debe tener 10 dígitos numéricos."
            await update.message.reply_text(respuesta)
            guardar_conversacion(marca_id, user_id, STATE_WAIT_PHONE, text, respuesta)
            return

        lead_data["phone"] = phone
        user_state[user_id] = STATE_CONFIRM

        marca_nombre = lead_data["marca"]["nombre"]
        respuesta = (
            "¡Gracias! 🎉 Hemos confirmado tus datos:\n\n"
            f"🏢 Marca: {marca_nombre}\n"
            f"⭐ Interés: {lead_data['interest']}\n"
            f"📧 Correo: {lead_data['email']}\n"
            f"📞 Teléfono: {lead_data['phone']}\n\n"
            "En breve alguien del equipo te contactará."
        )
        await update.message.reply_text(respuesta)
        guardar_conversacion(marca_id, user_id, STATE_CONFIRM, text, respuesta)
        return

    respuesta = "Escribe /start <marca_id> para reiniciar el flujo."
    await update.message.reply_text(respuesta)
    guardar_conversacion(marca_id, user_id, "UNKNOWN", text, respuesta)


def main() -> None:
    app = Application.builder().token(TOKEN).build()

    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    print("🤖 Bot multi-marca en ejecución...")
    app.run_polling()


if __name__ == "__main__":
    main()
