#!/usr/bin/env python3
"""
LAIDA Bot - Sistema Multi-Tenant
Flujo de 6 pasos:
  1. Obtener contexto (config + esencia + productos desde BD)
  2. El lead escribe al bot (/start)
  3. Dar mensaje de bienvenida
  4. Preguntar interés
  5. Capturar interés y mostrar producto
  6. Almacenar datos del lead (email + teléfono)
"""

import os
import re
import sys
import sqlite3
import random
from datetime import datetime
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes, MessageHandler, filters

load_dotenv()

DB_PATH = os.getenv("BOT_DB_PATH", "../bd/laida.db")
CONVERSATIONS_DIR = os.getenv("BOT_CONVERSATIONS_DIR", ".")

# ── Estados del flujo ──────────────────────────────────────────────────────────
STATE_WAIT_INTEREST  = "WAIT_INTEREST"   # Paso 4: preguntar interés
STATE_WAIT_SELECTION = "WAIT_SELECTION"  # Paso 5a: elegir producto de lista
STATE_PRODUCT_DETAIL = "PRODUCT_DETAIL"  # Paso 5b: confirmar producto elegido
STATE_GET_EMAIL      = "GET_EMAIL"       # Paso 6a: capturar email
STATE_GET_PHONE      = "GET_PHONE"       # Paso 6b: capturar teléfono
STATE_DONE           = "DONE"            # Flujo completado

user_state: Dict[int, str] = {}
user_data:  Dict[int, Dict[str, Any]] = {}

bot_config: Optional[Dict[str, Any]] = None


# ── Base de datos ──────────────────────────────────────────────────────────────

def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


# PASO 1 ── Obtener contexto completo del bot
def cargar_configuracion_bot(bot_slug: str) -> Optional[Dict[str, Any]]:
    """
    Carga config del bot + mensajes de flujo + esencia de marca desde la BD.
    """
    query = """
        SELECT
            b.id,
            b.nombre,
            b.slug,
            b.telegram_token,
            b.openai_key,
            b.estado,
            b.manager_id,
            f.mensaje_bienvenida        AS flujo_bienvenida,
            f.mensaje_sin_interes,
            f.mensaje_productos,
            f.mensaje_caracteristicas,
            f.mensaje_confirmacion,
            f.mensaje_agradecimiento,
            f.mostrar_productos_inicio,
            f.max_productos_mostrar,
            c.mensaje_bienvenida        AS config_bienvenida,
            e.valores                   AS esencia_valores,
            e.diferencia                AS esencia_diferencia,
            e.historia                  AS esencia_historia
        FROM bots b
        LEFT JOIN bot_flow_config f ON f.bot_id = b.id
        LEFT JOIN config_bot c      ON c.marca_id = b.manager_id
        LEFT JOIN esencia e          ON e.marca_id = b.manager_id
        WHERE b.slug = ? AND b.estado = 'activo'
        LIMIT 1
    """
    try:
        with get_connection() as conn:
            row = conn.execute(query, (bot_slug,)).fetchone()
        if not row:
            return None

        bienvenida = (
            row["flujo_bienvenida"]
            or row["config_bienvenida"]
            or f"¡Hola! 👋 Soy el asistente de *{row['nombre']}*. Estoy aquí para ayudarte."
        )

        return {
            "id":                    row["id"],
            "nombre":                row["nombre"],
            "slug":                  row["slug"],
            "telegram_token":        row["telegram_token"],
            "openai_key":            row["openai_key"],
            "estado":                row["estado"],
            "manager_id":            row["manager_id"],
            "mensaje_bienvenida":    bienvenida,
            "mensaje_sin_interes":   row["mensaje_sin_interes"]    or "Entendido, si en algún momento necesitas algo aquí estaré. 😊",
            "mensaje_productos":     row["mensaje_productos"]       or "Basado en lo que buscas, te recomiendo:",
            "mensaje_caracteristicas": row["mensaje_caracteristicas"] or "Aquí tienes los detalles:",
            "mensaje_confirmacion":  row["mensaje_confirmacion"]    or "Perfecto, solo necesito un par de datos para completar tu registro.",
            "mensaje_agradecimiento": row["mensaje_agradecimiento"] or "¡Listo! 🎉 Nuestro equipo te contactará pronto.",
            "mostrar_productos_inicio": bool(row["mostrar_productos_inicio"] if row["mostrar_productos_inicio"] is not None else 1),
            "max_productos":         row["max_productos_mostrar"] or 20,
            "esencia_valores":       row["esencia_valores"],
            "esencia_diferencia":    row["esencia_diferencia"],
            "esencia_historia":      row["esencia_historia"],
        }
    except sqlite3.Error as e:
        print(f"❌ Error cargando configuración del bot: {e}")
        return None


