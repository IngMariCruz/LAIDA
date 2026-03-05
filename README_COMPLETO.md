# 📱 LAIDA - Sistema Inteligente de Captura de Leads con IA

**LAIDA** es una plataforma **multi-tenant** profesional que combina bots de Telegram inteligentes con una aplicación web moderna para la captura, gestión y análisis de leads para PYMEs. Utiliza GPT para entender conversaciones naturales, recomendar productos y categorizar leads automáticamente.

---

## 📋 Tabla de Contenidos

1. [Descripción General](#descripción-general)
2. [Funcionalidades Principales](#funcionalidades-principales)
3. [Cómo Funciona el Bot](#cómo-funciona-el-bot)
4. [Sistema de Leads](#sistema-de-leads)
5. [Sistema de Notificaciones](#sistema-de-notificaciones)
6. [Gestión de Productos y Atributos](#gestión-de-productos-y-atributos)
7. [Dashboard Administrativo](#dashboard-administrativo)
8. [Arquitectura y Stack Técnico](#arquitectura-y-stack-técnico)
9. [Cómo Usar el Sistema](#cómo-usar-el-sistema)
10. [Desarrollo y Deployment](#desarrollo-y-deployment)
11. [Preguntas Frecuentes](#preguntas-frecuentes)

---

## 🎯 Descripción General

LAIDA es la solución ideal para empresas que desean:

- ✅ **Capturar leads automáticamente** a través de Telegram sin perder conversaciones valiosas
- ✅ **Entender clientes** con inteligencia artificial (GPT) que analiza intenciones naturales
- ✅ **Categorizar leads** automáticamente como "HOT" (alta prioridad), "WARM" (media) o "COLD" (baja)
- ✅ **Recomendar productos** personalizados según lo que busca el usuario
- ✅ **Gestionar múltiples bots** independientemente desde una sola plataforma
- ✅ **Colaborar en equipo** con roles de Super Admin y Manager
- ✅ **Recibir notificaciones en tiempo real** cuando ocurren eventos importantes

**Casos de uso típicos:**
- Tiendas online que venden por Telegram
- Agencias de seguros capturando clientes potenciales
- Empresas B2B buscando contactos de Decision Makers
- Servicios profesionales (asesorías, consultoría, desarrollo)
- Inmobiliarias y propiedades
- Cualquier negocio que use Telegram como canal de ventas

---

## ✨ Funcionalidades Principales

### 1. 🤖 Bot Conversacional Inteligente con GPT

**¿Qué es?** Un bot de Telegram que utiliza OpenAI GPT para entender conversaciones naturales y recomendar productos automáticamente.

**Características:**
- 🧠 **Comprensión de lenguaje natural**: Entiende lo que el usuario busca sin scripts rígidos
- 📊 **Categorización automática**: Clasifica leads como HOT/WARM/COLD según el interés
- 🛍️ **Recomendaciones personalizadas**: Sugiere productos basados en lo que el usuario busca
- 💬 **Conversación fluida**: El bot responde de manera natural y contextuada
- 📝 **Extracción de información**: Obtiene email y teléfono sin que se note
- 🔄 **Flujo adaptativo**: Cambia el flujo según el nivel de interés del usuario
- 💾 **Historial de conversación**: Guarda todo para análisis posterior

**¿Cómo se vería una conversación típica?**

```
Usuario: Hola, necesito un producto para mi tienda online
Bot: ¡Hola! 👋 Excelente, estoy aquí para ayudarte. ¿Qué tipo de productos necesitas exactamente?

Usuario: Necesito software de gestión de inventario
Bot: Perfecto, tenemos varias soluciones. ¿Qué características son más importantes para ti?
     - Reportes en tiempo real
     - Integración con otros sistemas
     - Fácil de usar
     - Automatización

Usuario: Reportes en tiempo real y automatización
Bot: Excelente, basado en eso te recomiendo nuestro "Premium Plan". 
     Tenemos 3 opciones:
     1. Básico - $99/mes
     2. Profesional - $199/mes (Recomendado para ti)
     3. Empresarial - $499/mes
     
Usuario: Me interesa el profesional
Bot: Perfecto, me encantaría contactarte. ¿Cuál es tu email?

Usuario: usuario@empresa.com
Bot: Gracias, ¿y tu teléfono para coordinar una demostración?

Usuario: +1234567890
Bot: ¡Excelente! Un asesor se pondrá en contacto contigo pronto para mostrar todas las características.
```

### 2. 📊 Sistema de Leads Inteligente

**¿Qué es?** Un sistema para capturar, organizar y hacer seguimiento a todos tus clientes potenciales.

**Características:**
- 🎯 **Captura automática**: Los leads se crean automáticamente cuando interactúan con el bot
- 🏷️ **Estados de seguimiento**: Nuevo → Contactado → Cerrado
- 📏 **Categorización**: HOT (venta probable), WARM (posible), COLD (largo plazo)
- 🔍 **Búsqueda y filtros**: Encuentra leads por email, teléfono, estado, bot, etc.
- 📱 **Información completa**: Captura email, teléfono, interés, fecha de captura
- 👥 **Permisos por rol**: Admins ven todos los leads, Managers ven solo los suyos
- 🔄 **Actualización rápida**: Cambia estados con un click
- 📞 **Links directos**: Llama o envía email directamente desde el dashboard
- 📈 **Estadísticas**: Ve cuántos leads tienes en cada estado

**Campos de un lead:**
```
- ID: Identificador único
- Bot: Cuál bot capturó el lead
- Interés: Qué producto/servicio busca
- Email: Contacto directo
- Teléfono: Para llamadas
- Categoría: HOT/WARM/COLD
- Estado: nuevo/contactado/cerrado
- Fecha de captura: Cuándo llegó
- Detalles: Información adicional del producto
- Notas: Observaciones del equipo de ventas
```

### 3. 🔔 Sistema de Notificaciones en Tiempo Real

**¿Qué es?** Alertas automáticas que te avisan de eventos importantes mientras estás usando el dashboard.

**Características:**
- 🔴 **Badge en tiempo real**: Ves cuántas notificaciones no leídas tienes
- 📬 **Tipos de notificaciones**:
  - 🎉 Nuevo lead capturado
  - 📝 Lead actualizado
  - 🤖 Bot creado/actualizado
  - ⚙️ Mensajes del sistema
- ⏰ **Polling automático**: Se actualiza cada 30 segundos sin refrescar
- 🎨 **Toast emergentes**: Notificaciones pop-up en la esquina
- ✅ **Marcar como leída**: Limpia el badge cuando lees
- 👥 **Permisos inteligentes**: Admins ven todas, Managers ven solo las relevantes

**Ejemplo de notificación:**
```
[🔴 1]  (badge en la campana)

┌─────────────────────────────┐
│ 🎉 Nuevo Lead              │
│ Lead interesado en          │
│ "Software de Gestión"       │
│ usuario@empresa.com         │
│ Hace 2 minutos              │
│ [Marcar como leída] [❌]    │
└─────────────────────────────┘

Toast en la esquina: "🎉 Nuevo lead capturado"
```

### 4. 🛍️ Gestión de Productos y Atributos

**¿Qué es?** Un catálogo donde almacenas tus productos con características personalizables.

**Características:**
- 📦 **CRUD completo**: Crear, leer, actualizar, eliminar productos
- 🏷️ **Atributos flexibles**: Cada producto puede tener atributos únicos
- 📝 **Tipos de atributos**:
  - **Texto**: Para descripciones (ej: "Material", "Color")
  - **Número**: Para valores numéricos (ej: "Peso", "Capacidad")
  - **Selección**: Para opciones (ej: Tamaños disponibles)
  - **Color**: Selector de color visual
- ✏️ **Edición rápida**: Interfaz intuitiva para gestionar todo
- 🔄 **Reordenar**: Drag-and-drop para cambiar orden
- 📊 **Contador**: Ve cuántos atributos tiene cada producto
- 🤖 **Usado por el bot**: El bot recomienda basándose en estos productos

**Ejemplo de producto:**
```
Nombre: MacBook Pro 14"
Precio: $1,999

Atributos:
├─ Procesador (Selección): M3 / M3 Pro / M3 Max
├─ RAM (Número): 8GB, 16GB, 24GB
├─ Almacenamiento (Selección): 256GB, 512GB, 1TB
├─ Color (Color): Plata, Gris espacial, Púrpura
└─ Garantía (Texto): Estándar 1 año / AppleCare+
```

### 5. 📊 Dashboard Administrativo

**¿Qué es?** Tu panel de control central donde ves todo lo que ocurre en tu negocio.

**Secciones principales:**

#### a) **Admin Dashboard**
- 📈 Estadísticas generales (bots, usuarios, leads)
- 📊 Gráficos y métricas
- 👥 Gestión de usuarios (crear, editar, asignar bots)
- 🔐 Control de accesos
- 🔧 Configuración global

#### b) **Página de Bots**
- 🤖 Lista de todos tus bots
- ✏️ Editar configuración del bot
- 🔑 Cambiar token de Telegram
- 🔐 Agregar API key de OpenAI
- ▶️ Activar/desactivar bots
- 📊 Ver logs de interacciones
- 👥 Asignar managers al bot

#### c) **Página de Leads**
- 📋 Lista completa de leads
- 🔍 Búsqueda por email/teléfono
- 📊 Filtros por estado (Nuevo/Contactado/Cerrado)
- 🏷️ Filtros por categoría (HOT/WARM/COLD)
- ✏️ Cambiar estado rápidamente
- 📞 Links para llamar o enviar email
- 📈 Estadísticas en tiempo real

#### d) **Página de Productos**
- 📦 Lista de productos
- ➕ Agregar nuevos productos
- ✏️ Editar información
- ❌ Eliminar productos
- 📥 Importar desde Excel/CSV/URL
- 🏷️ Gestionar atributos

#### e) **Página de Usuarios**
- 👥 Listar usuarios
- 👤 Crear nuevos usuarios
- ✏️ Editar permisos
- 🔗 Asignar bots a managers
- 🗑️ Eliminar usuarios

#### f) **Configuración de Bot**
- 🎯 Mensajes personalizados (bienvenida, despedida, etc.)
- 📏 Límites (máximo de productos a mostrar, etc.)
- 🎨 Personalización visual

---

## 🤖 Cómo Funciona el Bot - Guía Detallada

### Arquitectura General del Bot

```
┌─────────────────────────────────────────────────────────────┐
│                   TELEGRAM USER                              │
└────────────────────────────────────────────┬─────────────────┘
                                             │
                                      /start MARCA_ID
                                             │
                                             ▼
┌─────────────────────────────────────────────────────────────┐
│                TELEGRAM BOT (Python)                         │
│  ├─ Procesa mensajes del usuario                            │
│  ├─ Usa GPT para entender intenciones                       │
│  ├─ Gestiona conversación con estado                        │
│  └─ Guarda datos en BD                                      │
└────────────┬──────────────────────────┬─────────────────────┘
             │                          │
             ▼                          ▼
      ┌─────────────┐         ┌──────────────────┐
      │  OpenAI GPT │         │  SQLite Database │
      │  análisis   │         │  mensajes, leads │
      └─────────────┘         └──────────────────┘
                                       │
                                       ▼
                           ┌──────────────────────┐
                           │ Dashboard Web        │
                           │ (Next.js + React)    │
                           │ Ver y gestionar leads│
                           └──────────────────────┘
```

### Flujo Paso a Paso

#### **Paso 1: El Usuario Inicia el Bot**

```
Usuario escribe:
/start 1

Donde: 1 = marca_id (el ID de tu negocio)
```

El bot recibe el comando `/start` con el marca_id.

#### **Paso 2: Bot Obtiene Configuración**

El bot consulta la base de datos:

```
SELECT * FROM bots WHERE id = 1
SELECT * FROM bot_flow_config WHERE bot_id = 1
SELECT * FROM productos WHERE marca_id = 1
```

Obtiene:
- ✅ Información del bot
- ✅ Mensaje de bienvenida personalizado
- ✅ Catálogo de productos disponibles
- ✅ Atributos de cada producto

#### **Paso 3: Envía Mensaje de Bienvenida**

```
Mensaje almacenado en BD:
"¡Hola! 👋 Bienvenido a nuestra tienda digital.
Soy un asistente de IA y estoy aquí para ayudarte a encontrar exactamente lo que necesitas.

¿Qué tipo de productos buscas hoy?"

Oferece opciones:
[Ver catálogo] [Buscar ayuda] [Hablar con agente]
```

#### **Paso 4: Usuario Responde - Análisis con GPT**

El usuario escribe algo como:
```
"Necesito un software para gestionar mi inventario, algo que sea fácil de usar"
```

**El bot hace esto:**

1. **Envía a GPT para análisis:**
   ```
   Analiza este mensaje en el contexto de nuestros productos:
   Productos disponibles:
   - Software de Gestión (atributos: precio, características, integraciones)
   - Servicios de Consultoría
   - Capacitación
   
   Mensaje del usuario: "Necesito un software para gestionar mi inventario,
   algo que sea fácil de usar"
   
   ¿Cuál es la intención? ¿Qué productos podrían interesar?
   ¿Cuál es el nivel de interés? (HOT/WARM/COLD)
   ```

2. **GPT responde algo como:**
   ```json
   {
     "intención": "Busca solución de gestión de inventario",
     "productos_recomendados": [1, 3],
     "características_importantes": ["fácil de usar", "gestión de inventario"],
     "nivel_interés": "HOT",
     "confianza": 0.95,
     "respuesta": "Perfecto, entiendo que buscas una solución de inventario
                   fácil de usar. Tengo exactamente lo que necesitas..."
   }
   ```

3. **Bot muestra productos recomendados:**
   ```
   Basándome en lo que describes, te muestro estas opciones:
   
   1️⃣ Software PRO - $199/mes
      ✅ Gestión completa de inventario
      ✅ Reportes en tiempo real
      ✅ Súper fácil de usar
   
   2️⃣ Software PREMIUM - $399/mes
      ✅ Todo lo anterior más...
      ✅ Integraciones avanzadas
      ✅ Soporte 24/7
   
   ¿Cuál te interesa más?
   ```

#### **Paso 5: Usuario Selecciona un Producto**

```
Usuario hace click: [Software PRO - $199/mes]
```

El bot:
1. Guarda en memoria: `user_data[user_id]['producto_seleccionado'] = "Software PRO"`
2. Pregunta sobre atributos/características adicionales
3. Actualiza la categoría del lead a "HOT" o "WARM"

#### **Paso 6: Recolección de Información de Contacto**

El bot pregunta de manera natural:

```
Bot: "Perfecto, el Software PRO es ideal para ti.
     
Antes de continuar, me gustaría tener tus datos 
para que un especialista te contacte con una 
demostración personalizada.

¿Cuál es tu email de contacto?"

Usuario responde: usuario@empresa.com
```

Bot guarda y pregunta por teléfono:

```
Bot: "Gracias. ¿Y tu teléfono para coordinar 
     una llamada con uno de nuestros expertos?"

Usuario responde: +1234567890
```

#### **Paso 7: Guardar Lead en Base de Datos**

```sql
INSERT INTO leads (
  bot_id,
  bot_nombre,
  interes,
  email,
  telefono,
  telegram_user_id,
  categoria,
  estado,
  detalles_compra,
  created_at
) VALUES (
  1,
  "Mi Bot",
  "Software PRO - $199/mes",
  "usuario@empresa.com",
  "+1234567890",
  987654321,
  "HOT",
  "nuevo",
  "Necesita gestión de inventario, fácil de usar",
  NOW()
)
```

#### **Paso 8: Crear Notificaciones**

El sistema automáticamente crea notificaciones:

```
- Para super_admin 1: "🎉 Nuevo Lead - usuario@empresa.com"
- Para managers asignados al bot: "🎉 Nuevo Lead - usuario@empresa.com"
```

Los administradores ven:
- 🔴 Badge "1" en la campana
- 🎨 Toast emergente
- 📋 Nuevo lead en la lista

#### **Paso 9: Mensaje de Confirmación**

```
Bot: "¡Excelente! Un especialista se pondrá 
     en contacto contigo en las próximas 2 horas.
     
     Si tienes preguntas mientras tanto, estoy aquí
     para ayudarte. 😊
     
     [Ver más productos] [Hablar con agente]"
```

### Estados del Flujo Conversacional

El bot gestiona diferentes "estados" durante la conversación:

```
START
  │
  ├─→ INITIAL_INTEREST (¿Qué te interesa?)
  │     │
  │     ├─→ SHOW_PRODUCTS (Mostramos catálogo)
  │     │     │
  │     │     ├─→ SELECT_PRODUCT (Usuario selecciona)
  │     │     │     │
  │     │     │     └─→ COLLECT_ATTRIBUTES (Preguntamos detalles)
  │     │     │           │
  │     │     │           ├─→ CONFIRM_PURCHASE (¿Confirmamos?)
  │     │     │           │     │
  │     │     │           │     ├─→ GET_EMAIL
  │     │     │           │     │     │
  │     │     │           │     │     └─→ GET_PHONE
  │     │     │           │     │           │
  │     │     │           │     │           └─→ [LEAD GUARDADO] 💾
  │     │     │           │     │
  │     │     │           │     └─→ [CANCELADO]
  │     │     │
  │     │     └─→ [SIN INTERÉS]
  │     │
  │     └─→ [SIN INTERÉS]
  │
  └─→ FREE_CONVERSATION (El usuario pregunta algo libre)
```

### Variables Guardadas por Usuario

El bot mantiene para cada usuario:

```javascript
user_state[user_id] = "GET_PHONE"  // Estado actual

user_data[user_id] = {
  interes_inicial: "Software de gestión",
  productos_sugeridos: [1, 3, 5],
  producto_seleccionado: "Software PRO",
  atributos_seleccionados: {
    precio: "$199/mes",
    integraciones: ["Shopify", "WooCommerce"]
  },
  email: "usuario@empresa.com",
  telefono: "+1234567890",
  nivel_interes: "HOT",
  conversacion_resumen: "Usuario buscaba software de gestión..."
}

conversation_history[user_id] = [
  {"role": "user", "content": "Hola, necesito..."},
  {"role": "assistant", "content": "Entiendo que busca..."},
  {"role": "user", "content": "Sí, exacto"},
  ...
]
```

### Cómo GPT Categoriza los Leads

El bot utiliza GPT para analizar:

**HOT** 🔴 (Probabilidad alta de venta)
- Usuario mostró interés claro en producto específico
- Pidió precio/características detalladas
- Compartió email y teléfono voluntariamente
- Mencionó necesidad urgente
- Preguntó "¿Cuándo puedo empezar?"

**WARM** 🟡 (Posible cliente)
- Usuario mostró interés moderado
- Preguntó sobre características
- Comparó con competidores
- Pidió tiempo para pensarlo
- Dijo "me interesa, pero..."

**COLD** 🔵 (Seguimiento a largo plazo)
- Usuario curiosidad pero sin urgencia
- "Quizás en el futuro"
- Preguntó muchas cosas pero no decidió
- Pidió contacto después de ciertos meses
- Dijo "estoy evaluando opciones"

**Ejemplo de análisis GPT:**

```
Usuario dijo: "Me interesa, pero debo consultarlo 
              con mi gerente. Podemos hablar 
              en 2 semanas?"

GPT responde: {
  "categoría": "WARM",
  "razón": "Interés claro pero proceso de decisión 
            lento. Probablemente necesite aprobación.",
  "siguiente_paso": "Follow-up en 2 semanas",
  "score_venta": 0.65
}
```

### Llamadas a Funciones Extra

El bot también puede hacer:

```python
# Enviar email automático
send_email(email, asunto, cuerpo)

# Guardar conversación en archivo
save_conversation_to_file(user_id, conversation)

# Obtener recomendaciones de productos
get_product_recommendations(user_interests, max=5)

# Extraer información estructurada
extract_info(message, schema)  # Retorna JSON con datos extraídos

# Marcar como HOT si cumple criterios
mark_as_hot_if_qualified(user_id)
```

### Flujo Completo en Tiempo Real

```
⏱️ 14:30 - Usuario escribe /start 1
⏱️ 14:30 - Bot obtiene config y dice "Bienvenido"
⏱️ 14:32 - Usuario: "Necesito software de gestión"
⏱️ 14:33 - Bot envía a GPT para análisis
⏱️ 14:33 - GPT responde: "Recomendamos Software PRO y PREMIUM"
⏱️ 14:33 - Bot muestra 2 options(Buttons)
⏱️ 14:34 - Usuario hace click en "Software PRO"
⏱️ 14:35 - Bot pregunta email
⏱️ 14:35 - Usuario responde: usuario@empresa.com
⏱️ 14:36 - Bot pregunta teléfono
⏱️ 14:36 - Usuario responde: +1234567890
⏱️ 14:36 - Bot crea LEAD en BD
⏱️ 14:36 - Sistema crea NOTIFICACIONES
⏱️ 14:36 - Admin ve badge 🔴 1 en campana
⏱️ 14:36 - Toast: "🎉 Nuevo lead capturado"
⏱️ 14:37 - Bot: "¡Gracias! Te contactaremos pronto"
⏱️ 14:37 - Conversación guardada en base de datos
```

---

## 📊 Sistema de Leads - Detalles

### Campos de un Lead

| Campo | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| `id` | Integer | Identificador único | 1, 2, 3... |
| `bot_id` | Integer | Cuál bot capturó | 1 |
| `bot_nombre` | String | Nombre del bot | "Mi Bot" |
| `interes` | String | Qué buscaba | "Software PRO" |
| `email` | String | Email de contacto | "usuario@empresa.com" |
| `telefono` | String | Teléfono | "+1234567890" |
| `telegram_user_id` | Integer | ID de Telegram | 987654321 |
| `categoria` | String | HOT/WARM/COLD | "HOT" |
| `estado` | String | nuevo/contactado/cerrado | "nuevo" |
| `producto_id` | Integer | Producto que buscaba | 5 |
| `detalles_compra` | String | Info adicional | "Necesita fácil de usar" |
| `notas` | String | Observaciones del equipo | "Cliente realmente interesado" |
| `created_at` | DateTime | Cuándo fue capturado | "2026-03-04 14:36:00" |

### Ciclo de Vida de un Lead

```
NUEVO
  │ (El lead llega, aún no contactado)
  │
  ├─ El manager ve notificación
  │
  ├─ El manager revisa en dashboard
  │
  ├─ El manager envía email / llama
  │
  ▼
CONTACTADO
  │ (Ya nos comunicamos)
  │
  ├─ Si está interesado: Negociación
  │
  ├─ Si no está interesado: Guardar para después
  │
  ├─ Si necesita más info: Mandarle material
  │
  ▼
CERRADO
  (Cliente compró, o decidió no comprar)
```

### Estadísticas de Leads

En el dashboard ves:

```
Total de Leads: 156
├─ Nuevos: 23 🟢 (No contactados)
├─ Contactados: 98 🟠 (En negociación)
└─ Cerrados: 35 🔵 (Comprados o rechazados)

Por Categoría:
├─ HOT: 12 (Alta probabilidad)
├─ WARM: 45 (Media probabilidad)
└─ COLD: 99 (Baja probabilidad)
```

---

## 🔔 Sistema de Notificaciones - Detalles

### Cómo Funciona el Polling

El sistema **no usa WebSockets** (para mantenerlo simple), sino **polling cada 30 segundos**:

```javascript
// En el navegador cada 30 segundos:
fetch('/api/notificaciones?action=unread')
  .then(res => res.json())
  .then(notificaciones => {
    // Si hay nuevas:
    mostrarToast("🎉 Nuevo Lead - usuario@empresa.com")
    actualizarBadge(notificaciones.length)
  })
```

### Tipos de Notificaciones

```javascript
1. NUEVO_LEAD
   - Trigger: Se crea un lead desde bot o API
   - Para quién: Super Admins y Managers del bot
   - Mensaje: "🎉 Nuevo Lead - usuario@empresa.com interesado en 'Producto X'"
   - Acción: Click → /dashboard/leads

2. LEAD_ACTUALIZADO
   - Trigger: Se cambia estado de lead (nuevo → contactado)
   - Para quién: Super Admin y Manager que la contactó
   - Mensaje: "📝 Lead actualizado - marcado como 'Contactado'"
   - Acción: Click → /dashboard/leads

3. NUEVO_BOT
   - Trigger: Se crea un bot nuevo
   - Para quién: Super Admins
   - Mensaje: "🤖 Nuevo Bot creado - 'Mi Bot Nuevo'"
   - Acción: Notificación informativa

4. SISTEMA
   - Trigger: Mensajes importantes del sistema
   - Para quién: Todos (o específicos)
   - Mensaje: "⚙️ Mantenimiento sin conexión programado para hoy 22:00"
   - Acción: Solo lectura
```

### Permisos de Notificaciones

```
SUPER_ADMIN:
  ✅ Ve TODAS las notificaciones de TODOS los bots
  ✅ Puede marcar como leída
  ✅ Ve notificaciones de sistema

MANAGER:
  ✅ Ve notificaciones de sus bots asignados
  ✅ NO ve notificaciones de otros bots
  ✅ Puede marcar como leída
  ✅ Ve notificaciones de sistema que le aplican
```

---

## 🛍️ Gestión de Productos y Atributos

### Flujo de Creación de Producto

**Paso 1: Crear el Producto Base**

En `/dashboard/productos`:

```
Nombre: MacBook Pro 14"
Precio: 1999.00
Descripción: (opcional) La laptop más poderosa...
```

Click en **[Agregar producto]**

**Paso 2: Agregar Atributos**

En `/dashboard/productos/atributos`:

1. Haz click en la tarjeta del producto
2. Se abre modal "Gestionar atributos"
3. Llenar el formulario:

```
Nuevo Atributo:
├─ Nombre: "Procesador"
├─ Tipo: Selección
├─ Opciones: "M3, M3 Pro, M3 Max"
├─ Requerido: ✓ Sí
└─ [Agregar atributo]
```

Se repite para cada atributo:

```
Atributos existentes:
├─ [Procesador] (Selección)
│  Opciones: M3, M3 Pro, M3 Max
│  Requerido: Sí
│
├─ [RAM] (Número)
│  Requerido: Sí
│
└─ [Color] (Color)
   Requerido: Sí
```

**Paso 3: El Bot los Utiliza**

Cuando el usuario selecciona un producto:

```
Bot: "Seleccionaste MacBook Pro 14"
     
     Ahora, ¿qué especificaciones te interesan?
     
     1️⃣ Procesador: [M3] [M3 Pro] [M3 Max]
     2️⃣ RAM: ¿Cuántos GB? [8GB] [16GB] [24GB]
     3️⃣ Color: [◼️ Plata] [◼️ Gris espacial]"
```

El bot pregunta por cada atributo marcado como "Requerido".

### Tipos de Atributos

#### 1. **Texto**
```
Nombre del atributo: "Material"
Usuario ve: Input text libre
Valor guardado: string cualquiera

Usuario puede escribir: "Madera maciza", "Plástico resistente", etc.
```

#### 2. **Número**
```
Nombre del atributo: "Capacidad (GB)"
Usuario ve: Input numérico
Valor guardado: number

Usuario ingresa: 128, 256, 512, etc.
```

#### 3. **Selección**
```
Nombre: "Tamaño"
Opciones: "Small, Medium, Large, XL"
Usuario ve: Botones [Small] [Medium] [Large] [XL]
Valor guardado: La opción seleccionada

El bot pregunta: "¿Qué tamaño prefieres?"
```

#### 4. **Color**
```
Nombre: "Color"
Usuario ve: Selector visual de colores
Valor guardado: Código hex #FF0000, #00FF00, etc.

El bot muestra: "◼️ Rojo ◼️ Verde ◼️ Azul"
```

### Importar Productos

En `/dashboard/productos` puedes importar de 3 formas:

#### 1. **Excel/CSV**
```
Archivo: productos.xlsx
Contenido:
nombre,precio,descripcion
"MacBook Pro 14",1999,"Laptop potente"
"MacBook Pro 16",2499,"Laptop ultra potente"
```

Click en **[Importar desde Excel]** → Selecciona archivo

### 2. **PDF**
Puedes subir un PDF con un listado de productos; el sistema extraerá automáticamente nombre, precio, descripción y cualquier característica incluida dentro del texto. Sólo asegúrate de que cada producto esté separado por una línea en blanco o bien contenga campos ``Nombre:``, ``Precio:``, ``Descripción:`` en el documento. El bot intentará interpretar los bloques y llenar el campo "descripción" con el resto del contenido.

### 3. **Texto Libre**
```
#### 2. **Texto Libre**
```
Pega texto así:
MacBook Pro 14" - 1999
MacBook Pro 16" - 2499
iPhone 15 - 999

El sistema lo parsea automáticamente
```

#### 3. **URL**
```
Ingresa URL: https://tu-tienda.com/api/productos

El sistema hace request a esa URL y importa los productos
(debe retornar JSON con estructura correcta)
```

---

## 📊 Dashboard Administrativo

### Acceso y Roles

```
URL: http://localhost:3000/dashboard

Roles:
├─ SUPER_ADMIN: Acceso a TODO
│  ├─ Admin panel (usuarios, accesos, etc.)
│  ├─ Todos los bots
│  ├─ Todos los leads
│  ├─ Todos los productos
│  └─ Configuración global
│
└─ MANAGER: Acceso limitado a sus bots
   ├─ Leads de sus bots asignados
   ├─ Productos de sus bots
   └─ Sus propios datos
```

### Secciones del Dashboard

#### **1. Admin (Super Admin only)**

**Ubicación:** `/dashboard/admin`

**Estadísticas:**
```
┌─────────────────────────────────────────┐
│  ESTADÍSTICAS GENERALES                 │
├─────────────────────────────────────────┤
│  📊 Total de Bots: 5                    │
│  👥 Total de Usuarios: 12               │
│  🎯 Total de Leads: 156                 │
│  📈 Leads este mes: 43                  │
└─────────────────────────────────────────┘
```

**Gestión de Usuarios:**
- Listar todos los usuarios
- Crear nuevo usuario (email, contraseña, rol)
- Editar información del usuario
- Cambiar rol (Super Admin / Manager)
- Asignar/desasignar bots
- Eliminar usuario

**Gestión de Accesos:**
- Qué usuario tiene acceso a qué bot
- Tabla: Usuario | Rol | Bots asignados | Última actividad

#### **2. Bots**

**Ubicación:** `/dashboard/admin/bots`

**Listar bots:**
```
┌────┬──────────────────┬────────┬──────────────┐
│ ID │ Nombre           │ Estado │ Acciones     │
├────┼──────────────────┼────────┼──────────────┤
│ 1  │ Mi Bot Principal │ Activo │ Edit │ Delete│
│ 2  │ Bot Secundario   │Inactiv │ Edit │ Delete│
└────┴──────────────────┴────────┴──────────────┘
```

**Editar bot:**
```
Nombre: Mi Bot Principal
Slug: mi-bot-principal
Token Telegram: 123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZabc...
OpenAI API Key: sk-proj-...
Estado: Activo ✓
Descripción: Mi bot de ventas

Configuración Flujo:
├─ Mensaje Bienvenida: "¡Hola! Bienvenido"
├─ Mensaje Sin Interés: "Hasta pronto"
├─ Mostrar Productos: ✓ Sí
└─ Máx Productos: 5

[Guardar] [Cancelar]
```

#### **3. Leads**

**Ubicación:** `/dashboard/leads`

**Vista Grid:**
```
╔════════════════════════════════════════════════════════╗
║ ESTADÍSTICAS                                           ║
╠════════════════════════════════════════════════════════╣
║ Total: 156  │  Nuevos: 23 🟢  │  Contactados: 98 🟠   ║
║ Cerrados: 35 🔵                                        ║
╠════════════════════════════════════════════════════════╣
║ FILTROS                                                ║
├─ Búsqueda: [usuario@email.com________]                ║
├─ Estado: [Todos ▼]                                    ║
├─ Categoría: [Todos ▼]                                 ║
├─ Bot: [Todos ▼]                                       ║
╠════════════════════════════════════════════════════════╣
║ LEADS                                                  ║
├─ [Email]  [Teléfono] [Interés] [Estado] [Bot] [Ops]  ║
├─ usuario@email.com │ +1234567890 │ Software PRO │ Nuevo...║
├─ otro@email.com    │ +0987654321 │ ...│...   │...     ║
╚════════════════════════════════════════════════════════╝
```

**Cambiar estado:**
```
Click en dropdown "Estado":
┌──────────────┐
│ Nuevo        │
│ Contactado   │ ← Selecciona
│ Cerrado      │
└──────────────┘
(Se actualiza inmediatamente)
```

**Email y teléfono:**
```
Haz click en email → Abre cliente de email predeterminado
Haz click en teléfono → Abre cliente de tel predeterminado (si está disponible)
```

#### **4. Productos**

**Ubicación:** `/dashboard/productos`

**Listar productos:**
```
╔════════════════════════════════════════════════════════╗
║ PRODUCTOS                                              ║
├─ [Nombre] [Precio] [Aciones]                          ║
├─ MacBook Pro 14"  │ $1,999.00 │ Editar │ Eliminar     ║
├─ MacBook Pro 16"  │ $2,499.00 │ Editar │ Eliminar     ║
├─ iPhone 15        │ $999.00   │ Editar │ Eliminar     ║
╚════════════════════════════════════════════════════════╝
```

**Crear producto:**
```
Nombre: [Samsung Galaxy S25]
Precio: [999.00]
Descripción: [Teléfono inteligente...]

[Agregar producto]
```

**Gestionar atributos:**
```
En /dashboard/productos/atributos

┌───────────────────────────────────────┐
│ Samsung Galaxy S25                    │
│ $999.00                               │
│                                       │
│ Atributos: 3                          │
│ ✓ Configurado                         │
│                                       │
│ [Gestionar atributos]                 │
└───────────────────────────────────────┘
```

Click en botón → Modal para manejar atributos

#### **5. Usuarios**

**Ubicación:** `/dashboard/users` (si implementado)

Gestión completa de usuarios con permisos

---

## 🏗️ Arquitectura y Stack Técnico

### Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                        USUARIO FINAL                         │
│                    (Telegram / Web)                          │
└────────────────┬───────────────────────────┬─────────────────┘
                 │                           │
            ╭────▼────╮                 ╭────▼────╮
            │TELEGRAM │                 │ BROWSER │
            │   BOT   │                 │ (Web)   │
            ╰────┬────╯                 ╰────┬────╯
                 │ (API calls)              │ (HTTP)
                 │                         │
┌───────────────────────────────────────────────────────────────┐
│              BACKEND API (Next.js API Routes)                 │
├───────────────────────────────────────────────────────────────┤
│ /api/leads          - CRUD de leads                           │
│ /api/notificaciones - Notificaciones en tiempo real          │
│ /api/productos      - CRUD de productos                      │
│ /api/productos/atributos - Atributos de productos           │
│ /api/bots           - Gestión de bots                        │
│ /api/usuarios       - Gestión de usuarios                    │
│ /api/login          - Autenticación                          │
└───────────────────────────────────────────────────────────────┘
                            │
                ╭───────────┴──────────╮
                │                      │
            ╭───▼────╮            ╭────▼────╮
            │ SQLite │            │ OpenAI  │
            │   BD   │            │  (GPT)  │
            ╰────────╯            ╰─────────╯
                │
        15+ tablas (bots,
         users, leads, etc.)
```

### Stack Tecnológico

#### **Frontend (Web)**
- **Next.js 16** - Framework React moderno con App Router
- **React 19** - Librería UI
- **TypeScript** - Tipado estático
- **Tailwind CSS** - Estilos utility-first
- **shadcn/ui** - Componentes reutilizables sin dependencias
- **Lucide React** - Iconos SVG
- **Radix UI** - Componentes accesibles de bajo nivel

#### **Backend (API)**
- **Next.js API Routes** - Endpoints HTTP sin necesidad de servidor separado
- **next/auth** (opcional) - Para autenticación avanzada
- **Custom Auth** - Sistema de tokens simples

#### **Base de Datos**
- **SQLite** - Base de datos embebida, sin servidor
- **better-sqlite3** - Driver rápido para SQLite en Node.js
- **Schemas**: 15+ tablas con relaciones

#### **Bot (Python)**
- **Python 3.12** - Lenguaje principal
- **python-telegram-bot** - Librería para bots de Telegram
- **OpenAI** - Integración con GPT
- **sqlite3** - Acceso a BD desde el bot
- **python-dotenv** - Manejo de variables de entorno

#### **DevOps**
- **Docker** - Containerización
- **Docker Compose** - Orquestación de contenedores
- **pnpm** - Package manager rápido
- **Git** - Control de versiones

### Estructura de Base de Datos

```sql
-- Usuarios y Roles
CREATE TABLE usuarios (
  id INTEGER PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  contraseña TEXT NOT NULL,
  rol TEXT, -- super_admin, manager
  created_at DATETIME
);

-- Bots de Telegram
CREATE TABLE bots (
  id INTEGER PRIMARY KEY,
  nombre TEXT,
  slug TEXT UNIQUE,
  marca_id INTEGER, -- Owner
  telegram_token TEXT,
  openai_key TEXT,
  estado INTEGER, -- 1: activo, 0: inactivo
  created_at DATETIME
);

-- Leads capturados
CREATE TABLE leads (
  id INTEGER PRIMARY KEY,
  bot_id INTEGER,
  bot_nombre TEXT,
  interes TEXT,
  email TEXT,
  telefono TEXT,
  telegram_user_id INTEGER,
  categoria TEXT, -- HOT, WARM, COLD
  estado TEXT, -- nuevo, contactado, cerrado
  detalles_compra TEXT,
  notas TEXT,
  created_at DATETIME
);

-- Productos
CREATE TABLE productos (
  id INTEGER PRIMARY KEY,
  marca_id INTEGER,
  nombre TEXT,
  precio DECIMAL,
  descripcion TEXT,
  created_at DATETIME
);

-- Atributos de productos
CREATE TABLE producto_atributos (
  id INTEGER PRIMARY KEY,
  producto_id INTEGER,
  nombre TEXT,
  tipo TEXT, -- text, number, select, color
  opciones TEXT, -- JSON para select
  requerido INTEGER,
  orden INTEGER,
  created_at DATETIME
);

-- Notificaciones
CREATE TABLE notificaciones (
  id INTEGER PRIMARY KEY,
  usuario_id INTEGER,
  tipo TEXT, -- nuevo_lead, lead_actualizado, etc.
  titulo TEXT,
  mensaje TEXT,
  lead_id INTEGER,
  bot_id INTEGER,
  leida INTEGER,
  created_at DATETIME
);

-- Configuración de flujo del bot
CREATE TABLE bot_flow_config (
  id INTEGER PRIMARY KEY,
  bot_id INTEGER UNIQUE,
  mensaje_bienvenida TEXT,
  mensaje_sin_interes TEXT,
  mostrar_productos_inicio INTEGER,
  max_productos_mostrar INTEGER,
  created_at DATETIME
);

-- Interacciones del bot (para analytics)
CREATE TABLE bot_interacciones (
  id INTEGER PRIMARY KEY,
  bot_id INTEGER,
  telegram_user_id INTEGER,
  mensaje_usuario TEXT,
  respuesta_bot TEXT,
  tipo_interaccion TEXT, -- inicio, producto, contacto, etc.
  created_at DATETIME
);

-- Asignación usuario-bot
CREATE TABLE usuario_bots (
  usuario_id INTEGER,
  bot_id INTEGER,
  asignado_en DATETIME,
  PRIMARY KEY (usuario_id, bot_id)
);
```

---

## 🚀 Cómo Usar el Sistema

### Para Administrador Super Admin

#### 1. **Crear Bot**
1. Ir a `/dashboard/admin/bots`
2. Click en **[Crear Bot Nuevo]**
3. Llenar:
   - Nombre: "Tienda Online"
   - Slug: "tienda-online"
   - Token Telegram: (Obtener de @BotFather en Telegram)
   - OpenAI Key: (Obtener de OpenAI)
   - Descripción (opcional)
4. Click **[Guardar]**

#### 2. **Agregar Productos**
1. Ir a `/dashboard/productos`
2. Agregar producto:
   - Nombre: "Laptop Pro"
   - Precio: 1999.00
3. Click **[Agregar producto]**
4. Ir a `/dashboard/productos/atributos`
5. Hacer click en el producto
6. Agregar atributos como se describe arriba

#### 3. **Crear Manager**
1. Ir a `/dashboard/admin/usuarios`
2. Click **[Crear Usuario]**
3. Llenar:
   - Email: manager@empresa.com
   - Contraseña: segura_password
   - Rol: Manager
   - Bots asignados: Seleccionar 1 o más
4. Click **[Créar]**

#### 4. **Monitorear Leads**
1. Ir a `/dashboard/leads`
2. Ver estadísticas (nuevos, contactados, cerrados)
3. Filtrar por estado/categoría/bot
4. Click en lead para ver detalles
5. Cambiar estado cuando lo contactes

#### 5. **Ver Notificaciones**
1. Campana en header: 🔔 [5]
2. Click para abrir dropdown
3. Ver cada notificación
4. Click en ella → Ir a `/dashboard/leads`
5. Click "Marcar como leída"

#### 6. **Campañas Automatizadas**
1. Ir a `/dashboard/campaigns` desde el menú lateral.
2. En el formulario superior, ingrese un nombre descriptivo y el mensaje que desea enviar.
3. Opcionalmente filtre por categoría (`hot`, `warm`, `cold`) o seleccione un bot específico.
4. Programe una fecha/hora si quiere que se envíe más tarde.
5. Presione **Crear**; la nueva campaña aparecerá en la tabla inferior.
6. Las campañas se almacenan en la base de datos (`tabla campañas`) y pueden ser ejecutadas por un job o script externo más adelante.

   El backend expone `/api/campaigns` que admite:
   - **GET**: devuelve el listado (filtrado según el rol y parámetro `botId`).
   - **POST**: crea una nueva campaña (campos `nombre`, `mensaje`, `categoria_filter`, `bot_id`, `programada_para`).
   - **PATCH**: (solo super_admin) ejecuta campañas pendientes y las marca como `ejecutada`.

### Para Manager

#### 1. **Ver sus Leads**
1. Ir a `/dashboard/leads`
2. Solo ve leads de sus bots asignados
3. Los otro bots no aparecen (filtrados automáticamente)

#### 2. **Contactar Lead**
1. Haz click en email → Abre Gmail/Outlook
2. Haz click en teléfono → Abre WhatsApp/Llamada
3. Cambia estado a "Contactado"

#### 3. **Agregar Notas**
1. (Si implementado) Click en lead → Modal de detalles
2. Agregar notas para otros managers

---

## 🖥️ Desarrollo y Deployment

### Levantar Localmente

```bash
# 1. Clonar proyecto
git clone <repo>
cd LAIDA

# 2. Instalar dependencies
pnpm install

# 3. Configurar .env
cp .env.example .env
# Editar:
# - TELEGRAM_TOKEN=123456789:ABCxyz...
# - OPENAI_API_KEY=sk-proj-...
# - DATABASE_URL=./bd/laida.db

# 4. Inicializar BD
pnpm run db:init

# 5. Levantar servidor Next.js
pnpm dev

# 6. En otra terminal, levantar bot Python
python3 bot/bot_launcher.py 1

# 7. Acceder
# Web: http://localhost:3000
# Login: admin@laida.com / admin123
```

### Usando Docker

```bash
# Build y levanta todo
docker-compose up --build

# Acceso:
# http://localhost:3000 (Web)
# El bot se levanta automáticamente
```

### Estructura de Carpetas

```
LAIDA/
├── app/                    # Next.js App
│   ├── api/               # API Routes
│   │   ├── leads/
│   │   ├── notificaciones/
│   │   ├── productos/
│   │   ├── bots/
│   │   ├── usuarios/
│   │   └── login/
│   ├── dashboard/         # Dashboard pages
│   │   ├── leads/
│   │   ├── productos/
│   │   ├── admin/
│   │   ├── config-bot/
│   │   └── ...
│   ├── login/
│   ├── registro/
│   └── layout.tsx
│
├── components/            # Componentes React
│   ├── dashboard/
│   │   ├── product-attributes-modal.tsx
│   │   ├── notificaciones-bell.tsx
│   │   └── ...
│   └── ui/               # shadcn/ui components
│
├── bot/                   # Bot Python
│   ├── laidaBot_gpt.py   # Bot con GPT
│   ├── bot_launcher.py   # Launcher multi-tenant
│   └── requirements.txt
│
├── db/                    # Database
│   ├── init.ts           # Inicialización
│   └── utils.ts          # Funciones helper
│
├── lib/                   # Librerías
│   ├── auth.ts           # Autenticación
│   └── utils.ts
│
├── public/               # Archivos estáticos
├── styles/               # Estilos globales
│
├── .env                  # Variables de entorno
├── docker-compose.yml
├── Dockerfile
├── package.json
├── pnpm-lock.yaml
└── tsconfig.json
```

---

## ❓ Preguntas Frecuentes

### **P: ¿Por qué SQLite y no PostgreSQL?**
**R:** SQLite es perfecto para startups porque:
- No requiere servidor separado
- Funciona en 1 archivo
- Fácil de backupear
- Suficiente para 10,000+ leads
- Se puede migrar a PostgreSQL después

### **P: ¿Cómo obtengo el Token de Telegram?**
**R:**
1. Abre Telegram
2. Busca @BotFather
3. Escribe `/newbot`
4. Sigue los pasos
5. Copias el token que te da
6. Lo pegas en el dashboard

### **P: ¿Cómo obtengo la API Key de OpenAI?**
**R:**
1. Ve a https://platform.openai.com
2. Login con tu cuenta
3. Ir a API Keys
4. Click "Create new secret key"
5. Copias el token
6. Lo pegas en el dashboard

### **P: ¿Cuántos usuarios puedo tener?**
**R:** Ilimitados. Cada usuario es un registro en BD.

### **P: ¿Puedo tener múltiples managers?**
**R:** Sí, tantos como quieras. Cada uno ve solo sus bots.

### **P: ¿Qué pasa si el bot se cae?**
**R:** 
- Los leads no se pierden (están en BD)
- Los usuarios pueden escribir pero no reciben respuesta
- Reinicia el bot con: `python3 bot/bot_launcher.py 1`

### **P: ¿Puedo cambiar el mensaje de bienvenida del bot?**
**R:** Sí, en `/dashboard/admin/bots` editando el bot.

### **P: ¿Los leads se borran automáticamente?**
**R:** No, se guardan para siempre (a menos que los elimines manualmente).

### **P: ¿Puedo exportar leads a Excel?**
**R:** Actualmente no, pero se puede agregar fácilmente. [PENDIENTE]

### **P: ¿Funciona sin internet?**
**R:** El dashboard local sí (localhost), pero el bot necesita conexión a Telegram y OpenAI.

### **P: ¿Qué tan rápido responde el bot?**
**R:** 
- Sin GPT: <0.5s
- Con GPT: 1-3s (depende de OpenAI)

### **P: ¿Se pueden guardar conversaciones?**
**R:** Sí, automáticamente en la BD en tabla `bot_interacciones`.

---

## 📞 Soporte

Para reportar bugs o sugerir features:
1. Abre un Issue en GitHub
2. Describe el problema con pasos para reproducir
3. Incluye logs si es posible

---

## 📝 Licencia

Proyecto privado. Todos los derechos reservados.

---

**¡Gracias por usar LAIDA! 🚀**
