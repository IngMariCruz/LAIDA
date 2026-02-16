from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, ContextTypes, filters
import re
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()  # Carga el .env

TOKEN = os.getenv("TELEGRAM_TOKEN")
CONVERSATIONS_PATH = os.getenv("CONVERSATIONS_PATH", "conversaciones.txt")

if not TOKEN:
    raise ValueError("❌ No se encontró el TELEGRAM_TOKEN") # Reemplaza con tu token real

# Estados y datos en memoria
user_state = {}
user_data = {}

# ---------- UTILIDADES ----------

def is_valid_email(email):
    return re.match(r"[^@]+@[^@]+\.[^@]+", email)

def extract_phone(text):
    phone = re.sub(r"\D", "", text)
    return phone if len(phone) == 10 else None

def guardar_conversacion(user_id, estado, mensaje_usuario, respuesta_bot, nombre=None):
    fecha = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    with open(CONVERSATIONS_PATH, "a", encoding="utf-8") as f:
        f.write("====================================\n")
        f.write(f"Fecha: {fecha}\n")
        f.write(f"User ID: {user_id}\n")
        if nombre:
            f.write(f"Nombre: {nombre}\n")
        f.write(f"Estado: {estado}\n")
        f.write(f"Usuario: {mensaje_usuario}\n")
        f.write(f"Bot: {respuesta_bot}\n\n")

# ---------- COMANDOS ----------

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id

    user_state[user_id] = "WAIT_NAME"
    user_data[user_id] = {}

    respuesta = (
        "Hola 👋\n"
        "Antes de continuar, ¿cómo te llamas?"
    )

    await update.message.reply_text(respuesta)

    guardar_conversacion(
        user_id=user_id,
        estado="START",
        mensaje_usuario="/start",
        respuesta_bot=respuesta
    )

# ---------- MENSAJES ----------

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    text = update.message.text.strip()
    state = user_state.get(user_id)

    # 1️⃣ Nombre
    if state == "WAIT_NAME":
        user_data[user_id]["name"] = text
        user_state[user_id] = "WAIT_INTEREST"

        respuesta = (
            f"Encantada, {text} 😊\n"
            "Cuéntame, ¿en qué producto o servicio estás interesado?"
        )

        await update.message.reply_text(respuesta)

        guardar_conversacion(
            user_id=user_id,
            estado="WAIT_NAME",
            mensaje_usuario=text,
            respuesta_bot=respuesta,
            nombre=text
        )

    # 2️⃣ Interés
    elif state == "WAIT_INTEREST":
        user_data[user_id]["interest"] = text
        user_state[user_id] = "WAIT_EMAIL"

        respuesta = (
            "Perfecto 👍\n"
            "Ahora dime tu correo electrónico."
        )

        await update.message.reply_text(respuesta)

        guardar_conversacion(
            user_id=user_id,
            estado="WAIT_INTEREST",
            mensaje_usuario=text,
            respuesta_bot=respuesta,
            nombre=user_data[user_id].get("name")
        )

    # 3️⃣ Email
    elif state == "WAIT_EMAIL":
        if not is_valid_email(text):
            respuesta = (
                "Ese correo no parece válido 😅\n"
                "Intenta de nuevo, por favor."
            )
            await update.message.reply_text(respuesta)

            guardar_conversacion(
                user_id=user_id,
                estado="WAIT_EMAIL",
                mensaje_usuario=text,
                respuesta_bot=respuesta,
                nombre=user_data[user_id].get("name")
            )
            return

        user_data[user_id]["email"] = text
        user_state[user_id] = "WAIT_PHONE"

        respuesta = (
            "¡Gracias! 📧\n"
            "Por último, ¿cuál es tu número de teléfono?"
        )

        await update.message.reply_text(respuesta)

        guardar_conversacion(
            user_id=user_id,
            estado="WAIT_EMAIL",
            mensaje_usuario=text,
            respuesta_bot=respuesta,
            nombre=user_data[user_id].get("name")
        )

    # 4️⃣ Teléfono
    elif state == "WAIT_PHONE":
        phone = extract_phone(text)
        if not phone:
            respuesta = (
                "No pude identificar un número válido 😕\n"
                "Por favor escríbelo nuevamente."
            )
            await update.message.reply_text(respuesta)

            guardar_conversacion(
                user_id=user_id,
                estado="WAIT_PHONE",
                mensaje_usuario=text,
                respuesta_bot=respuesta,
                nombre=user_data[user_id].get("name")
            )
            return

        user_data[user_id]["phone"] = phone
        user_state[user_id] = "DONE"

        lead = user_data[user_id]

        respuesta = (
            "¡Gracias! 🎉\n"
            "Hemos registrado tu información:\n\n"
            f"👤 Nombre: {lead['name']}\n"
            f"⭐ Interés: {lead['interest']}\n"
            f"📧 Correo: {lead['email']}\n"
            f"📞 Teléfono: {lead['phone']}\n\n"
            "En breve alguien del equipo se pondrá en contacto contigo."
        )

        await update.message.reply_text(respuesta)

        guardar_conversacion(
            user_id=user_id,
            estado="DONE",
            mensaje_usuario=text,
            respuesta_bot=respuesta,
            nombre=lead["name"]
        )

    else:
        respuesta = "Escribe /start para comenzar 😊"
        await update.message.reply_text(respuesta)

        guardar_conversacion(
            user_id=user_id,
            estado="UNKNOWN",
            mensaje_usuario=text,
            respuesta_bot=respuesta
        )

# ---------- MAIN ----------

def main():
    app = Application.builder().token(TOKEN).build()

    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    print("🤖 Bot capturando leads y guardando conversaciones...")
    app.run_polling()

if __name__ == "__main__":
    main()
