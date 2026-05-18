# 🤖 Bot Conversacional Inteligente - LAIDA

> **🧠 NUEVA VERSIÓN CON GPT DISPONIBLE**: Ahora existe una versión mejorada con inteligencia artificial que entiende lenguaje natural, hace recomendaciones inteligentes y categoriza leads automáticamente. Ver [BOT_GPT.md](BOT_GPT.md) para más información.

## Versiones Disponibles

### 1. **Bot Conversacional Básico** (`laidaBot_conversacional.py`)
- ✅ Flujo estructurado con botones
- ✅ Detección simple de intenciones (keywords)
- ✅ Categorización manual (hot/warm/cold)
- ✅ Productos configurables con atributos
- ✅ Sin costo adicional de API
- 📍 **Documentado en este archivo**

### 2. **Bot con Inteligencia Artificial** (`laidaBot_gpt.py`) 🌟
- ✅ Todo lo del bot básico +
- 🧠 Comprensión de lenguaje natural con GPT
- 🎯 Análisis inteligente de intenciones
- 💡 Recomendaciones personalizadas de productos
- 🤖 Respuestas contextuales y adaptativas
- 💰 Costo: ~$1-3 USD por 1000 conversaciones
- 📍 **Documentado en [BOT_GPT.md](BOT_GPT.md)**

---

## Descripción General (Bot Básico)

El bot conversacional básico de LAIDA implementa un flujo inteligente de ventas que categoriza leads, maneja productos configurables, y proporciona una experiencia de usuario personalizada usando lógica programada.

## 🎯 Características Principales

### 1. Flujo Conversacional Inteligente

El bot sigue este flujo:

```
INICIO → ¿Te interesa algún producto?
  ├─ SÍ → Mostrar productos → Seleccionar → Características → ¿Confirmas compra?
  │                                                                ├─ SÍ → LEAD HOT ✅
  │                                                                └─ NO/LUEGO → LEAD WARM 🟡
  └─ NO → ¿Seguro? → Reengagement
                      ├─ SÍ (cambió de opinión) → Continuar flujo normal
                      └─ NO → LEAD COLD ❄️
```

### 2. Categorización de Leads

- **HOT (Caliente) 🔥**: Usuario confirma interés en compra inmediata
- **WARM (Tibio) 🟡**: Usuario interesado pero no confirma compra ahora
- **COLD (Frío) ❄️**: Usuario sin interés en este momento

### 3. Productos Configurables

Cada producto puede tener atributos personalizados:
- **text**: Campo de texto libre (ej: "¿Qué mensaje quieres en la tarjeta?")
- **number**: Valores numéricos (ej: "¿Cuántas unidades?")
- **select**: Opciones predefinidas (ej: "¿Qué color? Rojo, Azul, Verde")
- **color**: Selector de color (ej: "¿Qué color prefieres?")

### 4. Configuración del Flujo

Cada bot puede personalizar sus mensajes:
- Mensaje de bienvenida
- Mensaje para usuarios sin interés
- Mensaje para mostrar productos
- Mensaje para solicitar características
- Mensaje de confirmación
- Mensaje de agradecimiento

### 5. Tracking de Interacciones

El sistema registra todas las interacciones:
- **inicio**: Usuario inicia conversación
- **producto_visto**: Usuario ve un producto
- **caracteristica**: Usuario especifica características
- **compra**: Usuario confirma compra (lead hot)
- **abandono**: Usuario abandona el flujo
- **desinteres**: Usuario no muestra interés

## 📊 Esquema de Base de Datos

### Tablas Nuevas/Actualizadas

#### `leads` (actualizada)
```sql
- categoria: 'hot' | 'warm' | 'cold'
- producto_id: ID del producto de interés
- detalles_compra: JSON con atributos seleccionados
- notas: Notas adicionales
```

#### `productos` (actualizada)
```sql
- descripcion: Descripción del producto
- imagen_url: URL de la imagen
- activo: 1 = activo, 0 = inactivo
```

#### `producto_atributos` (nueva)
```sql
- producto_id: FK a productos
- nombre: Nombre del atributo (ej: "Color")
- tipo: 'text' | 'number' | 'select' | 'color'
- opciones: Opciones separadas por coma (para tipo select)
- requerido: 1 = requerido, 0 = opcional
- orden: Orden de presentación
```