def get_productos(bot_id: int, limit: int = 4, filtro: str = "") -> List[Dict[str, Any]]:
    """Carga productos activos del bot; filtra por nombre/descripción si se indica."""
    try:
        with get_connection() as conn:
            if filtro:
                like = f"%{filtro.lower()}%"
                rows = conn.execute(
                    """SELECT * FROM productos
                       WHERE marca_id = ? AND activo = 1
                         AND (LOWER(nombre) LIKE ? OR LOWER(descripcion) LIKE ?)
                       ORDER BY fecha_registro DESC LIMIT ?""",
                    (bot_id, like, like, limit),
                ).fetchall()
                if rows:
                    return [dict(r) for r in rows]

            rows = conn.execute(
                "SELECT * FROM productos WHERE marca_id = ? AND activo = 1 ORDER BY fecha_registro DESC LIMIT ?",
                (bot_id, limit),
            ).fetchall()
            return [dict(r) for r in rows]
    except sqlite3.Error as e:
        print(f"❌ Error cargando productos: {e}")
        return []


def buscar_producto(selector: str, productos: List[Dict]) -> Optional[Dict]:
    s = selector.strip().lower()
    if s.isdigit():
        idx = int(s) - 1
        if 0 <= idx < len(productos):
            return productos[idx]
    # Coincidencia exacta: el texto del usuario == nombre del producto
    for p in productos:
        if s == p.get("nombre", "").lower():
            return p
    # El nombre del producto está contenido en el mensaje del usuario
    for p in productos:
        nombre = p.get("nombre", "").lower()
        if nombre and nombre in s:
            return p
    # El texto del usuario está contenido en el nombre del producto
    for p in productos:
        if s and s in p.get("nombre", "").lower():
            return p
    return None


def detecta_interes(text: str) -> bool:
    t = text.lower()
    if any(w in t for w in ["sí", "si", "claro", "quiero", "me interesa", "adelante", "vamos"]):
        return True
    if any(w in t for w in ["no", "nada", "no gracias", "paso"]):
        return False
    return len(t.strip()) > 2


def is_valid_email(email: str) -> bool:
    return bool(re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email.strip()))


def extract_phone(text: str) -> Optional[str]:
    digits = re.sub(r"\D", "", text)
    return digits if len(digits) == 10 else None


def extraer_categoria(producto: Dict) -> str:
    """Extrae la categoría desde la descripción del producto."""
    desc = producto.get("descripcion") or ""
    for parte in desc.split("|"):
        parte = parte.strip()
        if parte.lower().startswith("categoría:") or parte.lower().startswith("categoria:"):
            return parte.split(":", 1)[1].strip().upper()
    return "OTROS"


def formato_productos(productos: List[Dict]) -> str:
    """Lista numerada agrupada por categoría."""
    # Agrupar
    grupos: Dict[str, List[tuple]] = {}
    for i, p in enumerate(productos):
        cat = extraer_categoria(p)
        grupos.setdefault(cat, []).append((i + 1, p))

    lineas = []
    for cat, items in grupos.items():
        lineas.append(f"🔹 *{cat}*")
        for num, p in items:
            precio = f"${int(p['precio']):,}".replace(",", ".") if p["precio"] else "Consultar"
            lineas.append(f"  {num}. {p['nombre']} — {precio}")
        lineas.append("")

    return "\n".join(lineas).strip()


