# 🔔 Sistema de Notificaciones en Tiempo Real - LAIDA

## Resumen

El sistema de notificaciones en tiempo real permite a los usuarios del dashboard recibir alertas instantáneas cuando ocurren eventos importantes, como la captura de nuevos leads, actualizaciones de estado, o cambios en el sistema.

---

## 🏗️ Arquitectura

### Componentes Principales

1. **Base de Datos** - Tabla `notificaciones`
2. **API de Notificaciones** - Endpoints para crear, leer y actualizar notificaciones
3. **Componente Bell** - Ícono de campana con contador en el header
4. **Sistema de Toasts** - Notificaciones emergentes automáticas
5. **Polling** - Actualización automática cada 30 segundos

---

## 📊 Base de Datos

### Tabla `notificaciones`

```sql
CREATE TABLE notificaciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER,                    -- NULL = para todos los usuarios
  tipo TEXT NOT NULL,                    -- tipo de notificación
  titulo TEXT NOT NULL,                  -- Título breve
  mensaje TEXT NOT NULL,                 -- Mensaje descriptivo
  lead_id INTEGER,                       -- Referencia a lead (opcional)
  bot_id INTEGER,                        -- Referencia a bot (opcional)
  leida INTEGER DEFAULT 0,               -- 0 = no leída, 1 = leída
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL,
  FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE SET NULL
)
```

### Tipos de Notificaciones

| Tipo | Descripción | Emoji |
|------|-------------|-------|
| `nuevo_lead` | Nuevo lead capturado | 🎉 |
| `lead_actualizado` | Estado de lead actualizado | 📝 |
| `nuevo_bot` | Nuevo bot creado | 🤖 |
| `sistema` | Mensaje del sistema | ⚙️ |

---

## 🔌 API de Notificaciones

### 1. **GET /api/notificaciones**

Obtener notificaciones del usuario autenticado.

**Headers**:
```
Authorization: Bearer [TOKEN]
```

**Query Parameters**:
- `action=count` - Obtener solo el contador de no leídas
- `action=unread` - Obtener solo notificaciones no leídas
- (sin query) - Obtener todas las notificaciones

**Respuestas**:

```json
// action=count
{ "count": 5 }

// action=unread o sin query
[
  {
    "id": 1,
    "usuario_id": 1,
    "tipo": "nuevo_lead",
    "titulo": "🎉 Nuevo Lead",
    "mensaje": "Lead interesado en \"Producto X\" - usuario@email.com",
    "lead_id": 10,
    "bot_id": 2,
    "leida": 0,
    "created_at": "2026-03-04T10:30:00Z"
  }
]
```

---

### 2. **POST /api/notificaciones**

Crear notificación o marcar todas como leídas.

**Body para marcar todas leídas**:
```json
{
  "action": "mark_all_read"
}
```

**Body para crear notificación** (solo Super Admin):
```json
{
  "tipo": "sistema",
  "titulo": "Mantenimiento programado",
  "mensaje": "El sistema estará en mantenimiento el sábado",
  "lead_id": null,
  "bot_id": null
}
```

**Respuesta**:
```json
{
  "id": 15,
  "tipo": "sistema",
  "titulo": "Mantenimiento programado",
  "mensaje": "El sistema estará en mantenimiento el sábado",
  "leida": 0,
  "created_at": "2026-03-04T11:00:00Z"
}
```

---

### 3. **PATCH /api/notificaciones/:id**

Marcar una notificación específica como leída.

**Respuesta**:
```json
{
  "id": 1,
  "leida": 1,
  ...
}
```

---

### 4. **DELETE /api/notificaciones/:id**

Eliminar una notificación (solo Super Admin).

**Respuesta**:
```json
{ "success": true }
```

---

## 🎨 Componentes UI

### NotificacionesBell

Componente de campana con badge de contador en el header del dashboard.

**Características**:
- 🔴 Badge rojo con contador de notificaciones no leídas
- 📋 Dropdown con lista de notificaciones
- ✅ Botón "Marcar todas" para leer todas de golpe
- ❌ Click en X para marcar individual como leída
- 🔄 Actualización automática cada 30 segundos

**Ubicación**: `/components/dashboard/notificaciones-bell.tsx`

**Uso**:
```tsx
import NotificacionesBell from "@/components/dashboard/notificaciones-bell"

<NotificacionesBell />
```