#### `bot_flow_config` (nueva)
```sql
- bot_id: FK a bots
- mensaje_bienvenida: Texto personalizado
- mensaje_sin_interes: Texto para desinteresados
- mensaje_productos: Texto al mostrar productos
- mensaje_caracteristicas: Texto al solicitar características
- mensaje_confirmacion: Texto al confirmar compra
- mensaje_agradecimiento: Texto final
- mostrar_productos_inicio: 1 = mostrar al inicio
- max_productos_mostrar: Número máximo de productos
- permitir_recomendaciones: 1 = permitir recomendaciones
```

#### `bot_interacciones` (nueva)
```sql
- bot_id: FK a bots
- telegram_user_id: ID de Telegram del usuario
- tipo: Tipo de interacción
- producto_id: FK a productos (opcional)
- datos: JSON con datos adicionales
- created_at: Timestamp
```

## 🚀 APIs Disponibles

### 1. Configuración de Flujo del Bot

**GET** `/api/config-bot/flow?botId={id}`
- Obtiene la configuración del flujo del bot
- Si no existe, retorna configuración por defecto

**POST** `/api/config-bot/flow`
```json
{
  "bot_id": 1,
  "mensaje_bienvenida": "¡Hola! 👋",
  "mensaje_sin_interes": "Entiendo...",
  "mostrar_productos_inicio": 1,
  "max_productos_mostrar": 5,
  "permitir_recomendaciones": 1
}
```

### 2. Atributos de Productos

**GET** `/api/productos/atributos?productoId={id}`
- Obtiene todos los atributos de un producto

**POST** `/api/productos/atributos`
```json
{
  "producto_id": 1,
  "nombre": "Color",
  "tipo": "select",
  "opciones": "Rojo, Azul, Verde",
  "requerido": 1,
  "orden": 1
}
```

**DELETE** `/api/productos/atributos?id={id}`
- Elimina un atributo

### 3. Productos (actualizada)

**POST** `/api/productos`
```json
{
  "nombre": "Producto 1",
  "precio": 100,
  "marca_id": 1,
  "descripcion": "Descripción del producto",
  "imagen_url": "https://...",
  "activo": 1
}
```

## Uso del Bot

### Ejecutar el Bot Conversacional

Usa siempre `bot_launcher.py` para lanzar el bot. Él lee la configuración desde la base de datos y elige automáticamente entre el bot básico y el GPT:

```bash
cd bot
python3 bot_launcher.py <bot_id>
```

Los tokens de Telegram y las API Keys de OpenAI **NO** se ponen en `.env`. Se configuran por bot desde el **Dashboard → Gestión de Bots**. Las únicas variables de entorno relevantes son:

```env
BOT_DB_PATH=../bd/laida.db          # Ruta a la base de datos SQLite
BOT_CONVERSATIONS_DIR=./conversations  # Directorio para guardar conversaciones
```

### Iniciar Conversación

Los usuarios inician con:
```
/start <bot_id>
```

Ejemplo: `/start 1`

## 📝 Ejemplos de Flujo

### Ejemplo 1: Lead HOT 🔥

```
Bot: ¡Hola! 👋 ¿Te gustaría ver nuestros productos?
Usuario: Sí
Bot: [Muestra productos con botones]
Usuario: [Selecciona "Camiseta Roja - $250"]
Bot: ¡Excelente! ¿Qué talla necesitas?
Usuario: M
Bot: ¿Cuántas unidades?
Usuario: 2
Bot: ¿Deseas confirmar tu compra?
Usuario: [Presiona "✅ Sí, me interesa"]
Bot: ¡Genial! ¿Cuál es tu correo?
Usuario: juan@email.com
Bot: ¿Tu teléfono?
Usuario: 5512345678
Bot: ¡Gracias! Un asesor te contactará pronto 😊
```

**Resultado**: Lead HOT guardado con producto_id, detalles_compra: `{"Talla": "M", "Cantidad": "2"}`

### Ejemplo 2: Lead WARM 🟡

```
Bot: ¡Hola! 👋 ¿Te gustaría ver nuestros productos?
Usuario: Sí
Bot: [Muestra productos]
Usuario: [Selecciona producto]
Bot: ¿Deseas confirmar tu compra?
Usuario: [Presiona "🤔 Déjame pensarlo"]
Bot: Entiendo. Déjame tus datos para contactarte después. ¿Tu correo?
Usuario: maria@email.com
Bot: ¿Tu teléfono?
Usuario: 5598765432
Bot: ¡Gracias! Te contactaremos pronto 😊
```

