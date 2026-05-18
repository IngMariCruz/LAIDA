# 📊 Sistema de Leads - LAIDA

## Resumen

La funcionalidad de leads permite capturar, gestionar y hacer seguimiento a los clientes potenciales que interactúan con tus bots de Telegram. Los leads se guardan en la base de datos y pueden ser visualizados y actualizados a través del dashboard.

---

## 🏗️ Arquitectura

### Base de Datos
Los leads se almacenan en la tabla `leads`:
```sql
CREATE TABLE leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT,                       -- Nombre del lead (puede ser NULL)
  bot_id INTEGER,                    -- Referencia al bot que capturó el lead
  bot_slug TEXT,                     -- Slug del bot
  bot_nombre TEXT,                   -- Nombre del bot
  interes TEXT,                      -- Producto/servicio de interés (puede ser NULL)
  email TEXT,                        -- Email del lead (puede ser NULL)
  telefono TEXT,                     -- Teléfono del lead (puede ser NULL)
  telegram_user_id INTEGER,          -- ID del usuario de Telegram
  estado TEXT DEFAULT 'nuevo',       -- Estado: nuevo, contactado, cerrado
  categoria TEXT DEFAULT 'cold',     -- Clasificación: hot, warm, cold
  producto_id INTEGER,               -- Producto seleccionado (opcional)
  detalles_compra TEXT,              -- JSON/Texto con detalles (opcional)
  notas TEXT,                        -- Notas internas (opcional)
  actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(bot_id, telegram_user_id),
  FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE SET NULL,
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE SET NULL
)
```

**Notas importantes:**
- Se permiten **leads parciales** para poder clasificar desde el primer mensaje.
- `categoria` se muestra en el dashboard como **CALIENTE/TIBIO/FRÍO**, pero se almacena como `hot/warm/cold`.
- Con `UNIQUE(bot_id, telegram_user_id)` el lead se puede **actualizar** (UPSERT) a medida que el usuario escribe.

### APIs

#### 1. **GET /api/leads** - Obtener leads
Retorna una lista de leads según el rol del usuario.

**Autenticación**: Bearer token requerido

**Parámetros Query**:
- `botId` (opcional): Filtrar por ID de bot
- `estado` (opcional): Filtrar por estado (`nuevo`, `contactado`, `cerrado`)
- `categoria` (opcional): Filtrar por categoría (`hot`, `warm`, `cold`)

**Respuesta**:
```json
[
  {
    "id": 1,
    "nombre": "Juan García",
    "bot_id": 1,
    "bot_nombre": "Mi Bot",
    "interes": "Producto X",
    "email": "usuario@email.com",
    "telefono": "1234567890",
    "telegram_user_id": 123456789,
    "estado": "nuevo",
    "categoria": "warm",
    "producto_id": null,
    "detalles_compra": null,
    "notas": null,
    "actualizado_en": "2026-03-04T10:35:00Z",
    "created_at": "2026-03-04T10:30:00Z"
  }
]
```

**Permisos**:
- Super Admin: Ve todos los leads
- Manager: Ve leads solo de sus bots asignados

---

#### 2. **POST /api/leads** - Crear un lead manualmente
Permite crear un lead desde el dashboard o desde terceros.

**Body**:
```json
{
  "bot_id": 1,
  "bot_slug": "mi-bot",
  "bot_nombre": "Mi Bot",
  "interes": "Producto interesante",
  "email": "usuario@email.com",
  "telefono": "1234567890",
  "telegram_user_id": 123456789,
  "estado": "nuevo",
  "categoria": "warm"
}
```

**Campos opcionales**:
- `interes`, `email`, `telefono` pueden ser `null`.
- `categoria`: `hot` | `warm` | `cold`.

---

#### 3. **PATCH /api/leads/{id}** - Actualizar un lead
Actualiza el estado u otros datos básicos de un lead existente.

**Body**:
```json
{
  "estado": "contactado",
  "interes": "Producto actualizado"
}
```

**Estados Válidos**:
- `nuevo`: Lead recién capturado
- `contactado`: Ya fue contactado
- `cerrado`: Se completó el proceso

---

#### 4. **DELETE /api/leads/{id}** - Eliminar un lead
Solo disponible para Super Admin (próximamente implementado).

---

## 🤖 Bot de Telegram

### Flujo de Captura de Leads

El bot (modo básico o GPT) sigue un flujo de conversación para entender interés y capturar datos de contacto.

```
/start
    ↓
¿En qué producto estás interesado? (WAIT_INTEREST)
    ↓
Comparte tu email (WAIT_EMAIL)
    ↓
Comparte tu teléfono (WAIT_PHONE)
    ↓
[Lead se guarda en BD automáticamente]
    ↓
Confirmación en Telegram
```

### Actualización "en vivo" (cada mensaje)

Los bots actualizan el lead **cada vez que el usuario escribe**, de forma que el dashboard refleje la **clasificación** y los datos disponibles en tiempo real.

