# LAIDA - Sistema Multi-Tenant Bot 🤖

Sistema completo de gestión de bots de Telegram con arquitectura multi-tenant, sistema de roles y captura de leads.

## 🏗️ Arquitectura

```
┌─────────────────┐
│  Super Admin    │
│   Dashboard     │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼──┐  ┌──▼───┐
│ Bots │  │Users │
└───┬──┘  └──┬───┘
    │        │
    └───┬────┘
        │
┌───────▼────────┐
│   Managers     │
│   Dashboard    │
└───────┬────────┘
        │
┌───────▼────────┐
│ Telegram Bots  │
│  (Multi-tenant)│
└────────────────┘
```

## 🎯 Características

### Sistema de Roles

1. **Super Admin**
   - Crear y gestionar bots
   - Asignar bots a managers (registrados)
   - Acceso completo al sistema

2. **Manager**
   - Gestionar bots asignados
   - Ver clientes capturados
   - Gestionar productos
   - Configurar esencia de marca

### Bots Multi-Tenant

- **Múltiples bots** ejecutándose simultáneamente
- **Configuración independiente** por bot:
  - Token de Telegram único
  - API Key de OpenAI (opcional)
  - Estado (activo/inactivo)
  - Manager asignado
- **Ejecución automática** de bots activos
- **Logs separados** por bot

## 🚀 Inicio Rápido

### 1. Clonar y configurar

```bash
git clone <repo>
cd LAIDA
```

### 2. Instalar dependencias

```bash
# Frontend
pnpm install

# Bot (si ejecutas localmente)
cd bot
pip install -r requirements.txt
cd ..
```

### 3. Iniciar con Docker

```bash
docker-compose up --build
```

El sistema estará disponible en:
- Frontend: http://localhost:3000
- Swagger UI: http://localhost:8080 (documentación interactiva de la API)
- Bots: Se ejecutan automáticamente según configuración en BD

Si la base de datos está vacía, LAIDA puede aplicar una **precarga demo** (idempotente) con un manager y un bot de ejemplo en estado `inactivo`.

### 4. Primer acceso

#### Super Admin por defecto:
- **Correo**: `admin@laida.com`
- **Contraseña**: `admin123`

⚠️ **IMPORTANTE**: Cambiar estas credenciales en producción

## 📦 Estructura del Proyecto

```
LAIDA/
├── app/
│   ├── api/              # API Routes
│   │   ├── login/
│   │   ├── usuarios/
│   │   ├── bots/
│   │   └── accesos/
│   ├── dashboard/
│   │   ├── admin/        # Dashboard Super Admin
│   │   │   ├── bots/
│   │   │   ├── usuarios/
│   │   │   └── accesos/
│   │   └── manager/      # Dashboard Manager
│   └── login/
├── bot/
│   ├── bot_manager.py              # Ejecuta todos los bots activos
│   ├── bot_launcher.py             # Selecciona bot GPT o básico
│   ├── laidaBot_gpt.py             # Bot con inteligencia GPT
│   ├── laidaBot_conversacional.py  # Bot básico con flujo guiado
│   ├── scripts/
│   │   ├── run_campaigns.py        # Ejecuta campañas programadas
│   │   └── migrate_leads.py        # Migración de datos
│   └── requirements.txt
├── db/
│   ├── init.ts           # Inicialización de BD
│   └── utils.ts          # Funciones de BD
├── lib/
│   └── auth.ts           # Autenticación y autorización
└── docker-compose.yml
```

## 📊 Base de Datos

### Tablas principales

#### `usuarios`
```sql
id, correo, password, rol, nombre, created_at, actualizado_en
```
- Roles: `super_admin`, `manager`

#### `bots`
```sql
id, nombre, slug, telegram_token, openai_key, estado, manager_id, marca_id, created_at, actualizado_en
```
- Estados: `activo`, `inactivo`

#### `usuario_bots`
```sql
id, usuario_id, bot_id, created_at
```
- Relación many-to-many entre usuarios y bots

## 🔧 Uso del Sistema

### Crear un Bot

1. Iniciar sesión como Super Admin
2. Ir a **Dashboard > Gestión de Bots**
3. Click en **Crear Bot**
4. Completar:
   - **Nombre**: Nombre descriptivo
   - **ID (slug)**: Identificador único (ej: `ingenieria`)
   - **Telegram Token**: Token del BotFather
   - **OpenAI API Key**: (Opcional) Para funciones IA
   - **Estado**: Activo/Inactivo

