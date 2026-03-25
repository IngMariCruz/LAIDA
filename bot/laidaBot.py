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
STATE_WAIT_SELECTION = "WAIT_SELECTION"
STATE_PRODUCT_DETAILS = "PRODUCT_DETAILS"
STATE_REQUEST_EMAIL = "REQUEST_EMAIL"
STATE_REQUEST_PHONE = "REQUEST_PHONE"
STATE_COMPLETE = "COMPLETE"

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


def get_producto_por_selector(selector: str, productos: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    selector_lower = selector.strip().lower()
    if selector_lower.isdigit():
        idx = int(selector_lower) - 1
        if 0 <= idx < len(productos):
            return productos[idx]
    for producto in productos:
        if selector_lower in str(producto.get("nombre", "")).lower():
            return producto
    return None


def detecta_interes(text: str) -> bool:
    positivos = ["sí", "si", "claro", "por supuesto", "quiero", "interesado", "sí quiero", "vamos"]
    negativos = ["no", "no gracias", "nada", "no me interesa"]
    text_lower = text.lower()
    if any(p in text_lower for p in positivos):
        return True
    if any(n in text_lower for n in negativos):
        return False
    return len(text_lower.strip()) > 2


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
        "selected_product": None,
    }

    if productos:
        user_state[user_id] = STATE_WAIT_SELECTION
        listado = "\n".join([f"{i+1}. {p['nombre']} - ${p['precio']}" for i, p in enumerate(productos)])
        respuesta = (
            f"¡Hola! 👋 Bienvenido a {marca['nombre']}.\n"
            "Estoy encantado de presentarte lo mejor de nuestra marca.\n\n"
            f"{esencia.get('valores', '') if esencia else ''}\n"
            f"{esencia.get('diferencia', '') if esencia else ''}\n\n"
            "Te propongo estas opciones para comenzar:\n"
            f"{listado}\n\n"
            "Escribe el número o el nombre del producto para conocer más detalles y características."
        )
    else:
        user_state[user_id] = STATE_WAIT_INTEREST
        respuesta = (
            f"¡Hola! 👋 Bienvenido a {marca['nombre']}.\n"
            "Aún no tengo productos para mostrarte, pero puedo ayudarte a encontrar lo que necesitas."
            " Cuéntame, ¿qué buscas hoy?"
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

    if state == STATE_WAIT_SELECTION:
        producto = get_producto_por_selector(text, lead_data.get("productos", []))
        if not producto:
            respuesta = "No reconozco ese producto. Por favor escribe el número o el nombre exacto de la lista."
            await update.message.reply_text(respuesta)
            guardar_conversacion(marca_id, user_id, STATE_WAIT_SELECTION, text, respuesta)
            return

        lead_data["selected_product"] = producto
        atributos = get_producto_atributos(producto["id"])
        atributos_texto = "\n".join([f"- {a['nombre']}: {a.get('opciones', 'ver opciones')}" for a in atributos])

        respuesta = (
            f"¡Excelente elección! *{producto['nombre']}* \n"
            f"Precio: ${producto['precio']}\n"
            f"{producto.get('descripcion', 'Descripción no disponible.')}\n\n"
            "Características clave:\n"
            f"{atributos_texto or '- Resistente, de alta calidad, y garantía incluida.'}\n\n"
            "¿Quieres avanzar con este producto? Responde 'sí' para continuar o 'no' para ver otras opciones."
        )
        await update.message.reply_text(respuesta)
        user_state[user_id] = STATE_PRODUCT_DETAILS
        guardar_conversacion(marca_id, user_id, STATE_WAIT_SELECTION, text, respuesta)
        return

    if state == STATE_PRODUCT_DETAILS:
        if detecta_interes(text):
            user_state[user_id] = STATE_REQUEST_EMAIL
            respuesta = "Perfecto, para reservar este producto necesito tu correo electrónico."
            await update.message.reply_text(respuesta)
            guardar_conversacion(marca_id, user_id, STATE_PRODUCT_DETAILS, text, respuesta)
            return

        # rehacer recomendación
        productos = consultar_productos(lead_data["marca_id"])
        lead_data["productos"] = productos
        user_state[user_id] = STATE_WAIT_SELECTION

        listado = "\n".join([f"{i+1}. {p['nombre']} - ${p['precio']}" for i,p in enumerate(productos)])
        respuesta = (
            "Entiendo, aquí tienes otras opciones disponibles:\n\n"
            f"{listado}\n\n"
            "Elige número o nombre nuevamente."
        )
        await update.message.reply_text(respuesta)
        guardar_conversacion(marca_id, user_id, STATE_PRODUCT_DETAILS, text, respuesta)
        return

    if state == STATE_REQUEST_EMAIL:
        if not is_valid_email(text):
            respuesta = "El correo no es válido. Por favor ingresa formato nombre@dominio.com."
            await update.message.reply_text(respuesta)
            guardar_conversacion(marca_id, user_id, STATE_REQUEST_EMAIL, text, respuesta)
            return

        lead_data["email"] = text
        user_state[user_id] = STATE_REQUEST_PHONE

        respuesta = "Genial, ahora comparte tu teléfono (10 dígitos)."
        await update.message.reply_text(respuesta)
        guardar_conversacion(marca_id, user_id, STATE_REQUEST_EMAIL, text, respuesta)
        return

    if state == STATE_REQUEST_PHONE:
        phone = extract_phone(text)
        if not phone:
            respuesta = "No pude validar tu teléfono. Debe ser 10 dígitos numéricos."
            await update.message.reply_text(respuesta)
            guardar_conversacion(marca_id, user_id, STATE_REQUEST_PHONE, text, respuesta)
            return

        lead_data["phone"] = phone

        # Guardar en leads
        try:
            conn = get_connection()
            cursor = conn.cursor()
            datos_producto = lead_data.get("selected_product") or {}
            cursor.execute(
                "INSERT INTO leads (bot_id, bot_slug, bot_nombre, interes, email, telefono, telegram_user_id, estado, categoria, producto_id, detalles_compra, notas) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    lead_data["marca_id"],
                    None,
                    lead_data["marca"]["nombre"],
                    datos_producto.get("nombre", lead_data.get("interest", "") ),
                    lead_data["email"],
                    lead_data["phone"],
                    user_id,
                    "nuevo",
                    "warm",
                    datos_producto.get("id"),
                    None,
                    None,
                ),
            )
            conn.commit()
            conn.close()

            respuesta = (
                f"¡Todo listo! He registrado tu interés en {datos_producto.get('nombre', 'el producto')}.\n"
                "Pronto un asesor se pondrá en contacto contigo."
            )
        except sqlite3.Error as e:
            print(f"❌ Error al guardar lead: {e}")
            respuesta = "Ocurrió un error guardando tus datos. Intenta nuevamente más tarde."

        user_state[user_id] = STATE_COMPLETE
        await update.message.reply_text(respuesta)
        guardar_conversacion(marca_id, user_id, STATE_REQUEST_PHONE, text, respuesta)
        return

    if state == STATE_WAIT_INTEREST:
        lead_data["interest"] = text
        productos = consultar_productos(lead_data["marca_id"])
        lead_data["productos"] = productos

        if productos:
            user_state[user_id] = STATE_WAIT_SELECTION
            listado = "\n".join([f"{i+1}. {p['nombre']} - ${p['precio']}" for i,p in enumerate(productos)])
            respuesta = (
                "¡Perfecto! Con la idea que me diste, te sugiero estos productos:\n"
                f"{listado}\n\n"
                "Escribe número o nombre para conocer más."
            )
        else:
            respuesta = "No hay productos disponibles aún, pero cuéntame más de lo que necesitas."

        await update.message.reply_text(respuesta)
        guardar_conversacion(marca_id, user_id, STATE_WAIT_INTEREST, text, respuesta)
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