La estrategia es mantener un único registro por usuario/telegram dentro del bot con `UNIQUE(bot_id, telegram_user_id)` y actualizarlo progresivamente.

---

## 📱 Dashboard de Leads

### Ubicación
`/dashboard/leads`

### Características

#### Estadísticas en Tiempo Real
- **Total**: Cantidad total de leads
- **Nuevos**: Leads sin contactar (estado: nuevo)
- **Contactados**: Leads ya contactados (estado: contactado)
- **Cerrados**: Leads que completaron el flujo (estado: cerrado)

#### Filtros
- 🔍 **Búsqueda**: Busca por email o teléfono
- 📊 **Estado**: Filtra por estado (Todos, Nuevo, Contactado, Cerrado)

#### Gestión de Leads
- Ver información de cada lead (email, teléfono; pueden venir vacíos)
- Cambiar estado de un lead con un dropdown
- Enviar email o llamar directamente (links activables)
- Ver fecha y hora de actualización (`actualizado_en`)

#### Permisos
- **Super Admin**: Ve todos los leads de todos los bots
- **Manager**: Ve solo leads de sus bots asignados

---

## 🔄 Flujo Completo Ejemplo

### 1. Usuario interactúa con el bot
```
Usuario: /start 1
Bot: ¡Hola! Bienvenido a Mi Marca. ¿En qué producto estás interesado?
Usuario: Me interesa el Producto Premium
...
[Lead se crea en BD con estado "nuevo"]
```

### 2. Admin ve el lead en el dashboard
```
Dashboard → Leads
- Total Leads: 42
- Nuevos: 12 ← El lead recién capturado
- Contactados: 25
- Cerrados: 5
```

### 3. Manager actualiza el estado
```
Click en lead → Dropdown de estado → Cambiar a "Contactado"
[Se actualiza en tiempo real]
```

---

## 🚀 Cómo Usar

### Para Capturar Leads (Usuario)
1. Usuario escribe `/start [bot_id]` en Telegram
2. Responde las preguntas del bot
3. Lead se guarda automáticamente en la BD

### Para Ver Leads (Admin/Manager)
1. Inicia sesión en el dashboard
2. Ve: **Panel Principal** → Opción **"Gestión de Leads"** (o navega a `/dashboard/leads`)
3. Visualiza todos tus leads con filtros y búsqueda

### Para Actualizar Estado (Admin/Manager)
1. En el dashboard de leads
2. Usa el dropdown del estado
3. Selecciona: Nuevo, Contactado o Cerrado
4. Se actualiza automáticamente

---

## 📋 Estados del Lead

| Estado | Significado | Color |
|--------|-----------|-------|
| **Nuevo** | Lead recién capturado, sin contacto | 🔵 Azul |
| **Contactado** | Ya fue contactado por el equipo | 🟡 Amarillo |
| **Cerrado** | Completó el ciclo de ventas | 🟢 Verde |

---

## 🔌 Integración con API

### Crear Lead desde Terceros

Si quieres crear leads desde otra aplicación:

```bash
curl -X POST http://localhost:3000/api/leads \
  -H "Authorization: Bearer [TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{
    "interes": "Producto X",
    "email": "usuario@ejemplo.com",
    "telefono": "1234567890",
    "bot_nombre": "Mi Bot",
    "estado": "nuevo"
  }'
```

### Obtener Leads

```bash
curl -X GET http://localhost:3000/api/leads?estado=nuevo \
  -H "Authorization: Bearer [TOKEN]"
```

---

## Limitaciones Actuales

- No hay exportación a CSV/Excel (próximamente)
- No hay búsqueda por fecha
- No hay etiquetas personalizadas

> Las notificaciones en tiempo real sí están implementadas — ver [NOTIFICACIONES.md](./NOTIFICACIONES.md).

---

## 📈 Próximas Mejoras

- [ ] Exportar leads a Excel/CSV
- [ ] Búsqueda avanzada (por fecha, bot, etc.)
- [ ] Etiquetas y categorización de leads
- [ ] Notificaciones al recibir un nuevo lead
- [ ] Integración con CRM
- [ ] Re-engagement automático

---

## 🐛 Troubleshooting

### Los leads no se guardan
1. Verifica que el bot tenga acceso a la BD
2. Revisa los logs del bot: `docker-compose logs bot`
3. Comprueba que la tabla `leads` existe

### No veo los leads en el dashboard
1. Verifica que hayas iniciado sesión
2. Si eres manager, verifica que tienes bots asignados
3. Comprueba que el token de autenticación sea válido

### No puedo cambiar el estado de un lead
1. Verifica que tengas permisos (super_admin o manager)
2. Revisa la consola del navegador para errores
3. Intenta recargar la página

---

## 📞 Contacto / Soporte

Para reportar issues o sugerencias sobre el sistema de leads, contacta al equipo de desarrollo.
