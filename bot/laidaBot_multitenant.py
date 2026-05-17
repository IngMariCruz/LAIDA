#!/usr/bin/env python3
"""
LAIDA Bot - Sistema Multi-Tenant
Flujo:
  1. /start → crea lead inicial (datos temporales) + muestra productos
  2. Cada mensaje → clasifica lead (cold/warm/hot) con IA
  3. Al llegar a hot → pide nombre, email, teléfono y actualiza datos reales
"""

import json
import os
import re
import sys
import sqlite3
import random
from datetime import datetime
from typing import Any, Dict, List, Optional

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

from dotenv import load_dotenv
from telegram import Update
from telegram.error import BadRequest
from telegram.ext import Application, CommandHandler, ContextTypes, MessageHandler, filters

load_dotenv()

DB_PATH = os.getenv("BOT_DB_PATH", "../bd/laida.db")
CONVERSATIONS_DIR = os.getenv("BOT_CONVERSATIONS_DIR", ".")

# ── Estados del flujo ──────────────────────────────────────────────────────────
STATE_WAIT_INTEREST  = "WAIT_INTEREST"
STATE_WAIT_SELECTION = "WAIT_SELECTION"
STATE_PRODUCT_DETAIL = "PRODUCT_DETAIL"
STATE_GET_NOMBRE     = "GET_NOMBRE"
STATE_GET_EMAIL      = "GET_EMAIL"
STATE_GET_PHONE      = "GET_PHONE"
STATE_DONE           = "DONE"

user_state: Dict[int, str] = {}
user_data:  Dict[int, Dict[str, Any]] = {}

bot_config: Optional[Dict[str, Any]] = None


# ── Base de datos ──────────────────────────────────────────────────────────────

def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def cargar_configuracion_bot(bot_slug: str) -> Optional[Dict[str, Any]]:
    """Carga config del bot + mensajes de flujo + esencia de marca desde la BD."""
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
            "mensaje_confirmacion":  row["mensaje_confirmacion"]    or "¡Genial! Para enviarte atención personalizada, necesito un par de datos.",
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
            bot_row = conn.execute("SELECT marca_id FROM bots WHERE id = ?", (bot_id,)).fetchone()
            marca_id = bot_row["marca_id"] if bot_row and bot_row["marca_id"] else bot_id

            if filtro:
                like = f"%{filtro.lower()}%"
                rows = conn.execute(
                    """SELECT * FROM productos
                       WHERE marca_id = ? AND activo = 1
                         AND (LOWER(nombre) LIKE ? OR LOWER(descripcion) LIKE ?)
                       ORDER BY fecha_registro DESC LIMIT ?""",
                    (marca_id, like, like, limit),
                ).fetchall()
                if rows:
                    return [dict(r) for r in rows]

            rows = conn.execute(
                "SELECT * FROM productos WHERE marca_id = ? AND activo = 1 ORDER BY fecha_registro DESC LIMIT ?",
                (marca_id, limit),
            ).fetchall()
            return [dict(r) for r in rows]
    except sqlite3.Error as e:
        print(f"❌ Error cargando productos: {e}")
        return []


def crear_lead_inicial(bot_id: int, telegram_user_id: int, bot_slug: str, bot_nombre: str) -> bool:
    """Crea el lead en el primer mensaje con datos temporales. Retorna True si es lead nuevo."""
    try:
        with get_connection() as conn:
            bot_row = conn.execute("SELECT marca_id FROM bots WHERE id = ?", (bot_id,)).fetchone()
            marca_id = bot_row["marca_id"] if bot_row else None
            cursor = conn.execute(
                """INSERT OR IGNORE INTO leads
                     (bot_id, bot_slug, bot_nombre, nombre, email, telefono,
                      telegram_user_id, estado, categoria, marca_id, actualizado_en)
                   VALUES (?, ?, ?, 'lead1', 'lead@laida.com', '00000000', ?, 'nuevo', 'cold', ?, CURRENT_TIMESTAMP)""",
                (bot_id, bot_slug, bot_nombre, telegram_user_id, marca_id),
            )
            conn.commit()
            return cursor.rowcount > 0
    except sqlite3.Error as e:
        print(f"❌ Error creando lead inicial: {e}")
        return False


