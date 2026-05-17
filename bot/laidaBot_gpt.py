#!/usr/bin/env python3
"""
Bot conversacional de LAIDA con integración de GPT (OpenAI)
- Inteligencia artificial para entender intenciones
- Recomendaciones personalizadas de productos
- Categorización automática de leads (hot/warm/cold)
- Respuestas naturales y contextuales
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
from openai import OpenAI

load_dotenv()

TOKEN = os.getenv("TELEGRAM_TOKEN")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
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

if not OPENAI_API_KEY:
    raise ValueError(
        "❌ No se encontró OPENAI_API_KEY\n"
        "   Este bot requiere OpenAI configurado\n"
        "   Configura la API key desde el panel de super admin al editar el bot"
    )

# Inicializar cliente de OpenAI
openai_client = OpenAI(api_key=OPENAI_API_KEY)

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
STATE_FREE_CONVERSATION = "FREE_CONVERSATION"

# Almacenamiento en memoria
user_state: Dict[int, str] = {}
user_data: Dict[int, Dict[str, Any]] = {}
conversation_history: Dict[int, List[Dict[str, str]]] = {}


def get_connection() -> sqlite3.Connection:
    """Conectar a la base de datos SQLite"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def get_bot_by_id(bot_id: int) -> Optional[Dict[str, Any]]:
    """Obtener información del bot"""
    query = "SELECT id, nombre, slug, manager_id, marca_id FROM bots WHERE id = ? LIMIT 1"
    with get_connection() as conn:
        row = conn.execute(query, (bot_id,)).fetchone()
    return dict(row) if row else None


def get_bot_flow_config(bot_id: int) -> Dict[str, Any]:
    """Obtener configuración del flujo del bot"""
    with get_connection() as conn:
        bot_row = conn.execute("SELECT manager_id, marca_id FROM bots WHERE id = ?", (bot_id,)).fetchone()
        manager_id = bot_row["manager_id"] if bot_row else None
        marca_id = bot_row["marca_id"] if bot_row else None

        row = conn.execute("SELECT * FROM bot_flow_config WHERE bot_id = ? LIMIT 1", (bot_id,)).fetchone()

        if row:
            return dict(row)

        # Fallback a config_bot si no existe bot_flow_config
        config_row = None
        config_marca_id = marca_id if marca_id is not None else manager_id
        if config_marca_id is not None:
            config_row = conn.execute("SELECT * FROM config_bot WHERE marca_id = ? LIMIT 1", (config_marca_id,)).fetchone()

        if not config_row:
            config_row = conn.execute("SELECT * FROM config_bot WHERE marca_id = ? LIMIT 1", (bot_id,)).fetchone()

        if config_row:
            return {
                "mensaje_bienvenida": config_row["mensaje_bienvenida"] or "¡Hola! 👋 Bienvenido a nuestra tienda.",
                "mensaje_sin_interes": "Entiendo. Si cambias de opinión, aquí estaré para ayudarte. ¡Hasta pronto! 👋",
                "mensaje_productos": "¿Te gustaría ver nuestros productos disponibles?",
                "mensaje_caracteristicas": "¿Qué características te interesan para este producto?",
                "mensaje_confirmacion": "¿Deseas confirmar tu interés en este producto?",
                "mensaje_agradecimiento": "¡Gracias por tu interés! Un asesor se pondrá en contacto contigo pronto. 😊",
                "mostrar_productos_inicio": 1,
                "max_productos_mostrar": 5,
                "permitir_recomendaciones": 1
            }

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
    if marca_id is not None:
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


def get_esencia_marca(marca_id: Optional[int]) -> Optional[Dict[str, Any]]:
    """Obtener la esencia de la marca para contexto"""
    if not marca_id:
        return None
    
    query = "SELECT * FROM esencia WHERE marca_id = ? LIMIT 1"
    with get_connection() as conn:
        row = conn.execute(query, (marca_id,)).fetchone()
    return dict(row) if row else None


