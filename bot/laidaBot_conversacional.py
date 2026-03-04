#!/usr/bin/env python3
"""
Bot conversacional de LAIDA con flujo inteligente de ventas
- Saluda y presenta productos
- Maneja características configurables
- Categoriza leads (hot/warm/cold)
- Re-engagement de desinteresados
"""

import os
import re
import sqlite3
import json
from datetime import datetime
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, ContextTypes, MessageHandler, CallbackQueryHandler, filters

load_dotenv()

TOKEN = os.getenv("TELEGRAM_TOKEN")
DB_PATH = os.getenv("BOT_DB_PATH", "../bd/laida.db")
CONVERSATIONS_DIR = os.getenv("BOT_CONVERSATIONS_DIR", ".")
BOT_ID = os.getenv("BOT_ID")
BOT_NOMBRE = os.getenv("BOT_NOMBRE", "LAIDA Bot")

if not TOKEN:
    raise ValueError(
        "❌ No se encontró TELEGRAM_TOKEN\n"
        "   Este bot debe ejecutarse con bot_launcher.py\n"
        "   Uso: python3 bot_launcher.py <bot_id>\n"
        "   Los tokens se configuran desde el panel de super admin"
    )

# Estados del flujo conversacional
STATE_START = "START"
STATE_INITIAL_INTEREST = "INITIAL_INTEREST"
STATE_SHOW_PRODUCTS = "SHOW_PRODUCTS"
STATE_SELECT_PRODUCT = "SELECT_PRODUCT"
STATE_COLLECT_ATTRIBUTES = "COLLECT_ATTRIBUTES"
STATE_CONFIRM_PURCHASE = "CONFIRM_PURCHASE"
STATE_GET_EMAIL = "GET_EMAIL"
STATE_GET_PHONE = "GET_PHONE"
STATE_COLD_REENGAGEMENT = "COLD_REENGAGEMENT"

# Almacenamiento en memoria
user_state: Dict[int, str] = {}
user_data: Dict[int, Dict[str, Any]] = {}