# ── Detalle de producto ────────────────────────────────────────────────────────

def _formatear_caracteristicas(descripcion: str) -> str:
    """
    Convierte la descripción del producto en características legibles.
    Formato esperado: "desc principal | Categoría: X | Material: Y | Colores: Z | ..."
    """
    if not descripcion:
        return ""
    partes = [p.strip() for p in descripcion.split("|")]
    lineas = []
    for parte in partes:
        if ":" in parte:
            clave, valor = parte.split(":", 1)
            lineas.append(f"• *{clave.strip()}:* {valor.strip()}")
        elif parte:
            lineas.append(parte)
    return "\n".join(lineas)


async def _mostrar_detalle_producto(
    update: Update,
    producto: Dict,
    cfg: Dict,
    bot_id: int,
    uid: int,
    texto_usuario: str,
) -> None:
    """Muestra características completas de un producto e invita a comprar."""
    precio_fmt = f"${int(producto['precio']):,}".replace(",", ".") if producto.get("precio") else "Consultar"
    caracteristicas = _formatear_caracteristicas(producto.get("descripcion") or "")

    respuesta = (
        f"{cfg.get('mensaje_caracteristicas', '¡Excelente elección!')}\n\n"
        f"🏷️ *{producto['nombre']}*\n"
        f"💰 Precio: *{precio_fmt}*\n"
    )
    if caracteristicas:
        respuesta += f"\n{caracteristicas}\n"

    respuesta += (
        f"\n¿Te gustaría adquirir *{producto['nombre']}*? "
        "Responde *sí* para continuar o *no* para ver otras opciones. 😊"
    )
    await update.message.reply_text(respuesta, parse_mode="Markdown")
    log_conversacion(bot_id, uid, "DETALLE_PRODUCTO", texto_usuario, respuesta)


# ── Persistencia ───────────────────────────────────────────────────────────────

def log_conversacion(bot_id: int, user_id: int, estado: str, msg_user: str, msg_bot: str) -> None:
    os.makedirs(CONVERSATIONS_DIR, exist_ok=True)
    path = os.path.join(CONVERSATIONS_DIR, f"conversaciones_bot_{bot_id}.txt")
    with open(path, "a", encoding="utf-8") as f:
        f.write(f"[{datetime.now():%Y-%m-%d %H:%M:%S}] bot={bot_id} user={user_id} estado={estado}\n")
        f.write(f"  >>> {msg_user}\n  <<< {msg_bot}\n\n")


# PASO 6 ── Guardar lead en BD
def guardar_lead(bot_id: int, data: Dict[str, Any]) -> bool:
    try:
        producto = data.get("producto") or {}
        with get_connection() as conn:
            conn.execute(
                """INSERT INTO leads
                     (bot_id, bot_slug, bot_nombre, interes, email, telefono,
                      telegram_user_id, estado, categoria, producto_id, notas)
                   VALUES (?, ?, ?, ?, ?, ?, ?, 'nuevo', 'warm', ?, ?)""",
                (
                    bot_id,
                    bot_config.get("slug") if bot_config else None,
                    bot_config.get("nombre") if bot_config else None,
                    data.get("interes") or producto.get("nombre"),
                    data.get("email"),
                    data.get("telefono"),
                    data.get("telegram_user_id"),
                    producto.get("id"),
                    data.get("notas"),
                ),
            )
            conn.commit()
        print(f"✅ Lead guardado — bot {bot_id} | {data.get('email', '?')}")
        return True
    except sqlite3.Error as e:
        print(f"❌ Error guardando lead: {e}")
        return False