def actualizar_lead(bot_id: int, telegram_user_id: int, **kwargs) -> bool:
    """Actualiza campos del lead. Solo actualiza los campos pasados como kwargs."""
    if not kwargs:
        return False
    campos = ", ".join(f"{k} = ?" for k in kwargs)
    valores = list(kwargs.values()) + [bot_id, telegram_user_id]
    try:
        with get_connection() as conn:
            conn.execute(
                f"UPDATE leads SET {campos}, actualizado_en = CURRENT_TIMESTAMP WHERE bot_id = ? AND telegram_user_id = ?",
                valores,
            )
            conn.commit()
        return True
    except sqlite3.Error as e:
        print(f"❌ Error actualizando lead: {e}")
        return False


def tiene_datos_reales(bot_id: int, telegram_user_id: int) -> bool:
    """Retorna True si el lead ya tiene nombre real (distinto de 'lead1')."""
    try:
        with get_connection() as conn:
            row = conn.execute(
                "SELECT nombre FROM leads WHERE bot_id = ? AND telegram_user_id = ?",
                (bot_id, telegram_user_id),
            ).fetchone()
        if not row:
            return False
        nombre = row["nombre"]
        return bool(nombre and nombre != "lead1")
    except sqlite3.Error as e:
        print(f"❌ Error verificando datos reales: {e}")
        return False


def obtener_categoria_actual(bot_id: int, telegram_user_id: int) -> str:
    """Recupera la categoría actual del lead desde DB."""
    try:
        with get_connection() as conn:
            row = conn.execute(
                "SELECT categoria FROM leads WHERE bot_id = ? AND telegram_user_id = ?",
                (bot_id, telegram_user_id),
            ).fetchone()
        if row and row["categoria"]:
            return row["categoria"]
    except sqlite3.Error:
        pass
    return "cold"


def buscar_producto(selector: str, productos: List[Dict]) -> Optional[Dict]:
    s = selector.strip().lower()
    if s.isdigit():
        idx = int(s) - 1
        if 0 <= idx < len(productos):
            return productos[idx]
    for p in productos:
        if s == p.get("nombre", "").lower():
            return p
    for p in productos:
        nombre = p.get("nombre", "").lower()
        if nombre and nombre in s:
            return p
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
    desc = producto.get("descripcion") or ""
    for parte in desc.split("|"):
        parte = parte.strip()
        if parte.lower().startswith("categoría:") or parte.lower().startswith("categoria:"):
            return parte.split(":", 1)[1].strip().upper()
    return "OTROS"


def formato_productos(productos: List[Dict]) -> str:
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


def _formatear_caracteristicas(descripcion: str) -> str:
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


def clasificar_lead(historial: List[Dict], openai_key: Optional[str]) -> str:
    """Clasifica el lead como cold/warm/hot usando OpenAI o heurística de fallback."""
    if not historial:
        return "cold"

    if openai_key and OPENAI_AVAILABLE:
        try:
            ultimos = historial[-10:]
            mensajes = [
                {
                    "role": "system",
                    "content": (
                        "Eres un clasificador de leads para una tienda. "
                        "Dado el historial de conversación, clasifica al cliente como:\n"
                        '- "cold": curiosidad casual, sin interés específico\n'
                        '- "warm": hace preguntas, muestra interés en productos\n'
                        '- "hot": quiere comprar, pregunta por precio/disponibilidad/producto específico\n'
                        'Responde SOLO con JSON: {"categoria": "cold|warm|hot"}'
                    ),
                }
            ]
            for turno in ultimos:
                role = "user" if turno.get("role") == "user" else "assistant"
                mensajes.append({"role": role, "content": turno.get("content", "")})

            client = OpenAI(api_key=openai_key)
            resp = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=mensajes,
                max_tokens=50,
                temperature=0,
            )
            raw = resp.choices[0].message.content or ""
            match = re.search(r"\{[^}]+\}", raw)
            if match:
                datos = json.loads(match.group())
                cat = datos.get("categoria", "").lower()
                if cat in ("cold", "warm", "hot"):
                    return cat
        except Exception as e:
            print(f"⚠️ OpenAI classify error: {e}")

    # Fallback heurístico: revisar el último mensaje del usuario
    for turno in reversed(historial):
        if turno.get("role") == "user":
            return "warm" if detecta_interes(turno.get("content", "")) else "cold"
    return "cold"


# ── Persistencia ───────────────────────────────────────────────────────────────