def is_valid_email(email: str) -> bool:
    """Validar formato de email"""
    return bool(re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email.strip()))


def has_strong_purchase_intent(text: str) -> bool:
    """Heurística simple para marcar HOT solo con intención fuerte."""
    t = text.lower()
    strong_keywords = [
        "comprar",
        "lo compro",
        "lo quiero",
        "quiero comprar",
        "precio",
        "cuánto cuesta",
        "cuanto cuesta",
        "pagar",
        "pago",
        "envío",
        "envio",
        "entrega",
        "hoy",
        "ahora",
        "reservar",
        "ordenar",
        "pedido",
        "stock",
        "disponible",
    ]
    return any(k in t for k in strong_keywords)


def extract_phone(text: str) -> Optional[str]:
    """Extraer y validar teléfono (10 dígitos)"""
    phone = re.sub(r"\D", "", text)
    return phone if len(phone) == 10 else None


def save_lead(bot_id: int, telegram_user_id: int, data: Dict[str, Any]) -> int:
    """Guardar lead en la base de datos"""
    query = """
        INSERT INTO leads (
            bot_id, bot_slug, bot_nombre, interes, email, telefono,
            telegram_user_id, estado, categoria, producto_id, marca_id, detalles_compra, notas,
            actualizado_en
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(bot_id, telegram_user_id) DO UPDATE SET
            bot_slug = COALESCE(excluded.bot_slug, leads.bot_slug),
            bot_nombre = COALESCE(excluded.bot_nombre, leads.bot_nombre),
            interes = COALESCE(NULLIF(excluded.interes, ''), leads.interes),
            email = COALESCE(excluded.email, leads.email),
            telefono = COALESCE(excluded.telefono, leads.telefono),
            estado = COALESCE(excluded.estado, leads.estado),
            categoria = COALESCE(excluded.categoria, leads.categoria),
            producto_id = COALESCE(excluded.producto_id, leads.producto_id),
            marca_id = COALESCE(excluded.marca_id, leads.marca_id),
            detalles_compra = COALESCE(excluded.detalles_compra, leads.detalles_compra),
            notas = COALESCE(excluded.notas, leads.notas),
            actualizado_en = CURRENT_TIMESTAMP
    """

    with get_connection() as conn:
        bot_row = conn.execute("SELECT marca_id FROM bots WHERE id = ?", (bot_id,)).fetchone()
        marca_id = bot_row["marca_id"] if bot_row else None
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
            marca_id,
            data.get('detalles_compra'),
            data.get('notas')
        ))
        conn.commit()
        row = conn.execute(
            "SELECT id FROM leads WHERE bot_id = ? AND telegram_user_id = ? LIMIT 1",
            (bot_id, telegram_user_id),
        ).fetchone()
        return int(row["id"]) if row else 0


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


def add_to_conversation_history(user_id: int, role: str, content: str) -> None:
    """Agregar mensaje al historial de conversación para GPT"""
    if user_id not in conversation_history:
        conversation_history[user_id] = []
    
    conversation_history[user_id].append({"role": role, "content": content})
    
    # Mantener solo los últimos 10 mensajes para no exceder límites de tokens
    if len(conversation_history[user_id]) > 10:
        conversation_history[user_id] = conversation_history[user_id][-10:]