def get_connection() -> sqlite3.Connection:
    """Conectar a la base de datos SQLite"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def get_bot_by_id(bot_id: int) -> Optional[Dict[str, Any]]:
    """Obtener información del bot"""
    query = "SELECT id, nombre, slug FROM bots WHERE id = ? LIMIT 1"
    with get_connection() as conn:
        row = conn.execute(query, (bot_id,)).fetchone()
    return dict(row) if row else None


def get_bot_flow_config(bot_id: int) -> Dict[str, Any]:
    """Obtener configuración del flujo del bot"""
    query = "SELECT * FROM bot_flow_config WHERE bot_id = ? LIMIT 1"
    with get_connection() as conn:
        row = conn.execute(query, (bot_id,)).fetchone()
    
    if row:
        return dict(row)
    
    # Configuración por defecto
    return {
        "mensaje_bienvenida": "¡Hola! 👋 Bienvenido a nuestra tienda.",
        "mensaje_sin_interes": "Entiendo. Si cambias de opinión, aquí estaré para ayudarte. ¡Hasta pronto! 👋",
        "mensaje_productos": "¿Te gustaría ver nuestros productos disponibles?",
        "mensaje_caracteristicas": "¿Qué características te interesan para este producto?",
        "mensaje_confirmacion": "¿Deseas confirmar tu interés en este producto?",
        "mensaje_agradecimiento": "¡Gracias por tu interés! Un asesor se pondrá en contacto contigo pronto. 😊",
        "mostrar_productos_inicio": 1,
        "max_productos_mostrar": 5,
        "permitir_recomendaciones": 1
    }


def get_productos_activos(marca_id: Optional[int] = None, limit: int = 10) -> List[Dict[str, Any]]:
    """Obtener productos activos"""
    if marca_id:
        query = "SELECT * FROM productos WHERE marca_id = ? AND activo = 1 ORDER BY fecha_registro DESC LIMIT ?"
        params = (marca_id, limit)
    else:
        query = "SELECT * FROM productos WHERE activo = 1 ORDER BY fecha_registro DESC LIMIT ?"
        params = (limit,)
    
    with get_connection() as conn:
        rows = conn.execute(query, params).fetchall()
    return [dict(row) for row in rows]


def get_producto_by_id(producto_id: int) -> Optional[Dict[str, Any]]:
    """Obtener un producto por ID"""
    query = "SELECT * FROM productos WHERE id = ?"
    with get_connection() as conn:
        row = conn.execute(query, (producto_id,)).fetchone()
    return dict(row) if row else None


def get_producto_atributos(producto_id: int) -> List[Dict[str, Any]]:
    """Obtener atributos configurados del producto"""
    query = "SELECT * FROM producto_atributos WHERE producto_id = ? ORDER BY orden ASC"
    with get_connection() as conn:
        rows = conn.execute(query, (producto_id,)).fetchall()
    return [dict(row) for row in rows]


def is_valid_email(email: str) -> bool:
    """Validar formato de email"""
    return bool(re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email.strip()))


def extract_phone(text: str) -> Optional[str]:
    """Extraer y validar teléfono (10 dígitos)"""
    phone = re.sub(r"\D", "", text)
    return phone if len(phone) == 10 else None


def detect_interest(text: str) -> bool:
    """Detectar si el usuario muestra interés"""
    text_lower = text.lower()
    keywords_yes = ["sí", "si", "claro", "por supuesto", "dale", "ok", "okay", "yes", "interesa", "quiero", "me gusta"]
    keywords_no = ["no", "nope", "nah", "después", "luego", "ahora no", "otro momento"]
    
    for kw in keywords_yes:
        if kw in text_lower:
            return True
    
    for kw in keywords_no:
        if kw in text_lower:
            return False
    
    # Por defecto, asumir interés si menciona algo
    return len(text.strip()) > 0


def save_lead(bot_id: int, telegram_user_id: int, data: Dict[str, Any]) -> int:
    """Guardar lead en la base de datos"""
    query = """
        INSERT INTO leads (
            bot_id, bot_slug, bot_nombre, interes, email, telefono, 
            telegram_user_id, estado, categoria, producto_id, detalles_compra, notas
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """
    
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(query, (
            bot_id,
            data.get('bot_slug'),
            data.get('bot_nombre'),
            data.get('interes', ''),
            data.get('email'),
            data.get('telefono'),
            telegram_user_id,
            data.get('estado', 'nuevo'),
            data.get('categoria', 'warm'),
            data.get('producto_id'),
            data.get('detalles_compra'),
            data.get('notas')
        ))
        conn.commit()
        return cursor.lastrowid


def save_interaccion(bot_id: int, telegram_user_id: int, tipo: str, producto_id: Optional[int] = None, datos: Optional[str] = None) -> None:
    """Guardar interacción del usuario con el bot"""
    query = """
        INSERT INTO bot_interacciones (bot_id, telegram_user_id, tipo, producto_id, datos)
        VALUES (?, ?, ?, ?, ?)
    """
    
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(query, (bot_id, telegram_user_id, tipo, producto_id, datos))
        conn.commit()


def get_conversation_path(bot_id: int) -> str:
    """Obtener ruta del archivo de conversaciones"""
    os.makedirs(CONVERSATIONS_DIR, exist_ok=True)
    return os.path.join(CONVERSATIONS_DIR, f"conversaciones_bot_{bot_id}.txt")


def guardar_conversacion(bot_id: int, user_id: int, estado: str, mensaje_usuario: str, respuesta_bot: str) -> None:
    """Guardar conversación en archivo de texto"""
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


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Comando /start - Iniciar conversación con el bot"""
    if not update.message or not update.effective_user:
        return

    user_id = update.effective_user.id
    raw_args = context.args

    if not raw_args:
        respuesta = "Uso correcto: /start <bot_id>\nEjemplo: /start 1"
        await update.message.reply_text(respuesta)
        return

    try:
        bot_id = int(raw_args[0])
    except ValueError:
        respuesta = "El bot_id debe ser numérico. Ejemplo: /start 1"
        await update.message.reply_text(respuesta)
        return

    # Obtener información del bot
    bot_info = get_bot_by_id(bot_id)
    if not bot_info:
        respuesta = f"No existe un bot con id {bot_id}. Verifica el enlace de inicio."
        await update.message.reply_text(respuesta)
        return

    # Obtener configuración del flujo
    flow_config = get_bot_flow_config(bot_id)

    # Inicializar datos del usuario
    user_data[user_id] = {
        "bot_id": bot_id,
        "bot_info": bot_info,
        "flow_config": flow_config,
        "selected_product": None,
        "product_attributes": {},
        "email": None,
        "phone": None,
        "interes": "",
        "categoria": "warm"
    }
    user_state[user_id] = STATE_INITIAL_INTEREST

    # Registrar interacción
    save_interaccion(bot_id, user_id, "inicio")

    # Mensaje de bienvenida
    mensaje_bienvenida = flow_config.get("mensaje_bienvenida", "¡Hola! 👋 Bienvenido.")
    mensaje_productos = flow_config.get("mensaje_productos", "¿Te gustaría ver nuestros productos disponibles?")
    
    respuesta = f"{mensaje_bienvenida}\n\n{mensaje_productos}"
    
    await update.message.reply_text(respuesta)
    guardar_conversacion(bot_id, user_id, "WELCOME", f"/start {bot_id}", respuesta)


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Manejar mensajes de texto del usuario"""
    if not update.message or not update.effective_user:
        return

    user_id = update.effective_user.id
    text = update.message.text.strip()
    state = user_state.get(user_id)
    data = user_data.get(user_id)

    if not state or not data:
        respuesta = "Escribe /start <bot_id> para comenzar. Ejemplo: /start 1"
        await update.message.reply_text(respuesta)
        return

    bot_id = data["bot_id"]
    flow_config = data["flow_config"]

    # ===== ESTADO: Interés inicial =====
    if state == STATE_INITIAL_INTEREST:
        interested = detect_interest(text)
        
        if interested:
            # Usuario muestra interés
            user_state[user_id] = STATE_SHOW_PRODUCTS
            
            # Obtener productos activos
            productos = get_productos_activos(limit=flow_config.get("max_productos_mostrar", 5))
            
            if not productos:
                respuesta = "Lo siento, en este momento no tenemos productos disponibles. 😔"
                await update.message.reply_text(respuesta)
                guardar_conversacion(bot_id, user_id, state, text, respuesta)
                return
            
            # Guardar productos en contexto
            data["productos"] = productos
            
            # Crear botones de selección de productos
            keyboard = []
            for producto in productos:
                precio_format = f"${producto['precio']:,.0f}" if producto['precio'] else "Precio a consultar"
                button_text = f"{producto['nombre']} - {precio_format}"
                keyboard.append([InlineKeyboardButton(button_text, callback_data=f"producto_{producto['id']}")])
            
            keyboard.append([InlineKeyboardButton("❌ No me interesa ninguno", callback_data="ninguno")])
            
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            respuesta = "¡Perfecto! 😊 Aquí están nuestros productos disponibles:\n\nSelecciona el que te interese:"
            await update.message.reply_text(respuesta, reply_markup=reply_markup)
            guardar_conversacion(bot_id, user_id, state, text, respuesta)
            
            # Registrar interacción
            save_interaccion(bot_id, user_id, "producto_visto")
        else:
            # Usuario no muestra interés inicial
            user_state[user_id] = STATE_COLD_REENGAGEMENT
            data["categoria"] = "cold"
            data["interes"] = text
            
            respuesta = flow_config.get("mensaje_sin_interes", "Entiendo. ¿Hay algo específico que te gustaría saber sobre nuestros productos?")
            await update.message.reply_text(respuesta)
            guardar_conversacion(bot_id, user_id, state, text, respuesta)
            
            # Registrar interacción de desinterés
            save_interaccion(bot_id, user_id, "desinteres", datos=text)
    
    # ===== ESTADO: Re-engagement de leads fríos =====
    elif state == STATE_COLD_REENGAGEMENT:
        # Intentar re-engagement
        interested = detect_interest(text)
        
        if interested:
            # Cambiar a warm y mostrar productos
            user_state[user_id] = STATE_SHOW_PRODUCTS
            data["categoria"] = "warm"
            
            productos = get_productos_activos(limit=flow_config.get("max_productos_mostrar", 5))
            
            if not productos:
                respuesta = "Lo siento, en este momento no tenemos productos disponibles. 😔"
                await update.message.reply_text(respuesta)
                return
            
            data["productos"] = productos
            
            keyboard = []
            for producto in productos:
                precio_format = f"${producto['precio']:,.0f}" if producto['precio'] else "Precio a consultar"
                button_text = f"{producto['nombre']} - {precio_format}"
                keyboard.append([InlineKeyboardButton(button_text, callback_data=f"producto_{producto['id']}")])
            
            keyboard.append([InlineKeyboardButton("❌ No me interesa ninguno", callback_data="ninguno")])
            
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            respuesta = "¡Genial! 😊 Mira nuestros productos disponibles:"
            await update.message.reply_text(respuesta, reply_markup=reply_markup)
        else:
            # Mantener como cold y despedirse
            respuesta = flow_config.get("mensaje_sin_interes", "Entiendo. Aquí estaré cuando me necesites. ¡Hasta pronto! 👋")
            await update.message.reply_text(respuesta)
            
            # Guardar lead frío
            save_lead(bot_id, user_id, {
                "bot_slug": data["bot_info"].get("slug"),
                "bot_nombre": data["bot_info"].get("nombre"),
                "interes": data.get("interes", "Sin interés inicial"),
                "email": None,
                "telefono": None,
                "estado": "nuevo",
                "categoria": "cold",
                "notas": f"Lead frío: {text}"
            })
            
            # Limpiar estado
            user_state.pop(user_id, None)
            user_data.pop(user_id, None)
        
        guardar_conversacion(bot_id, user_id, state, text, respuesta)
    
    # ===== ESTADO: Recolectar atributos del producto =====
    elif state == STATE_COLLECT_ATTRIBUTES:
        atributos = data.get("atributos_pendientes", [])
        
        if not atributos:
            # No hay más atributos, pasar a confirmación
            user_state[user_id] = STATE_CONFIRM_PURCHASE
            
            respuesta = flow_config.get("mensaje_confirmacion", "¿Deseas confirmar tu interés en este producto?")
            
            keyboard = [
                [InlineKeyboardButton("✅ Sí, me interesa", callback_data="confirmar_si")],
                [InlineKeyboardButton("🤔 Déjame pensarlo", callback_data="confirmar_luego")]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            await update.message.reply_text(respuesta, reply_markup=reply_markup)
        else:
            # Guardar valor del atributo actual
            atributo_actual = atributos[0]
            data["product_attributes"][atributo_actual["nombre"]] = text
            
            # Quitar el atributo procesado
            atributos.pop(0)
            data["atributos_pendientes"] = atributos
            
            if atributos:
                # Preguntar siguiente atributo
                siguiente_atributo = atributos[0]
                
                if siguiente_atributo["tipo"] == "select" and siguiente_atributo.get("opciones"):
                    opciones = siguiente_atributo["opciones"].split(",")
                    keyboard = [[InlineKeyboardButton(opt.strip(), callback_data=f"attr_{opt.strip()}")] for opt in opciones]
                    reply_markup = InlineKeyboardMarkup(keyboard)
                    
                    respuesta = f"Perfecto. Ahora, ¿{siguiente_atributo['nombre']}?"
                    await update.message.reply_text(respuesta, reply_markup=reply_markup)
                else:
                    respuesta = f"Perfecto. Ahora, ¿{siguiente_atributo['nombre']}?"
                    await update.message.reply_text(respuesta)
            else:
                # No hay más atributos, pasar a confirmación
                user_state[user_id] = STATE_CONFIRM_PURCHASE
                
                respuesta = flow_config.get("mensaje_confirmacion", "¿Deseas confirmar tu interés en este producto?")
                
                keyboard = [
                    [InlineKeyboardButton("✅ Sí, me interesa", callback_data="confirmar_si")],
                    [InlineKeyboardButton("🤔 Déjame pensarlo", callback_data="confirmar_luego")]
                ]
                reply_markup = InlineKeyboardMarkup(keyboard)
                
                await update.message.reply_text(respuesta, reply_markup=reply_markup)
        
        guardar_conversacion(bot_id, user_id, state, text, respuesta)
    
    # ===== ESTADO: Obtener email =====
    elif state == STATE_GET_EMAIL:
        if not is_valid_email(text):
            respuesta = "Ese correo no parece válido. Intenta nuevamente con formato nombre@dominio.com"
            await update.message.reply_text(respuesta)
            guardar_conversacion(bot_id, user_id, state, text, respuesta)
            return
        
        data["email"] = text
        user_state[user_id] = STATE_GET_PHONE
        
        respuesta = "Perfecto. Ahora, ¿podrías compartirme tu número de teléfono? (10 dígitos)"
        await update.message.reply_text(respuesta)
        guardar_conversacion(bot_id, user_id, state, text, respuesta)
    
    # ===== ESTADO: Obtener teléfono =====
    elif state == STATE_GET_PHONE:
        phone = extract_phone(text)
        if not phone:
            respuesta = "No pude validar el teléfono. Debe tener 10 dígitos numéricos."
            await update.message.reply_text(respuesta)
            guardar_conversacion(bot_id, user_id, state, text, respuesta)
            return
        
        data["phone"] = phone
        
        # Guardar lead en la base de datos
        producto_seleccionado = data.get("selected_product")
        atributos_seleccionados = data.get("product_attributes", {})
        
        detalles_compra = json.dumps(atributos_seleccionados) if atributos_seleccionados else None
        
        lead_id = save_lead(bot_id, user_id, {
            "bot_slug": data["bot_info"].get("slug"),
            "bot_nombre": data["bot_info"].get("nombre"),
            "interes": data.get("interes", ""),
            "email": data["email"],
            "telefono": data["phone"],
            "estado": "nuevo",
            "categoria": data.get("categoria", "warm"),
            "producto_id": producto_seleccionado["id"] if producto_seleccionado else None,
            "detalles_compra": detalles_compra,
            "notas": f"Lead {data.get('categoria', 'warm')} generado por bot"
        })
        
        # Registrar interacción de compra
        if data.get("categoria") == "hot":
            save_interaccion(bot_id, user_id, "compra", producto_seleccionado["id"] if producto_seleccionado else None, detalles_compra)
        
        # Mensaje de confirmación final
        respuesta = flow_config.get("mensaje_agradecimiento", "¡Gracias por tu interés! Un asesor se pondrá en contacto contigo pronto. 😊")
        
        if producto_seleccionado:
            respuesta += f"\n\n📦 Producto: {producto_seleccionado['nombre']}"
        
        respuesta += f"\n📧 Email: {data['email']}\n📞 Teléfono: {data['phone']}"
        
        await update.message.reply_text(respuesta)
        guardar_conversacion(bot_id, user_id, state, text, respuesta)
        
        # Limpiar estado
        user_state.pop(user_id, None)
        user_data.pop(user_id, None)
    
    else:
        respuesta = "Escribe /start <bot_id> para reiniciar el flujo."
        await update.message.reply_text(respuesta)


async def handle_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Manejar callbacks de botones inline"""
    query = update.callback_query
    if not query or not update.effective_user:
        return
    
    await query.answer()
    
    user_id = update.effective_user.id
    data = user_data.get(user_id)
    state = user_state.get(user_id)
    
    if not data or not state:
        await query.edit_message_text("Sesión expirada. Escribe /start <bot_id> para comenzar.")
        return
    
    bot_id = data["bot_id"]
    flow_config = data["flow_config"]
    callback_data = query.data
    
    # ===== Selección de producto =====
    if callback_data.startswith("producto_"):
        producto_id = int(callback_data.split("_")[1])
        producto = get_producto_by_id(producto_id)
        
        if not producto:
            await query.edit_message_text("Producto no encontrado. 😔")
            return
        
        data["selected_product"] = producto
        data["interes"] = f"Interesado en {producto['nombre']}"
        data["categoria"] = "warm"  # Al seleccionar un producto, es al menos warm
        
        # Obtener atributos del producto
        atributos = get_producto_atributos(producto_id)
        
        if atributos:
            # Hay atributos que recolectar
            user_state[user_id] = STATE_COLLECT_ATTRIBUTES
            data["atributos_pendientes"] = atributos
            data["product_attributes"] = {}
            
            primer_atributo = atributos[0]
            
            respuesta = f"¡Excelente elección! 👍\n\n📦 {producto['nombre']}"
            if producto.get("descripcion"):
                respuesta += f"\n\n{producto['descripcion']}"
            
            respuesta += f"\n\n{flow_config.get('mensaje_caracteristicas', '¿Qué características te interesan?')}"
            respuesta += f"\n\n{primer_atributo['nombre']}:"
            
            # Si el atributo es select, mostrar opciones
            if primer_atributo["tipo"] == "select" and primer_atributo.get("opciones"):
                opciones = primer_atributo["opciones"].split(",")
                keyboard = [[InlineKeyboardButton(opt.strip(), callback_data=f"attr_{opt.strip()}")] for opt in opciones]
                reply_markup = InlineKeyboardMarkup(keyboard)
                
                await query.edit_message_text(respuesta, reply_markup=reply_markup)
            else:
                await query.edit_message_text(respuesta)
        else:
            # No hay atributos, pasar directo a confirmación
            user_state[user_id] = STATE_CONFIRM_PURCHASE
            
            respuesta = f"¡Excelente elección! 👍\n\n📦 {producto['nombre']}"
            if producto.get("descripcion"):
                respuesta += f"\n\n{producto['descripcion']}"
            
            respuesta += f"\n\n{flow_config.get('mensaje_confirmacion', '¿Deseas confirmar tu interés?')}"
            
            keyboard = [
                [InlineKeyboardButton("✅ Sí, me interesa", callback_data="confirmar_si")],
                [InlineKeyboardButton("🤔 Déjame pensarlo", callback_data="confirmar_luego")]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            await query.edit_message_text(respuesta, reply_markup=reply_markup)
        
        # Registrar interacción
        save_interaccion(bot_id, user_id, "producto_visto", producto_id)
    
    # ===== No me interesa ningún producto =====
    elif callback_data == "ninguno":
        data["categoria"] = "cold"
        
        respuesta = flow_config.get("mensaje_sin_interes", "Entiendo. Si cambias de opinión, aquí estaré. ¡Hasta pronto! 👋")
        
        await query.edit_message_text(respuesta)
        
        # Guardar lead frío
        save_lead(bot_id, user_id, {
            "bot_slug": data["bot_info"].get("slug"),
            "bot_nombre": data["bot_info"].get("nombre"),
            "interes": "No mostró interés en productos",
            "email": None,
            "telefono": None,
            "estado": "nuevo",
            "categoria": "cold",
            "notas": "Lead frío: no seleccionó ningún producto"
        })
        
        save_interaccion(bot_id, user_id, "desinteres")
        
        # Limpiar estado
        user_state.pop(user_id, None)
        user_data.pop(user_id, None)
    
    # ===== Selección de atributo (opciones predefinidas) =====
    elif callback_data.startswith("attr_"):
        valor_atributo = callback_data.split("_", 1)[1]
        
        atributos = data.get("atributos_pendientes", [])
        if atributos:
            atributo_actual = atributos[0]
            data["product_attributes"][atributo_actual["nombre"]] = valor_atributo
            
            # Quitar el atributo procesado
            atributos.pop(0)
            data["atributos_pendientes"] = atributos
            
            if atributos:
                # Preguntar siguiente atributo
                siguiente_atributo = atributos[0]
                
                if siguiente_atributo["tipo"] == "select" and siguiente_atributo.get("opciones"):
                    opciones = siguiente_atributo["opciones"].split(",")
                    keyboard = [[InlineKeyboardButton(opt.strip(), callback_data=f"attr_{opt.strip()}")] for opt in opciones]
                    reply_markup = InlineKeyboardMarkup(keyboard)
                    
                    respuesta = f"Perfecto. Ahora, ¿{siguiente_atributo['nombre']}?"
                    await query.edit_message_text(respuesta, reply_markup=reply_markup)
                else:
                    respuesta = f"Perfecto. Ahora, escribe: {siguiente_atributo['nombre']}"
                    await query.edit_message_text(respuesta)
            else:
                # No hay más atributos, pasar a confirmación
                user_state[user_id] = STATE_CONFIRM_PURCHASE
                
                respuesta = flow_config.get("mensaje_confirmacion", "¿Deseas confirmar tu interés en este producto?")
                
                keyboard = [
                    [InlineKeyboardButton("✅ Sí, me interesa", callback_data="confirmar_si")],
                    [InlineKeyboardButton("🤔 Déjame pensarlo", callback_data="confirmar_luego")]
                ]
                reply_markup = InlineKeyboardMarkup(keyboard)
                
                await query.edit_message_text(respuesta, reply_markup=reply_markup)
    
    # ===== Confirmación de compra: SÍ =====
    elif callback_data == "confirmar_si":
        data["categoria"] = "hot"  # Lead caliente: listo para comprar
        user_state[user_id] = STATE_GET_EMAIL
        
        respuesta = "¡Genial! 🎉 Para finalizar, necesito algunos datos.\n\n¿Cuál es tu correo electrónico?"
        await query.edit_message_text(respuesta)
    
    # ===== Confirmación de compra: LUEGO =====
    elif callback_data == "confirmar_luego":
        data["categoria"] = "warm"  # Lead tibio: interesado pero no confirma
        user_state[user_id] = STATE_GET_EMAIL
        
        respuesta = "Entiendo. De todas formas, déjame tus datos para poder contactarte después.\n\n¿Cuál es tu correo electrónico?"
        await query.edit_message_text(respuesta)


def main() -> None:
    """Función principal"""
    app = Application.builder().token(TOKEN).build()

    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    app.add_handler(CallbackQueryHandler(handle_callback))

    bot_info = f"{BOT_NOMBRE} (ID: {BOT_ID})" if BOT_ID else "LAIDA Bot"
    print(f"🤖 Bot conversacional básico en ejecución: {bot_info}")
    print(f"📊 Base de datos: {DB_PATH}")
    print(f"\n⏳ Esperando mensajes...\n")
    app.run_polling()


if __name__ == "__main__":
    main()