def log_conversacion(bot_id: int, user_id: int, estado: str, msg_user: str, msg_bot: str) -> None:
    os.makedirs(CONVERSATIONS_DIR, exist_ok=True)
    path = os.path.join(CONVERSATIONS_DIR, f"conversaciones_bot_{bot_id}.txt")
    with open(path, "a", encoding="utf-8") as f:
        f.write(f"[{datetime.now():%Y-%m-%d %H:%M:%S}] bot={bot_id} user={user_id} estado={estado}\n")
        f.write(f"  >>> {msg_user}\n  <<< {msg_bot}\n\n")


# ── Detalle de producto ────────────────────────────────────────────────────────

async def _mostrar_detalle_producto(
    update: Update,
    producto: Dict,
    cfg: Dict,
    bot_id: int,
    uid: int,
    texto_usuario: str,
) -> str:
    """Muestra características completas de un producto. Retorna el texto enviado."""
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
    return respuesta


async def _clasificar_y_posiblemente_pedir_datos(
    bot_id: int,
    uid: int,
    data: Dict[str, Any],
    update: Update,
) -> None:
    """Reclasifica el lead y, si llega a hot sin datos reales, solicita nombre."""
    openai_key = bot_config.get("openai_key") if bot_config else None
    nueva_cat = clasificar_lead(data["historial"], openai_key)

    if nueva_cat != data.get("categoria_actual"):
        data["categoria_actual"] = nueva_cat
        actualizar_lead(bot_id, uid, categoria=nueva_cat)

    if (
        nueva_cat == "hot"
        and not data.get("datos_recolectados")
        and not tiene_datos_reales(bot_id, uid)
    ):
        user_state[uid] = STATE_GET_NOMBRE
        respuesta = "¡Genial! Para enviarte atención personalizada, ¿cuál es tu nombre?"
        await update.message.reply_text(respuesta)
        log_conversacion(bot_id, uid, "GET_NOMBRE_TRIGGER", "", respuesta)