**Resultado**: Lead WARM guardado

### Ejemplo 3: Lead COLD ❄️

```
Bot: ¡Hola! 👋 ¿Te gustaría ver nuestros productos?
Usuario: No gracias
Bot: ¿Hay algo específico que te gustaría saber?
Usuario: No, gracias
Bot: Entiendo. ¡Hasta pronto! 👋
```

**Resultado**: Lead COLD guardado sin email ni teléfono

## 🎨 Personalización

### Configurar Mensajes del Bot

Desde el dashboard (próximamente):
1. Ir a "Configuración del Bot"
2. Editar mensajes personalizados
3. Configurar opciones de visualización
4. Guardar cambios

### Agregar Atributos a Productos

Desde el dashboard (próximamente):
1. Ir a "Productos"
2. Seleccionar un producto
3. Clic en "Atributos"
4. Agregar nuevos atributos:
   - Nombre del atributo
   - Tipo (text, number, select, color)
   - Opciones (si es select)
   - Requerido (sí/no)
   - Orden de presentación

### Ejemplos de Atributos

**Producto: Camiseta**
- Nombre: "Talla", Tipo: "select", Opciones: "S, M, L, XL", Requerido: Sí
- Nombre: "Color", Tipo: "color", Requerido: Sí
- Nombre: "Cantidad", Tipo: "number", Requerido: Sí

**Producto: Torta Personalizada**
- Nombre: "Sabor", Tipo: "select", Opciones: "Chocolate, Vainilla, Fresa", Requerido: Sí
- Nombre: "Personas", Tipo: "number", Requerido: Sí
- Nombre: "Mensaje", Tipo: "text", Requerido: No

## 📈 Analytics

### Métricas Disponibles

El sistema registra:
- Total de interacciones por bot
- Productos más vistos
- Tasa de conversión (hot/warm/cold)
- Abandonos en cada etapa
- Tiempo promedio de conversación

### Consultas Útiles

```sql
-- Leads por categoría
SELECT categoria, COUNT(*) as total FROM leads GROUP BY categoria;

-- Productos más populares
SELECT p.nombre, COUNT(l.id) as leads
FROM productos p
LEFT JOIN leads l ON l.producto_id = p.id
GROUP BY p.id
ORDER BY leads DESC;

-- Interacciones por tipo
SELECT tipo, COUNT(*) as total 
FROM bot_interacciones 
GROUP BY tipo;
```

## Ejecución

Usa siempre `bot_launcher.py` — selecciona automáticamente entre el bot básico y el GPT:

```bash
cd bot
python3 bot_launcher.py <bot_id>
```

Si el bot tiene `openai_key` configurada en el dashboard → arranca `laidaBot_gpt.py`.
Si no tiene key → arranca `laidaBot_conversacional.py` (este archivo).

## Troubleshooting

### El bot no responde
- Verificar que el bot esté **activo** en el Dashboard y tenga un token de Telegram válido
- Verificar conexión a base de datos (`BOT_DB_PATH` apunta al archivo correcto)
- Revisar logs en consola

### Los productos no aparecen
- Verificar que los productos tengan `activo = 1`
- Verificar que existan productos en la base de datos

### Los atributos no se muestran
- Verificar que los atributos estén asociados al producto correcto
- Revisar que el campo `tipo` sea válido

## 📚 Próximos Pasos

1. **Dashboard UI**: Interfaces para configurar bot y atributos de productos
2. **Recomendaciones**: Sistema de IA para recomendar productos
3. **Multi-idioma**: Soporte para múltiples idiomas
4. **Webhooks**: Notificaciones inmediatas en lugar de polling
5. **Reportes avanzados**: Dashboard de analytics con gráficas

## Contribuir

Para agregar nuevas funcionalidades:
1. Actualizar base de datos en `frontend/db/init.ts`
2. Agregar funciones de utilidad en `frontend/db/utils.ts`
3. Crear/actualizar APIs en `frontend/app/api/`
4. Actualizar bot en `bot/laidaBot_conversacional.py`
5. Documentar cambios en `docs/`

---

**Nota**: Este sistema es completamente configurable y extensible. Cada marca/bot puede tener su propia personalidad y flujo de conversación.