# ── Handlers de Telegram ───────────────────────────────────────────────────────

# PASOS 2 y 3 ── Lead escribe /start → bienvenida
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not update.message or not update.effective_user:
        return

    uid = update.effective_user.id

    # Recargar config desde BD en cada /start para reflejar cambios del dashboard
    global bot_config
    if bot_config:
        config_fresca = cargar_configuracion_bot(bot_config["slug"])
        if config_fresca:
            bot_config = config_fresca

    if not bot_config:
        await update.message.reply_text("⚠️ Bot no configurado correctamente.")
        return

    # Inicializar sesión del usuario
    user_data[uid] = {
        "telegram_user_id": uid,
        "interes": "",
        "producto": None,
        "email": "",
        "telefono": "",
        "notas": "",
    }

    bot_id   = bot_config["id"]
    max_prod = int(bot_config.get("max_productos", 4))

    # PASO 3 ── Mensaje de bienvenida + pregunta interés
    bienvenida = bot_config["mensaje_bienvenida"]
    msg1 = f"{bienvenida}\n\n¿En qué producto o servicio estás interesado hoy?"
    user_state[uid] = STATE_WAIT_INTEREST

    await update.message.reply_text(msg1, parse_mode="Markdown")
    log_conversacion(bot_id, uid, "START", "/start", msg1)

    # Segundo mensaje con productos destacados (4-6 aleatorios)
    todos = get_productos(bot_id, 100)
    if todos:
        n = random.randint(4, min(6, len(todos)))
        destacados = random.sample(todos, n)
        user_data[uid]["productos_lista"] = destacados
        user_data[uid]["todos_productos"] = todos
        listado = formato_productos(destacados)
        msg2 = (
            f"✨ *Algunos de nuestros productos destacados:*\n\n"
            f"{listado}\n\n"
            "Escribe el *número* o *nombre* de uno para saber más, "
            "o cuéntame qué estás buscando.\n"
            "También puedes escribir *\"ver todos\"* para ver el catálogo completo. 😊"
        )
        await update.message.reply_text(msg2, parse_mode="Markdown")
        log_conversacion(bot_id, uid, "START_SUGERENCIA", "/start", msg2)