# ── Handlers de Telegram ───────────────────────────────────────────────────────

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not update.message or not update.effective_user:
        return

    uid = update.effective_user.id

    global bot_config
    if bot_config:
        config_fresca = cargar_configuracion_bot(bot_config["slug"])
        if config_fresca:
            bot_config = config_fresca

    if not bot_config:
        await update.message.reply_text("⚠️ Bot no configurado correctamente.")
        return

    bot_id = bot_config["id"]

    # Crear lead inicial (INSERT OR IGNORE) — primer /start crea el registro
    es_nuevo = crear_lead_inicial(bot_id, uid, bot_config["slug"], bot_config["nombre"])

    if es_nuevo:
        user_data[uid] = {
            "telegram_user_id": uid,
            "interes": "",
            "producto": None,
            "productos_lista": [],
            "todos_productos": [],
            "historial": [],
            "categoria_actual": "cold",
            "datos_recolectados": False,
            "nombre": "",
            "email": "",
            "telefono": "",
            "notas": "",
        }
    else:
        cat = obtener_categoria_actual(bot_id, uid)
        ya_tiene_datos = tiene_datos_reales(bot_id, uid)
        if uid in user_data:
            user_data[uid]["categoria_actual"] = cat
            user_data[uid]["datos_recolectados"] = ya_tiene_datos
            user_data[uid]["historial"] = []
        else:
            user_data[uid] = {
                "telegram_user_id": uid,
                "interes": "",
                "producto": None,
                "productos_lista": [],
                "todos_productos": [],
                "historial": [],
                "categoria_actual": cat,
                "datos_recolectados": ya_tiene_datos,
                "nombre": "",
                "email": "",
                "telefono": "",
                "notas": "",
            }

    max_prod = int(bot_config.get("max_productos", 4))
    data = user_data[uid]

    bienvenida = bot_config["mensaje_bienvenida"]
    msg1 = f"{bienvenida}\n\n¿En qué producto o servicio estás interesado hoy?"
    user_state[uid] = STATE_WAIT_INTEREST

    try:
        await update.message.reply_text(msg1, parse_mode="Markdown")
    except BadRequest as e:
        if "can't parse entities" in str(e).lower():
            await update.message.reply_text(msg1)
        else:
            raise
    data["historial"].append({"role": "bot", "content": msg1})
    log_conversacion(bot_id, uid, "START", "/start", msg1)

    todos = get_productos(bot_id, 100)
    if todos:
        n_min = min(4, len(todos))
        n_max = min(6, len(todos))
        n = random.randint(n_min, n_max)
        destacados = random.sample(todos, n)
        data["productos_lista"] = destacados
        data["todos_productos"] = todos
        listado = formato_productos(destacados)
        msg2 = (
            f"✨ *Algunos de nuestros productos destacados:*\n\n"
            f"{listado}\n\n"
            "Escribe el *número* o *nombre* de uno para saber más, "
            "o cuéntame qué estás buscando.\n"
            "También puedes escribir *\"ver todos\"* para ver el catálogo completo. 😊"
        )
        try:
            await update.message.reply_text(msg2, parse_mode="Markdown")
        except BadRequest as e:
            if "can't parse entities" in str(e).lower():
                await update.message.reply_text(msg2)
            else:
                raise
        data["historial"].append({"role": "bot", "content": msg2})
        log_conversacion(bot_id, uid, "START_SUGERENCIA", "/start", msg2)


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

    # Agregar mensaje del usuario al historial
    data["historial"].append({"role": "user", "content": text})

    # ── "ver todos" desde cualquier estado de browsing ────────────────────────
    VER_TODOS = ["ver todos", "todos", "mostrar todos", "otros productos", "ver más", "ver mas", "más productos", "mas productos"]
    if text.lower() in VER_TODOS and state not in (STATE_GET_NOMBRE, STATE_GET_EMAIL, STATE_GET_PHONE, STATE_DONE):
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
        data["historial"].append({"role": "bot", "content": respuesta})
        log_conversacion(bot_id, uid, "VER_TODOS", text, respuesta)
        await _clasificar_y_posiblemente_pedir_datos(bot_id, uid, data, update)
        return

    # ── GET_NOMBRE: capturar nombre real ──────────────────────────────────────
    if state == STATE_GET_NOMBRE:
        if len(text.strip()) < 2:
            respuesta = "Por favor ingresa tu nombre (mínimo 2 caracteres)."
            await update.message.reply_text(respuesta)
            log_conversacion(bot_id, uid, STATE_GET_NOMBRE, text, respuesta)
            return
        data["nombre"] = text.strip()
        actualizar_lead(bot_id, uid, nombre=text.strip())
        user_state[uid] = STATE_GET_EMAIL
        respuesta = f"Gracias, *{text.strip()}*! ¿Cuál es tu *correo electrónico*?"
        await update.message.reply_text(respuesta, parse_mode="Markdown")
        log_conversacion(bot_id, uid, STATE_GET_NOMBRE, text, respuesta)
        return

    # ── GET_EMAIL: capturar email ─────────────────────────────────────────────
    if state == STATE_GET_EMAIL:
        if not is_valid_email(text):
            respuesta = "Ese correo no parece válido. Intenta con el formato *nombre@dominio.com*"
            await update.message.reply_text(respuesta, parse_mode="Markdown")
            log_conversacion(bot_id, uid, STATE_GET_EMAIL, text, respuesta)
            return
        data["email"] = text
        actualizar_lead(bot_id, uid, email=text)
        user_state[uid] = STATE_GET_PHONE
        respuesta = "Gracias. Ahora comparte tu *número de teléfono* (10 dígitos)."
        await update.message.reply_text(respuesta, parse_mode="Markdown")
        log_conversacion(bot_id, uid, STATE_GET_EMAIL, text, respuesta)
        return

    # ── GET_PHONE: capturar teléfono y marcar datos completos ─────────────────
    if state == STATE_GET_PHONE:
        telefono = extract_phone(text)
        if not telefono:
            respuesta = "No pude validar ese número. Debe tener exactamente *10 dígitos*."
            await update.message.reply_text(respuesta, parse_mode="Markdown")
            log_conversacion(bot_id, uid, STATE_GET_PHONE, text, respuesta)
            return

        data["telefono"] = telefono
        data["datos_recolectados"] = True
        actualizar_lead(bot_id, uid, telefono=telefono)

        producto_nombre = (data.get("producto") or {}).get("nombre", "")
        respuesta = (
            f"{bot_config['mensaje_agradecimiento']}\n\n"
            f"📋 *Resumen de tu registro:*\n"
            f"• Nombre: {data.get('nombre') or '-'}\n"
            f"• Interés: {data.get('interes') or producto_nombre or '-'}\n"
            f"• Correo: {data['email']}\n"
            f"• Teléfono: {telefono}\n\n"
            "Escribe /start si deseas hacer otra consulta."
        )
        user_state[uid] = STATE_DONE
        await update.message.reply_text(respuesta, parse_mode="Markdown")
        log_conversacion(bot_id, uid, STATE_GET_PHONE, text, respuesta)
        return

    # ── WAIT_INTEREST: capturar interés y mostrar productos ───────────────────
    if state == STATE_WAIT_INTEREST:
        data["interes"] = text
        actualizar_lead(bot_id, uid, interes=text)

        todos = data.get("todos_productos") or get_productos(bot_id, 100)
        data["todos_productos"] = todos
        producto_directo = buscar_producto(text, todos)

        if producto_directo:
            data["producto"] = producto_directo
            user_state[uid] = STATE_PRODUCT_DETAIL
            respuesta_texto = await _mostrar_detalle_producto(update, producto_directo, bot_config, bot_id, uid, text)
            data["historial"].append({"role": "bot", "content": respuesta_texto})
            await _clasificar_y_posiblemente_pedir_datos(bot_id, uid, data, update)
            return

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
            respuesta = bot_config["mensaje_sin_interes"]
            user_state[uid] = STATE_WAIT_SELECTION

        await update.message.reply_text(respuesta, parse_mode="Markdown")
        data["historial"].append({"role": "bot", "content": respuesta})
        log_conversacion(bot_id, uid, STATE_WAIT_INTEREST, text, respuesta)
        await _clasificar_y_posiblemente_pedir_datos(bot_id, uid, data, update)
        return

    # ── WAIT_SELECTION: usuario elige producto de la lista ────────────────────
    if state == STATE_WAIT_SELECTION:
        productos = data.get("productos_lista", [])
        producto  = buscar_producto(text, productos)

        if not producto:
            respuesta = (
                "No reconocí esa opción. Responde con el *número* o el *nombre* exacto del producto.\n\n"
                + formato_productos(productos)
            )
            await update.message.reply_text(respuesta, parse_mode="Markdown")
            data["historial"].append({"role": "bot", "content": respuesta})
            log_conversacion(bot_id, uid, STATE_WAIT_SELECTION, text, respuesta)
            await _clasificar_y_posiblemente_pedir_datos(bot_id, uid, data, update)
            return

        data["producto"] = producto
        user_state[uid]  = STATE_PRODUCT_DETAIL
        respuesta_texto = await _mostrar_detalle_producto(update, producto, bot_config, bot_id, uid, text)
        data["historial"].append({"role": "bot", "content": respuesta_texto})
        await _clasificar_y_posiblemente_pedir_datos(bot_id, uid, data, update)
        return

    # ── PRODUCT_DETAIL: confirmar compra o ver otras opciones ─────────────────
    if state == STATE_PRODUCT_DETAIL:
        if detecta_interes(text):
            # Usuario confirma querer el producto → siempre es hot
            data["categoria_actual"] = "hot"
            actualizar_lead(bot_id, uid, categoria="hot")

            if not data.get("datos_recolectados") and not tiene_datos_reales(bot_id, uid):
                user_state[uid] = STATE_GET_NOMBRE
                respuesta = "¡Genial! Para enviarte atención personalizada, ¿cuál es tu nombre?"
            else:
                user_state[uid] = STATE_DONE
                respuesta = bot_config["mensaje_agradecimiento"] + "\n\nEscribe /start si deseas hacer otra consulta."

            await update.message.reply_text(respuesta, parse_mode="Markdown")
            data["historial"].append({"role": "bot", "content": respuesta})
            log_conversacion(bot_id, uid, STATE_PRODUCT_DETAIL, text, respuesta)
        else:
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
            data["historial"].append({"role": "bot", "content": respuesta})
            log_conversacion(bot_id, uid, STATE_PRODUCT_DETAIL, text, respuesta)
            await _clasificar_y_posiblemente_pedir_datos(bot_id, uid, data, update)
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
    openai_status = "con OpenAI" if bot_config.get("openai_key") and OPENAI_AVAILABLE else "sin OpenAI (heurística)"
    print(f"   Clasificación: {openai_status}")
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