def get_conversation_context(user_id: int, productos: List[Dict[str, Any]], esencia: Optional[Dict[str, Any]] = None) -> str:
    """Construir contexto para GPT"""
    context = "Eres un asistente de ventas amigable y profesional. Tu objetivo es ayudar a los clientes a encontrar productos que les interesen.\n\n"
    
    if esencia:
        context += f"Información de la marca:\n"
        if esencia.get("valores"):
            context += f"- Valores: {esencia['valores']}\n"
        if esencia.get("diferencia"):
            context += f"- Diferenciador: {esencia['diferencia']}\n"
        if esencia.get("historia"):
            context += f"- Historia: {esencia['historia']}\n"
        context += "\n"
    
    if productos:
        context += "Productos disponibles:\n"
        for prod in productos:
            precio_str = f"${prod['precio']:,.0f}" if prod.get('precio') else "Precio a consultar"
            context += f"- {prod['nombre']} ({precio_str})"
            if prod.get('descripcion'):
                context += f": {prod['descripcion']}"
            context += "\n"
        context += "\n"
    
    context += "Instrucciones:\n"
    context += "- Sé amable y profesional\n"
    context += "- Haz preguntas para entender las necesidades del cliente\n"
    context += "- Recomienda productos basándote en lo que el cliente menciona\n"
    context += "- No inventes información sobre productos que no existen\n"
    context += "- Sé breve y directo (máximo 2-3 oraciones)\n"
    
    return context