---

### useNotificacionesToast Hook

Hook personalizado que muestra toasts automáticos cuando hay nuevas notificaciones.

**Características**:
- 🎯 Detecta notificaciones nuevas desde la última verificación
- 🔔 Muestra toast automáticamente
- 🕐 No duplica notificaciones ya mostradas
- 🔄 Polling cada 30 segundos

**Ubicación**: `/hooks/use-notificaciones-toast.ts`

**Uso**:
```tsx
import { useNotificacionesToast } from "@/hooks/use-notificaciones-toast"

function DashboardLayout() {
  useNotificacionesToast() // Activa los toasts automáticos
  return <div>...</div>
}
```

---

## 🔄 Flujo de Notificaciones Automáticas

### Cuando se captura un nuevo Lead

1. **Bot de Telegram** o **API POST /api/leads** crea un lead
2. **Automáticamente** se crean notificaciones para:
   - ✅ Todos los **Super Admins**
   - ✅ **Managers** asignados al bot (si aplica)
3. Los usuarios ven:
   - 🔴 Badge en la campana del header
   - 🔔 Toast emergente (si están en el dashboard)
4. Click en la notificación → Se marca como leída

### Código en la API de Leads

```typescript
// En /api/leads POST
const lead = createLead({...})

// Crear notificaciones automáticas
const usuarios = getAllUsuarios()

// Notificar super admins
const superAdmins = usuarios.filter(u => u.rol === 'super_admin')
for (const admin of superAdmins) {
  createNotificacion({
    usuario_id: admin.id,
    tipo: 'nuevo_lead',
    titulo: '🎉 Nuevo Lead',
    mensaje: `Lead interesado en "${interes}" - ${email}`,
    lead_id: lead.id,
    bot_id: bot_id || null,
  })
}

// Notificar managers del bot
if (bot_id) {
  const managers = usuarios.filter(u => u.rol === 'manager')
  for (const manager of managers) {
    const botsAsignados = getBotsAsignadosAUsuario(manager.id)
    if (botsAsignados.some(b => b.id === bot_id)) {
      createNotificacion({...})
    }
  }
}
```

---

## 🚀 Cómo Funciona el Polling

### Actualización Automática

El sistema utiliza **polling** (no WebSockets) para mantener las notificaciones actualizadas:

1. **Cada 30 segundos** se hace una petición a `/api/notificaciones?action=unread`
2. Si hay notificaciones nuevas:
   - 🔄 Se actualiza el contador en la campana
   - 🔔 Se muestra un toast emergente
3. No requiere configuración adicional de servidor

**Ventajas del Polling**:
- ✅ Simple de implementar
- ✅ No requiere infraestructura especial
- ✅ Compatible con cualquier hosting
- ✅ Funciona en producción sin cambios

**Intervalos**:
- NotificacionesBell: 30 segundos
- useNotificacionesToast: 30 segundos

---

## 🎯 Casos de Uso

### 1. Nuevo Lead Capturado

```
Bot Telegram → Crea Lead → Sistema crea notificaciones
→ Admin ve badge "1" en campana
→ Toast: "🎉 Nuevo Lead - Lead interesado en Producto X"
→ Click en notificación → Va a /dashboard/leads
```

### 2. Múltiples Leads

```
3 leads capturados en 5 minutos
→ Badge muestra "3"
→ 3 toasts se muestran progresivamente
→ Click "Marcar todas" → Badge se limpia
```

### 3. Notificación del Sistema

```
Super Admin crea notificación de sistema
→ Todos los usuarios la reciben
→ Toast: "⚙️ Mantenimiento programado"
```

---

## 🛠️ Personalización

### Cambiar Intervalo de Polling

**En NotificacionesBell**:
```tsx
// Cambiar de 30s a 15s
const interval = setInterval(() => {
  cargarNotificaciones()
}, 15000) // 15 segundos
```

**En useNotificacionesToast**:
```tsx
// Cambiar de 30s a 60s
const interval = setInterval(checkNewNotifications, 60000) // 1 minuto
```

### Agregar Nuevos Tipos de Notificaciones

1. Actualizar el tipo en la BD:
```sql
CHECK(tipo IN ('nuevo_lead', 'lead_actualizado', 'nuevo_bot', 'sistema', 'nuevo_tipo'))
```