# PASO 4-6 ── Manejo del flujo conversacional
async def handle_message(update: Update, _context: ContextTypes.DEFAULT_TYPE) -> None:
    if not update.message or not update.effective_user:
        return

    uid   = update.effective_user.id
    text  = update.message.text.strip()
    state = user_state.get(uid)
    data  = user_data.get(uid)

    if not bot_config:
        await update.message.reply_text("⚠️ Bot no configurado correctamente.")
        return

    if not state or not data:
        await update.message.reply_text("Escribe /start para comenzar.")
        return

    bot_id   = bot_config["id"]
    max_prod = int(bot_config.get("max_productos", 4))

    # ── "ver todos" desde cualquier estado activo ─────────────────────────────
    VER_TODOS = ["ver todos", "todos", "mostrar todos", "otros productos", "ver más", "ver mas", "más productos", "mas productos"]
    if text.lower().strip() in VER_TODOS and state not in (STATE_GET_EMAIL, STATE_GET_PHONE, STATE_DONE):
        todos = data.get("todos_productos") or get_productos(bot_id, 100)
        data["productos_lista"] = todos
        data["todos_productos"] = todos
        listado = formato_productos(todos)
        respuesta = (
            f"📋 *Catálogo completo ({len(todos)} productos):*\n\n"
            f"{listado}\n\n"
            "Escribe el *número* o *nombre* del que te interese. 😊"
        )
        user_state[uid] = STATE_WAIT_SELECTION
        await update.message.reply_text(respuesta, parse_mode="Markdown")
        log_conversacion(bot_id, uid, "VER_TODOS", text, respuesta)
        return

    # ── PASO 4 completado: capturar interés y mostrar productos ──────────────
    if state == STATE_WAIT_INTEREST:
        data["interes"] = text

        # Buscar en TODOS los productos (sugeridos + todos los de la marca)
        todos = data.get("todos_productos") or get_productos(bot_id, 100)
        data["todos_productos"] = todos
        producto_directo = buscar_producto(text, todos)

        if producto_directo:
            data["producto"] = producto_directo
            user_state[uid] = STATE_PRODUCT_DETAIL
            await _mostrar_detalle_producto(update, producto_directo, bot_config, bot_id, uid, text)
            return

        # Sin coincidencia directa: buscar por filtro de texto
        productos = get_productos(bot_id, max_prod, filtro=text)
        data["productos_lista"] = productos

        if productos:
            listado = formato_productos(productos)
            respuesta = (
                f"{bot_config['mensaje_productos']}\n\n"
                f"{listado}\n\n"
                "Escribe el *número* o el *nombre* del producto para ver más detalles, "
                "o dime si prefieres algo diferente. 😊"
            )
            user_state[uid] = STATE_WAIT_SELECTION
        else:
            respuesta = (
                f"{bot_config['mensaje_sin_interes']}\n\n"
                f"{bot_config['mensaje_confirmacion']}\n\n"
                "¿Cuál es tu correo electrónico?"
            )
            user_state[uid] = STATE_GET_EMAIL

        await update.message.reply_text(respuesta, parse_mode="Markdown")
        log_conversacion(bot_id, uid, STATE_WAIT_INTEREST, text, respuesta)
        return

    # ── PASO 5a: usuario elige producto de la lista ───────────────────────────
    if state == STATE_WAIT_SELECTION:
        productos = data.get("productos_lista", [])
        producto  = buscar_producto(text, productos)

        if not producto:
            respuesta = (
                "No reconocí esa opción. Responde con el *número* o el *nombre* exacto del producto.\n\n"
                + formato_productos(productos)
            )
            await update.message.reply_text(respuesta, parse_mode="Markdown")
            log_conversacion(bot_id, uid, STATE_WAIT_SELECTION, text, respuesta)
            return

        data["producto"] = producto
        user_state[uid]  = STATE_PRODUCT_DETAIL

        await _mostrar_detalle_producto(update, producto, bot_config, bot_id, uid, text)
        return

    # ── PASO 5b: confirmar producto ──────────────────────────────────────────
    if state == STATE_PRODUCT_DETAIL:
        if detecta_interes(text):
            user_state[uid] = STATE_GET_EMAIL
            respuesta = (
                f"{bot_config['mensaje_confirmacion']}\n\n"
                "¿Cuál es tu *correo electrónico*?"
            )
        else:
            # Ofrecer otra selección
            productos = get_productos(bot_id, max_prod)
            data["productos_lista"] = productos
            user_state[uid] = STATE_WAIT_SELECTION

            if productos:
                respuesta = (
                    "Sin problema, aquí tienes otras opciones:\n\n"
                    + formato_productos(productos)
                    + "\n\nEscribe el número o nombre del que te interese."
                )
            else:
                respuesta = bot_config["mensaje_sin_interes"]
                user_state[uid] = STATE_DONE

        await update.message.reply_text(respuesta, parse_mode="Markdown")
        log_conversacion(bot_id, uid, STATE_PRODUCT_DETAIL, text, respuesta)
        return

    # ── PASO 6a: capturar email ───────────────────────────────────────────────
    if state == STATE_GET_EMAIL:
        if not is_valid_email(text):
            respuesta = "Ese correo no parece válido. Intenta con el formato *nombre@dominio.com*"
            await update.message.reply_text(respuesta, parse_mode="Markdown")
            log_conversacion(bot_id, uid, STATE_GET_EMAIL, text, respuesta)
            return

        data["email"] = text
        user_state[uid] = STATE_GET_PHONE
        respuesta = "Gracias. Ahora comparte tu *número de teléfono* (10 dígitos)."
        await update.message.reply_text(respuesta, parse_mode="Markdown")
        log_conversacion(bot_id, uid, STATE_GET_EMAIL, text, respuesta)
        return

    # ── PASO 6b: capturar teléfono y guardar lead ─────────────────────────────
    if state == STATE_GET_PHONE:
        telefono = extract_phone(text)
        if not telefono:
            respuesta = "No pude validar ese número. Debe tener exactamente *10 dígitos*."
            await update.message.reply_text(respuesta, parse_mode="Markdown")
            log_conversacion(bot_id, uid, STATE_GET_PHONE, text, respuesta)
            return

        data["telefono"] = telefono
        guardado = guardar_lead(bot_id, data)

        if guardado:
            producto_nombre = (data.get("producto") or {}).get("nombre", "tu consulta")
            respuesta = (
                f"{bot_config['mensaje_agradecimiento']}\n\n"
                f"📋 *Resumen de tu registro:*\n"
                f"• Interés: {data.get('interes') or producto_nombre}\n"
                f"• Correo: {data['email']}\n"
                f"• Teléfono: {telefono}\n\n"
                "Escribe /start si deseas hacer otra consulta."
            )
        else:
            respuesta = "Ocurrió un error al guardar tus datos. Por favor escribe /start e inténtalo de nuevo."

        user_state[uid] = STATE_DONE
        await update.message.reply_text(respuesta, parse_mode="Markdown")
        log_conversacion(bot_id, uid, STATE_GET_PHONE, text, respuesta)
        return

    # ── Flujo terminado ───────────────────────────────────────────────────────
    if state == STATE_DONE:
        await update.message.reply_text("Ya registré tus datos. Escribe /start si deseas una nueva consulta.")
        return

    await update.message.reply_text("Escribe /start para comenzar.")