**Nota (Multi-tenant por marca):** cuando asignas un bot a un manager, el bot queda asociado a la marca del manager mediante `marca_id`.

### Registrar un Manager (Marca)

Hay dos formas de crear un manager:

**Desde el Dashboard (recomendado para el Super Admin):**
1. Ir a **Dashboard > Gestión de Usuarios** → **Crear Usuario**
2. Seleccionar rol **Manager**
3. Completar correo, contraseña y **nombre de la marca**
4. Guardar — crea el usuario y su marca automáticamente

**Auto-registro público:**
1. Abrir `/registro`
2. Completar los datos de la marca
3. Crear la cuenta (se crea el usuario con rol `manager` y su marca)

### Asignar Bot a Manager

1. Ir a **Dashboard > Gestión de Accesos**
2. Click en **Asignar Bot**
3. Seleccionar:
   - Manager
   - Bot
4. Click en **Asignar**

### Ejecutar Bots

#### Con Docker (Recomendado)
```bash
docker-compose up bot
```
Ejecuta automáticamente todos los bots activos

#### Localmente

**Un bot específico:**
```bash
cd bot
python bot_launcher.py <bot_id>
```

**Todos los bots activos:**
```bash
cd bot
python bot_manager.py
```

## 🔐 Seguridad

### ⚠️ Pendientes de Implementar

1. **bcrypt** para hash de contraseñas
2. **JWT** para tokens de autenticación
3. **HTTPS** en producción
4. **Rate limiting** en APIs
5. **Variables de entorno** para secretos

### Implementado

- ✅ Autenticación basada en roles
- ✅ Middleware de autorización
- ✅ Separación de datos por tenant
- ✅ Foreign keys en BD

## API Endpoints

Ver la referencia completa en [API.md](./API.md) o en Swagger UI (http://localhost:8080).

### Resumen rápido

```
POST   /api/login                     # Autenticación
POST   /api/registro                  # Registro manager + marca (público)

GET/POST/PUT/DELETE /api/bots         # CRUD de bots
GET/POST/PUT/DELETE /api/usuarios     # CRUD de usuarios
GET/POST/DELETE     /api/accesos      # Asignación bot-usuario
GET/POST/PATCH/DELETE /api/leads      # CRUD de leads
GET/POST/PUT/DELETE /api/clientes     # CRUD de clientes
GET                 /api/marcas       # Listar marcas
GET/POST/PUT/DELETE /api/esencia      # Esencia de marca
GET/POST/PUT/DELETE /api/productos    # CRUD de productos
GET/POST/DELETE     /api/productos/atributos
POST                /api/productos/import
GET/POST            /api/config-bot   # Config. mensaje bienvenida
GET/POST            /api/config-bot/flow
GET/POST/PATCH/DELETE /api/notificaciones
GET/POST/PATCH      /api/campaigns    # Campañas masivas
GET                 /api/analytics/overview
```

## 🐛 Troubleshooting

### Bot no inicia

1. Verificar que el bot esté **activo** en la BD
2. Verificar que el **token de Telegram** sea correcto
3. Revisar logs: `docker-compose logs bot`

### No puedo crear usuarios

- Verificar que estés autenticado como **Super Admin**
- Revisar errores en consola del navegador
- Verificar que el token de autenticación esté presente

### Base de datos no actualiza

1. Detener servicios: `docker-compose down`
2. Eliminar volúmenes: `docker-compose down -v`
3. Reiniciar: `docker-compose up --build`

## 🔄 Migración desde Sistema Anterior

### Si ya tenías `marcas`:

1. Los datos de `marcas` se mantienen por compatibilidad
2. Crear nuevos usuarios en tabla `usuarios`
3. Crear bots en tabla `bots`
4. Migración manual de datos si es necesario

## 📚 Próximos Pasos

- [ ] Implementar bcrypt + JWT
- [ ] Dashboard de estadísticas
- [ ] Exportar leads a CSV/Excel
- [ ] Integración con OpenAI
- [ ] Webhooks para notificaciones
- [ ] Panel de conversaciones en tiempo real
- [ ] Tests automatizados

## 📄 Licencia

Proyecto privado - Todos los derechos reservados

## 👥 Contribuciones

Para reportar issues o sugerencias, contactar al equipo de desarrollo.

---

**LAIDA** - Sistema de captura de leads con IA 🚀