2. Agregar emoji en `getIconForTipo()`:
```tsx
case "nuevo_tipo":
  return "✨"
```

3. Crear notificación desde cualquier API:
```typescript
createNotificacion({
  usuario_id: userId,
  tipo: 'nuevo_tipo',
  titulo: 'Título',
  mensaje: 'Mensaje descriptivo',
})
```

---

## 📱 Interfaz de Usuario

### Header del Dashboard

```
┌─────────────────────────────────────────────────┐
│  LAIDA                              🔔 [3]      │
│  usuario@email.com                              │
└─────────────────────────────────────────────────┘
```

### Dropdown de Notificaciones

```
┌─────────────────────────────────┐
│ Notificaciones  [✓ Marcar todas]│
├─────────────────────────────────┤
│ 🎉 Nuevo Lead              [❌] │
│ Lead interesado en...           │
│ Hace 5m                         │
├─────────────────────────────────┤
│ 🤖 Nuevo Bot               [❌] │
│ Bot "Mi Bot" creado             │
│ Hace 2h                         │
└─────────────────────────────────┘
```

### Toast Emergente

```
┌────────────────────────────┐
│ 🎉 Nuevo Lead              │
│ Lead interesado en         │
│ "Producto Premium"         │
│ usuario@ejemplo.com        │
└────────────────────────────┘
```

---

## 🔐 Permisos

| Acción | Super Admin | Manager |
|--------|-------------|---------|
| Ver notificaciones propias | ✅ | ✅ |
| Ver contador | ✅ | ✅ |
| Marcar como leída | ✅ | ✅ |
| Marcar todas leídas | ✅ | ✅ |
| Crear notificación manual | ✅ | ❌ |
| Eliminar notificación | ✅ | ❌ |

---

## 🧪 Testing

### Crear Lead de Prueba

```bash
curl -X POST http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "interes": "Producto de Prueba",
    "email": "test@ejemplo.com",
    "telefono": "1234567890",
    "bot_nombre": "Test Bot"
  }'
```

### Verificar Notificaciones

1. Login en el dashboard
2. Observa el badge en la campana (debería aparecer "1")
3. Verifica que aparece un toast
4. Click en la campana para ver la notificación
5. Click en la notificación para marcarla como leída

---

## 🐛 Troubleshooting

### Las notificaciones no aparecen

1. Verifica que estés autenticado
2. Abre la consola del navegador y busca errores
3. Verifica que la API responda: `GET /api/notificaciones?action=count`
4. Revisa que el token sea válido

### El badge no se actualiza

1. El polling se ejecuta cada 30 segundos, espera
2. Recarga la página
3. Verifica que no haya errores en la consola

### Los toasts no aparecen

1. Verifica que el `Toaster` esté en el layout
2. Verifica que `useNotificacionesToast()` esté siendo llamado
3. Crea un lead nuevo y espera hasta 30 segundos

### Contador incorrecto

1. Navega a `/dashboard/leads` o cualquier página
2. El contador debería actualizarse automáticamente
3. Click en "Marcar todas" para resetear

---

## 📈 Métricas y Estadísticas

### Consultas SQL Útiles

**Total de notificaciones por usuario**:
```sql
SELECT usuario_id, COUNT(*) as total
FROM notificaciones
WHERE usuario_id IS NOT NULL
GROUP BY usuario_id
```

**Notificaciones no leídas más antiguas**:
```sql
SELECT *
FROM notificaciones
WHERE leida = 0
ORDER BY created_at ASC
LIMIT 10
```

**Tipos más comunes**:
```sql
SELECT tipo, COUNT(*) as cantidad
FROM notificaciones
GROUP BY tipo
ORDER BY cantidad DESC
```

---

## 🚀 Próximas Mejoras

- [ ] WebSockets para notificaciones instantáneas (sin polling)
- [ ] Sonidos personalizables
- [ ] Preferencias de notificaciones por usuario
- [ ] Notificaciones por email
- [ ] Historial completo de notificaciones
- [ ] Filtros avanzados (por tipo, fecha, etc.)
- [ ] Notificaciones push en navegador
- [ ] Integración con Slack/Discord

---

## 📞 Contacto / Soporte

Para reportar bugs o sugerencias sobre el sistema de notificaciones, contacta al equipo de desarrollo.