def analyze_user_intent_with_gpt(user_message: str, productos: List[Dict[str, Any]], esencia: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Usar GPT para analizar la intención del usuario
    Retorna: {
        "interes": bool,  # ¿Muestra interés en comprar?
        "categoria": "hot" | "warm" | "cold",  # Nivel de interés
        "producto_recomendado": int | None,  # ID del producto recomendado
        "razon": str  # Explicación de la decisión
    }
    """
    productos_json = json.dumps([{
        "id": p["id"],
        "nombre": p["nombre"],
        "descripcion": p.get("descripcion", ""),
        "precio": p.get("precio", 0)
    } for p in productos], ensure_ascii=False)
    
    esencia_text = ""
    if esencia:
        esencia_text = f"\nEsencia de la marca:\n- Valores: {esencia.get('valores', '')}\n- Diferencia: {esencia.get('diferencia', '')}\n"
    
    prompt = f"""Analiza el siguiente mensaje de un cliente y determina:
1. ¿Muestra interés en comprar? (true/false)
2. Nivel de interés: "hot" (listo para comprar), "warm" (interesado pero evaluando), o "cold" (sin interés)
3. ¿Hay algún producto que le podría interesar basándote en su mensaje?

Reglas IMPORTANTES para evitar falsos "hot":
- Marca "hot" SOLO si el cliente expresa intención clara de compra inmediata (p.ej. quiere comprar, precio, pago, envío, disponibilidad, hoy/ahora) o confirma que desea comprar.
- Si el cliente solo pregunta información general o está explorando, marca "warm".
- Si el cliente dice que no le interesa o rechaza, marca "cold".
- No uses email/teléfono del cliente (puede no existir); decide solo por el contenido del mensaje.

Mensaje del cliente: "{user_message}"

Productos disponibles:
{productos_json}
{esencia_text}

Responde SOLO con un JSON válido con esta estructura:
{{
    "interes": true o false,
    "categoria": "hot" o "warm" o "cold",
    "producto_recomendado_id": número o null,
    "razon": "breve explicación"
}}"""

    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=200
        )
        
        result_text = response.choices[0].message.content.strip()
        
        # Extraer JSON del texto (por si GPT agrega texto adicional)
        json_match = re.search(r'\{.*\}', result_text, re.DOTALL)
        if json_match:
            result = json.loads(json_match.group())
            return result
        else:
            return {
                "interes": True,
                "categoria": "warm",
                "producto_recomendado_id": None,
                "razon": "No se pudo analizar la intención"
            }
    except Exception as e:
        print(f"Error al analizar intención con GPT: {e}")
        return {
            "interes": True,
            "categoria": "warm",
            "producto_recomendado_id": None,
            "razon": "Error en análisis"
        }


def generate_gpt_response(user_id: int, user_message: str, productos: List[Dict[str, Any]], esencia: Optional[Dict[str, Any]] = None) -> str:
    """Generar respuesta usando GPT con contexto de conversación"""
    
    # Construir contexto
    context = get_conversation_context(user_id, productos, esencia)
    
    # Preparar mensajes para GPT
    messages = [{"role": "system", "content": context}]
    
    # Agregar historial de conversación
    if user_id in conversation_history:
        messages.extend(conversation_history[user_id])
    
    # Agregar mensaje actual
    messages.append({"role": "user", "content": user_message})
    
    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=0.7,
            max_tokens=250
        )
        
        respuesta = response.choices[0].message.content.strip()
        
        # Agregar al historial
        add_to_conversation_history(user_id, "user", user_message)
        add_to_conversation_history(user_id, "assistant", respuesta)
        
        return respuesta
    except Exception as e:
        print(f"Error al generar respuesta con GPT: {e}")
        return "Disculpa, tuve un problema procesando tu mensaje. ¿Podrías reformularlo?"


def recommend_product_with_gpt(user_message: str, productos: List[Dict[str, Any]]) -> Optional[int]:
    """Recomendar un producto basándose en lo que dice el usuario"""
    
    productos_json = json.dumps([{
        "id": p["id"],
        "nombre": p["nombre"],
        "descripcion": p.get("descripcion", ""),
        "precio": p.get("precio", 0)
    } for p in productos], ensure_ascii=False)
    
    prompt = f"""Basándote en lo que el cliente dice, ¿qué producto le recomendarías?

Mensaje del cliente: "{user_message}"

Productos disponibles:
{productos_json}

Responde SOLO con el ID numérico del producto que mejor se ajusta, o "null" si ninguno encaja.
Ejemplo: 3"""

    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=50
        )
        
        result_text = response.choices[0].message.content.strip()
        
        # Intentar extraer número
        if result_text.lower() == "null" or result_text.lower() == "ninguno":
            return None
        
        try:
            producto_id = int(result_text)
            # Validar que el producto existe
            if any(p["id"] == producto_id for p in productos):
                return producto_id
        except ValueError:
            pass
        
        return None
    except Exception as e:
        print(f"Error al recomendar producto con GPT: {e}")
        return None


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Comando /start - Iniciar conversación con el bot"""
    if not update.message or not update.effective_user:
        return

    user_id = update.effective_user.id
    raw_args = context.args

    if raw_args:
        try:
            bot_id = int(raw_args[0])
        except ValueError:
            await update.message.reply_text("El bot_id debe ser numérico.")
            return
    elif BOT_ID:
        bot_id = int(BOT_ID)
    else:
        await update.message.reply_text("⚠️ Bot no configurado. Contacta al administrador.")
        return

    # Obtener información del bot
    bot_info = get_bot_by_id(bot_id)
    if not bot_info:
        respuesta = f"No existe un bot con id {bot_id}. Verifica el enlace de inicio."
        await update.message.reply_text(respuesta)
        return

    # Obtener configuración del flujo
    flow_config = get_bot_flow_config(bot_id)
    
    # Obtener productos
    marca_id = bot_info.get("marca_id")
    if marca_id is None:
        marca_id = bot_info.get("manager_id")

    productos = get_productos_activos(
        marca_id=marca_id,
        limit=flow_config.get("max_productos_mostrar", 5),
    )
    
    # Obtener esencia de marca
    esencia = get_esencia_marca(marca_id) if marca_id else None

    # Inicializar datos del usuario
    user_data[user_id] = {
        "bot_id": bot_id,
        "bot_info": bot_info,
        "flow_config": flow_config,
        "productos": productos,
        "esencia": esencia,
        "marca_id": marca_id,
        "selected_product": None,
        "product_attributes": {},
        "email": None,
        "phone": None,
        "interes": "",
        "categoria": "warm"
    }
    user_state[user_id] = STATE_FREE_CONVERSATION
    conversation_history[user_id] = []

    # Registrar interacción
    save_interaccion(bot_id, user_id, "inicio")

    # Mensaje de bienvenida personalizado con GPT
    mensaje_bienvenida = flow_config.get("mensaje_bienvenida", "¡Hola! 👋 Bienvenido.")
    
    # Generar mensaje de apertura con GPT
    contexto_inicial = f"{mensaje_bienvenida}\n\n¿En qué puedo ayudarte hoy?"
    respuesta = generate_gpt_response(user_id, "Hola", productos, esencia)
    
    # Si GPT no generó respuesta, usar mensaje por defecto
    if not respuesta or "problema procesando" in respuesta:
        respuesta = contexto_inicial
    
    await update.message.reply_text(respuesta)
    guardar_conversacion(bot_id, user_id, "WELCOME", f"/start {bot_id}", respuesta)


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Manejar mensajes de texto del usuario con inteligencia GPT"""
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
    productos = data.get("productos", [])
    esencia = data.get("esencia")

    # Upsert ligero en cada mensaje (para reflejar actividad en dashboard).
    # En STATE_FREE_CONVERSATION se actualizará de nuevo con la categoría calculada.
    try:
        save_lead(bot_id, user_id, {
            "bot_slug": data["bot_info"].get("slug"),
            "bot_nombre": data["bot_info"].get("nombre"),
            "interes": data.get("interes") or f"Lead {user_id}",
            "email": data.get("email"),
            "telefono": data.get("phone"),
            "estado": "nuevo",
            "categoria": data.get("categoria", "warm"),
        })
    except Exception as e:
        print(f"Error upsert lead (pre): {e}")

    # ===== ESTADO: Conversación libre con GPT =====
    if state == STATE_FREE_CONVERSATION:
        # Analizar intención del usuario con GPT
        analisis = analyze_user_intent_with_gpt(text, productos, esencia)
        
        interes = analisis.get("interes", True)
        producto_recomendado_id = analisis.get("producto_recomendado_id")

        categoria = analisis.get("categoria", "warm")
        if not interes:
            categoria = "cold"
        elif categoria == "hot":
            # HOT solo si hay señales fuertes; si no, degradar a WARM
            if not producto_recomendado_id and not data.get("selected_product") and not (data.get("email") or data.get("phone")):
                if not has_strong_purchase_intent(text):
                    categoria = "warm"

        data["categoria"] = categoria
        
        # Generar respuesta con GPT
        respuesta_gpt = generate_gpt_response(user_id, text, productos, esencia)
        
        # Si GPT recomienda un producto específico o hay alta intención de compra
        if producto_recomendado_id or analisis.get("categoria") == "hot":
            await update.message.reply_text(respuesta_gpt)
            
            # Mostrar productos
            if productos:
                keyboard = []
                for producto in productos:
                    precio_format = f"${producto['precio']:,.0f}" if producto.get('precio') else "Precio a consultar"
                    button_text = f"{producto['nombre']} - {precio_format}"
                    keyboard.append([InlineKeyboardButton(button_text, callback_data=f"producto_{producto['id']}")])
                
                keyboard.append([InlineKeyboardButton("❌ No me interesa ninguno", callback_data="ninguno")])
                
                reply_markup = InlineKeyboardMarkup(keyboard)
                
                await update.message.reply_text(
                    "Aquí están nuestros productos disponibles. ¿Cuál te interesa?",
                    reply_markup=reply_markup
                )
                
                user_state[user_id] = STATE_SHOW_PRODUCTS
                save_interaccion(bot_id, user_id, "producto_visto")
        
        elif not interes or analisis.get("categoria") == "cold":
            # Usuario no muestra interés - intentar reengagement
            await update.message.reply_text(respuesta_gpt)
            
            # Dar una última oportunidad
            keyboard = [
                [InlineKeyboardButton("✅ Sí, muéstrame productos", callback_data="reengagement_si")],
                [InlineKeyboardButton("❌ No, gracias", callback_data="reengagement_no")]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            await update.message.reply_text(
                "¿Quisieras que te muestre nuestros productos de todas formas?",
                reply_markup=reply_markup
            )
            
            user_state[user_id] = STATE_COLD_REENGAGEMENT
            save_interaccion(bot_id, user_id, "desinteres", datos=text)
        
        else:
            # Conversación normal - warm lead
            await update.message.reply_text(respuesta_gpt)
        
        data["interes"] = text

        # Upsert con la categoría resultante de este mensaje
        try:
            save_lead(bot_id, user_id, {
                "bot_slug": data["bot_info"].get("slug"),
                "bot_nombre": data["bot_info"].get("nombre"),
                "interes": data.get("interes", ""),
                "email": data.get("email"),
                "telefono": data.get("phone"),
                "estado": "nuevo",
                "categoria": data.get("categoria", "warm"),
                "producto_id": producto_recomendado_id,
                "notas": f"Lead actualizado por mensaje (GPT). Categoría: {data.get('categoria', 'warm')}",
            })
        except Exception as e:
            print(f"Error upsert lead (post): {e}")

        guardar_conversacion(bot_id, user_id, state, text, respuesta_gpt)
    
    # ===== ESTADO: Re-engagement de leads fríos =====
    elif state == STATE_COLD_REENGAGEMENT:
        # GPT ya manejó esto, pero por si acaso
        respuesta = generate_gpt_response(user_id, text, productos, esencia)
        await update.message.reply_text(respuesta)
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
        # Intentar extraer email del mensaje con GPT
        if is_valid_email(text):
            email = text
        else:
            # Usar GPT para extraer email del texto
            prompt = f'Extrae SOLO el email del siguiente texto. Si no hay email válido, responde "null".\n\nTexto: "{text}"\n\nEmail:'
            
            try:
                response = openai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.1,
                    max_tokens=50
                )
                
                email_extraido = response.choices[0].message.content.strip()
                
                if email_extraido.lower() != "null" and is_valid_email(email_extraido):
                    email = email_extraido
                else:
                    respuesta = "No pude identificar un correo válido. Por favor compártelo en formato: nombre@dominio.com"
                    await update.message.reply_text(respuesta)
                    guardar_conversacion(bot_id, user_id, state, text, respuesta)
                    return
            except:
                respuesta = "Ese correo no parece válido. Intenta nuevamente con formato nombre@dominio.com"
                await update.message.reply_text(respuesta)
                guardar_conversacion(bot_id, user_id, state, text, respuesta)
                return
        
        data["email"] = email
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
        
        detalles_compra = json.dumps(atributos_seleccionados, ensure_ascii=False) if atributos_seleccionados else None
        
        # Preparar resumen de conversación para notas
        historial = conversation_history.get(user_id, [])
        resumen_conversacion = "\n".join([f"{msg['role']}: {msg['content'][:100]}" for msg in historial[-3:]])
        
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
            "notas": f"Lead {data.get('categoria', 'warm')} generado por bot GPT. Conversación: {resumen_conversacion}"
        })
        
        # Registrar interacción de compra
        if data.get("categoria") == "hot":
            save_interaccion(bot_id, user_id, "compra", producto_seleccionado["id"] if producto_seleccionado else None, detalles_compra)
        
        # Mensaje de confirmación final personalizado con GPT
        contexto_final = f"Genera un mensaje de agradecimiento personalizado para un cliente que acaba de dejar sus datos. Producto: {producto_seleccionado['nombre'] if producto_seleccionado else 'varios'}"
        
        try:
            response = openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "user", "content": contexto_final}
                ],
                temperature=0.8,
                max_tokens=150
            )
            
            respuesta = response.choices[0].message.content.strip()
        except:
            respuesta = flow_config.get("mensaje_agradecimiento", "¡Gracias por tu interés! Un asesor se pondrá en contacto contigo pronto. 😊")
        
        if producto_seleccionado:
            respuesta += f"\n\n📦 Producto: {producto_seleccionado['nombre']}"
        
        respuesta += f"\n📧 Email: {data['email']}\n📞 Teléfono: {data['phone']}"
        
        await update.message.reply_text(respuesta)
        guardar_conversacion(bot_id, user_id, state, text, respuesta)
        
        # Limpiar estado
        user_state.pop(user_id, None)
        user_data.pop(user_id, None)
        conversation_history.pop(user_id, None)
    
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

    # Upsert del lead también en interacciones por botones (no solo mensajes)
    try:
        save_lead(bot_id, user_id, {
            "bot_slug": data["bot_info"].get("slug"),
            "bot_nombre": data["bot_info"].get("nombre"),
            "interes": data.get("interes") or f"Lead {user_id}",
            "email": data.get("email"),
            "telefono": data.get("phone"),
            "estado": "nuevo",
            "categoria": data.get("categoria", "warm"),
            "notas": "Interacción por botón (callback)",
        })
    except Exception as e:
        print(f"Error upsert lead (callback): {e}")
    
    # ===== Re-engagement =====
    if callback_data == "reengagement_si":
        # Usuario acepta ver productos
        data["categoria"] = "warm"
        user_state[user_id] = STATE_SHOW_PRODUCTS
        
        productos = data.get("productos", [])
        
        if not productos:
            await query.edit_message_text("Lo siento, en este momento no tenemos productos disponibles. 😔")
            return
        
        keyboard = []
        for producto in productos:
            precio_format = f"${producto['precio']:,.0f}" if producto.get('precio') else "Precio a consultar"
            button_text = f"{producto['nombre']} - {precio_format}"
            keyboard.append([InlineKeyboardButton(button_text, callback_data=f"producto_{producto['id']}")])
        
        keyboard.append([InlineKeyboardButton("❌ No me interesa ninguno", callback_data="ninguno")])
        
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await query.edit_message_text("¡Perfecto! 😊 Aquí están nuestros productos:", reply_markup=reply_markup)
        save_interaccion(bot_id, user_id, "producto_visto")

        try:
            save_lead(bot_id, user_id, {
                "bot_slug": data["bot_info"].get("slug"),
                "bot_nombre": data["bot_info"].get("nombre"),
                "interes": data.get("interes") or f"Lead {user_id}",
                "estado": "nuevo",
                "categoria": data.get("categoria", "warm"),
                "notas": "Re-engagement: aceptó ver productos",
            })
        except Exception as e:
            print(f"Error upsert lead (reengagement_si): {e}")
    
    elif callback_data == "reengagement_no":
        # Usuario confirma que no le interesa
        data["categoria"] = "cold"
        
        respuesta = flow_config.get("mensaje_sin_interes", "Entiendo. ¡Hasta pronto! 👋")
        await query.edit_message_text(respuesta)
        
        # Guardar lead frío
        save_lead(bot_id, user_id, {
            "bot_slug": data["bot_info"].get("slug"),
            "bot_nombre": data["bot_info"].get("nombre"),
            "interes": data.get("interes", "No mostró interés"),
            "email": None,
            "telefono": None,
            "estado": "nuevo",
            "categoria": "cold",
            "notas": "Lead frío: no mostró interés después de re-engagement"
        })
        
        save_interaccion(bot_id, user_id, "desinteres")
        
        # Limpiar estado
        user_state.pop(user_id, None)
        user_data.pop(user_id, None)
        conversation_history.pop(user_id, None)
    
    # ===== Selección de producto =====
    elif callback_data.startswith("producto_"):
        producto_id = int(callback_data.split("_")[1])
        producto = get_producto_by_id(producto_id)
        
        if not producto:
            await query.edit_message_text("Producto no encontrado. 😔")
            return
        
        data["selected_product"] = producto
        data["interes"] = f"Interesado en {producto['nombre']}"
        data["categoria"] = "warm"

        try:
            save_lead(bot_id, user_id, {
                "bot_slug": data["bot_info"].get("slug"),
                "bot_nombre": data["bot_info"].get("nombre"),
                "interes": data.get("interes") or f"Lead {user_id}",
                "estado": "nuevo",
                "categoria": data.get("categoria", "warm"),
                "producto_id": producto_id,
                "notas": "Seleccionó producto",
            })
        except Exception as e:
            print(f"Error upsert lead (producto): {e}")
        
        # Obtener atributos del producto
        atributos = get_producto_atributos(producto_id)
        
        if atributos:
            # Hay atributos que recolectar
            user_state[user_id] = STATE_COLLECT_ATTRIBUTES
            data["atributos_pendientes"] = atributos
            data["product_attributes"] = {}
            
            primer_atributo = atributos[0]
            
            # Generar descripción con GPT
            try:
                prompt = f"Describe este producto de manera atractiva y breve (máximo 2 oraciones): {producto['nombre']}"
                if producto.get('descripcion'):
                    prompt += f"\n\nDescripción existente: {producto['descripcion']}"
                
                response = openai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.7,
                    max_tokens=100
                )
                
                descripcion_gpt = response.choices[0].message.content.strip()
            except:
                descripcion_gpt = producto.get('descripcion', '')
            
            respuesta = f"¡Excelente elección! 👍\n\n📦 {producto['nombre']}"
            if descripcion_gpt:
                respuesta += f"\n\n{descripcion_gpt}"
            
            respuesta += f"\n\nPara ayudarte mejor, necesito saber:\n\n{primer_atributo['nombre']}:"
            
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
            
            # Generar descripción con GPT
            try:
                prompt = f"Describe este producto de manera atractiva y breve (máximo 2 oraciones): {producto['nombre']}"
                if producto.get('descripcion'):
                    prompt += f"\n\nDescripción existente: {producto['descripcion']}"
                
                response = openai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.7,
                    max_tokens=100
                )
                
                descripcion_gpt = response.choices[0].message.content.strip()
            except:
                descripcion_gpt = producto.get('descripcion', '')
            
            respuesta = f"¡Excelente elección! 👍\n\n📦 {producto['nombre']}"
            if descripcion_gpt:
                respuesta += f"\n\n{descripcion_gpt}"
            
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
        conversation_history.pop(user_id, None)
    
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
        data["categoria"] = "hot"
        user_state[user_id] = STATE_GET_EMAIL
        
        respuesta = "¡Genial! 🎉 Para finalizar, necesito algunos datos.\n\n¿Cuál es tu correo electrónico?"
        await query.edit_message_text(respuesta)

        try:
            save_lead(bot_id, user_id, {
                "bot_slug": data["bot_info"].get("slug"),
                "bot_nombre": data["bot_info"].get("nombre"),
                "interes": data.get("interes") or f"Lead {user_id}",
                "estado": "nuevo",
                "categoria": data.get("categoria", "hot"),
                "notas": "Confirmó interés de compra",
            })
        except Exception as e:
            print(f"Error upsert lead (confirmar_si): {e}")
    
    # ===== Confirmación de compra: LUEGO =====
    elif callback_data == "confirmar_luego":
        data["categoria"] = "warm"
        user_state[user_id] = STATE_GET_EMAIL
        
        respuesta = "Entiendo. De todas formas, déjame tus datos para poder contactarte después.\n\n¿Cuál es tu correo electrónico?"
        await query.edit_message_text(respuesta)

        try:
            save_lead(bot_id, user_id, {
                "bot_slug": data["bot_info"].get("slug"),
                "bot_nombre": data["bot_info"].get("nombre"),
                "interes": data.get("interes") or f"Lead {user_id}",
                "estado": "nuevo",
                "categoria": data.get("categoria", "warm"),
                "notas": "Postergó compra (warm)",
            })
        except Exception as e:
            print(f"Error upsert lead (confirmar_luego): {e}")


def main() -> None:
    """Función principal"""
    app = Application.builder().token(TOKEN).build()

    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    app.add_handler(CallbackQueryHandler(handle_callback))

    bot_info = f"{BOT_NOMBRE} (ID: {BOT_ID})" if BOT_ID else "LAIDA Bot"
    print(f"🤖 Bot conversacional con GPT en ejecución: {bot_info}")
    print(f"✅ OpenAI API configurada")
    print(f"📊 Base de datos: {DB_PATH}")
    print(f"\n⏳ Esperando mensajes...\n")
    app.run_polling()


if __name__ == "__main__":
    main()