# ── Inicialización ─────────────────────────────────────────────────────────────

def get_flag_path(manager_id: int) -> str:
    db_dir = os.path.dirname(DB_PATH)
    return os.path.join(db_dir, f"reload_bot_{manager_id}.flag")


async def watch_reload_flag(slug: str) -> None:
    """Cada 5s revisa si el dashboard guardó cambios y recarga la config."""
    global bot_config
    while True:
        await __import__("asyncio").sleep(5)
        try:
            if not bot_config:
                continue
            flag = get_flag_path(bot_config["manager_id"])
            if os.path.exists(flag):
                os.remove(flag)
                nueva = cargar_configuracion_bot(slug)
                if nueva:
                    bot_config = nueva
                    print(f"🔄 Config recargada desde dashboard para '{nueva['nombre']}'")
        except Exception as e:
            print(f"⚠️ Error en watch_reload_flag: {e}")


def main(bot_slug: str) -> None:
    global bot_config

    print(f"🚀 Iniciando bot con slug: {bot_slug}")

    bot_config = cargar_configuracion_bot(bot_slug)
    if not bot_config:
        print(f"❌ No se encontró un bot activo con slug '{bot_slug}'")
        sys.exit(1)

    if not bot_config["telegram_token"]:
        print("❌ Token de Telegram no configurado")
        sys.exit(1)

    print(f"✅ Bot configurado: {bot_config['nombre']}")
    print(f"   ID: {bot_config['id']} | Slug: {bot_config['slug']}")
    print(f"   Manager ID: {bot_config['manager_id']}")
    if bot_config.get("esencia_valores"):
        print(f"   Esencia: {bot_config['esencia_valores']}")
    print(f"🤖 Bot '{bot_config['nombre']}' en ejecución...")

    app = Application.builder().token(bot_config["telegram_token"]).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    async def on_startup(_app: Application) -> None:
        import asyncio
        asyncio.get_event_loop().create_task(watch_reload_flag(bot_slug))

    app.post_init = on_startup
    app.run_polling()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python laidaBot_multitenant.py <bot_slug>")
        sys.exit(1)
    main(sys.argv[1])
