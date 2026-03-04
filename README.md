# LAIDA 🤖💬

LAIDA es una plataforma **multi-tenant** que combina bots de Telegram con una aplicación web para la captura y gestión de leads de PYMEs, utilizando IA y analítica de datos.

## ✨ Características Principales

- 🏢 **Multi-tenant**: Múltiples bots independientes en una sola plataforma
- 👥 **Sistema de roles**: Super Admin y Managers con permisos específicos
- 🤖 **Bots de Telegram**: Captura automática de leads conversacionales
- 📊 **Dashboard completo**: Gestión de bots, usuarios y accesos
- 🔐 **Autenticación segura**: Sistema de roles y permisos
- 📈 **Analytics**: Seguimiento de conversaciones y leads
- 🎨 **UI moderna**: Interfaz intuitiva con Tailwind CSS y shadcn/ui

---

## 🚀 Inicio Rápido

```bash
# 1. Clonar proyecto
git clone <repo>
cd LAIDA

# 2. Iniciar con Docker
docker-compose up --build

# 3. Acceder
# Web: http://localhost:3000
# Login: admin@laida.com / admin123
```

📖 Ver [QUICKSTART.md](./QUICKSTART.md) para guía paso a paso

---

## 🧠 Arquitectura

### Stack Tecnológico

- **Frontend**: Next.js 16 + React 19 + TypeScript
- **Backend**: Next.js API Routes
- **Bot**: Python 3.12 + python-telegram-bot
- **Base de datos**: SQLite (migrable a PostgreSQL)
- **UI**: Tailwind CSS + shadcn/ui + Radix UI
- **Deployment**: Docker + Docker Compose

### Estructura de Roles

```
┌─────────────────┐
│  Super Admin    │  ← Gestiona todo el sistema
│   Dashboard     │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼──┐  ┌──▼───┐
│ Bots │  │Users │  ← Crea bots y usuarios
└───┬──┘  └──┬───┘
    │        │
    └───┬────┘
        │
┌───────▼────────┐
│   Managers     │  ← Gestionan sus bots asignados
│   Dashboard    │
└───────┬────────┘
        │
┌───────▼────────┐
│ Telegram Bots  │  ← Capturan leads
│  (Multi-tenant)│
└────────────────┘
```

---

## 📦 Características del Sistema

### Super Admin

- ✅ Crear y gestionar múltiples bots
- ✅ Crear usuarios managers
- ✅ Asignar bots a managers
- ✅ Ver estadísticas globales
- ✅ Configurar tokens y API keys

### Manager

- ✅ Ver bots asignados
- ✅ Gestionar clientes capturados
- ✅ Administrar productos
- ✅ Configurar esencia de marca
- ✅ Exportar datos

### Bots de Telegram

- ✅ Flujo conversacional personalizable
- ✅ Captura de: interés, email, teléfono
- ✅ Validación de datos
- ✅ Multi-lenguaje
- ✅ Logs de conversaciones
- ✅ Integración con OpenAI (opcional)

---

## 🛠️ Desarrollo

### Requisitos

- Node.js 18+
- Python 3.11+
- Docker (recomendado)
- pnpm (o npm/yarn)

### Instalación Local

```bash
# Frontend
pnpm install
pnpm dev

# Bot (en otra terminal)
cd bot
pip install -r requirements.txt
python bot_manager.py
```

### Variables de Entorno

```env
# .env.local (frontend)
DB_PATH=./bd/laida.db

# .env (bot)
BOT_DB_PATH=../bd/laida.db
BOT_CONVERSATIONS_DIR=./conversations
```

---

## 📂 Estructura del Proyecto

```
LAIDA/
├── app/
│   ├── api/                 # API Routes
│   │   ├── login/          # Autenticación
│   │   ├── usuarios/       # CRUD usuarios
│   │   ├── bots/           # CRUD bots
│   │   └── accesos/        # Gestión de permisos
│   ├── dashboard/
│   │   ├── admin/          # Dashboard Super Admin
│   │   └── manager/        # Dashboard Manager
│   └── login/              # Página de login
├── bot/
│   ├── laidaBot_multitenant.py  # Bot individual
│   ├── bot_manager.py           # Gestor de bots
│   └── requirements.txt
├── components/
│   ├── ui/                 # Componentes shadcn/ui
│   ├── dashboard/          # Componentes dashboard
│   └── landing/            # Componentes landing
├── db/
│   ├── init.ts             # Schema e inicialización
│   └── utils.ts            # Funciones de base de datos
├── lib/
│   ├── auth.ts             # Autenticación y autorización
│   └── utils.ts            # Utilidades generales
├── docker-compose.yml       # Orquestación de servicios
├── SETUP.md                 # Documentación completa
└── QUICKSTART.md            # Guía rápida de inicio
```

---

## 🔐 Seguridad

### Implementado

- ✅ Autenticación basada en roles
- ✅ Middleware de autorización
- ✅ Separación de datos por tenant
- ✅ Foreign keys en BD
- ✅ Validación de entrada

### Por Implementar

- ⏳ bcrypt para hash de contraseñas
- ⏳ JWT para tokens seguros
- ⏳ Rate limiting en APIs
- ⏳ HTTPS en producción
- ⏳ Sanitización avanzada

---

## 📊 Base de Datos

### Tablas Principales

```sql
-- Usuarios del sistema
usuarios (id, correo, password, rol, nombre)

-- Bots de Telegram
bots (id, nombre, slug, telegram_token, openai_key, estado)

-- Relación usuarios-bots
usuario_bots (usuario_id, bot_id)

-- Leads capturados
clientes (id, nombre, email, telefono, bot_id)

-- Productos/Servicios
productos (id, nombre, precio, bot_id)

-- Configuración de marca
esencia (id, valores, diferencia, historia, bot_id)
```

---

## 🧪 Testing

```bash
# Tests unitarios (por implementar)
pnpm test

# Tests E2E (por implementar)
pnpm test:e2e

# Linting
pnpm lint
```

---

## 📚 Documentación

- 📖 [QUICKSTART.md](./QUICKSTART.md) - Inicio rápido
- 📘 [SETUP.md](./SETUP.md) - Documentación completa
- 🔧 [API.md](./API.md) - Documentación de APIs (por crear)

---

## 🗺️ Roadmap

### v1.0 (Actual)
- ✅ Sistema multi-tenant
- ✅ Dashboard Super Admin
- ✅ Dashboard Manager
- ✅ Bot multi-tenant

### v1.1
- [ ] bcrypt + JWT
- [ ] Exportar leads a Excel/CSV
- [ ] Panel de estadísticas
- [ ] Personalización de mensajes desde UI

### v1.2
- [ ] Integración OpenAI
- [ ] Templates de conversación
- [ ] Webhooks
- [ ] Notificaciones en tiempo real

### v2.0
- [ ] Analytics avanzado
- [ ] CRM integrado
- [ ] API pública
- [ ] Mobile app

---

## 🤝 Contribución

Este es un proyecto privado. Para reportar bugs o sugerir mejoras, contacta al equipo de desarrollo.

---

## 📞 Soporte

- 📧 Email: [tu-email]
- 💬 Slack: [tu-slack]
- 📖 Docs: [tu-docs-url]

---

## 📄 Licencia

Proyecto privado - Todos los derechos reservados

---

**LAIDA** - Captura leads inteligente con IA 🚀

Desarrollado con ❤️ para PYMEs