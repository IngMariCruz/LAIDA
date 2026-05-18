# LAIDA

LAIDA es una plataforma **multi-tenant** que combina bots de Telegram con una aplicación web para la captura y gestión de leads de micro y pequeñas empresas, utilizando IA (GPT) y analítica de datos.

## Características Principales

- **Multi-tenant**: Múltiples bots independientes en una sola plataforma
- **Sistema de roles**: Super Admin y Managers con permisos específicos
- **Bots de Telegram**: Captura automática de leads con flujo conversacional
- **Dashboard completo**: Gestión de bots, usuarios, leads, clientes, productos, campañas, analytics y accesos
- **IA opcional**: Integración con OpenAI GPT por bot (configurable desde el dashboard)
- **Analytics**: Dashboard de métricas con leads por categoría, por bot y por día
- **Notificaciones**: Alertas en tiempo real al capturar nuevos leads (polling cada 30 s)
- **Campañas**: Envío masivo de mensajes a leads por Telegram
- **Esencia de marca**: Configuración de valores, diferenciador e historia para contextualizar el bot GPT
- **Gestión de clientes**: Registro de clientes con cédula e importación masiva
- **Swagger UI**: Documentación interactiva de la API en [http://localhost:8080](http://localhost:8080)

---

## Inicio Rápido

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

Ver [docs/QUICKSTART.md](./docs/QUICKSTART.md) para guía paso a paso.

---

## Arquitectura

### Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 16.1.6 + React 19 + TypeScript |
| Backend | Next.js API Routes (integrado en el frontend) |
| Bot | Python 3.12 + python-telegram-bot |
| Base de datos | SQLite (via better-sqlite3) |
| UI | Tailwind CSS + shadcn/ui |
| Deployment | Docker + Docker Compose |

### Estructura del Proyecto

```
LAIDA/
├── frontend/
│   ├── app/
│   │   ├── api/                    # 20+ endpoints REST
│   │   │   ├── login/
│   │   │   ├── registro/
│   │   │   ├── usuarios/
│   │   │   ├── bots/
│   │   │   ├── accesos/
│   │   │   ├── leads/
│   │   │   ├── clientes/
│   │   │   ├── marcas/
│   │   │   ├── esencia/
│   │   │   ├── productos/
│   │   │   ├── campaigns/
│   │   │   ├── notificaciones/
│   │   │   ├── config-bot/
│   │   │   └── analytics/
│   │   ├── dashboard/
│   │   │   ├── admin/              # Panel Super Admin (bots, usuarios, accesos)
│   │   │   ├── manager/            # Panel Manager (por slug de bot)
│   │   │   ├── leads/
│   │   │   ├── clientes/
│   │   │   ├── productos/
│   │   │   ├── campaigns/
│   │   │   ├── analytics/
│   │   │   ├── config-bot/
│   │   │   ├── marca/
│   │   │   └── editar-perfil/
│   │   ├── login/
│   │   └── registro/
│   ├── components/
│   │   ├── ui/                     # Componentes shadcn/ui
│   │   └── dashboard/              # Componentes del panel
│   ├── db/
│   │   ├── init.ts                 # Schema e inicialización SQLite
│   │   └── utils.ts                # Funciones de base de datos
│   └── lib/
│       ├── auth.ts                 # Autenticación y roles
│       └── utils.ts
├── bot/
│   ├── bot_manager.py              # Ejecuta todos los bots activos
│   ├── bot_launcher.py             # Selecciona bot GPT o básico según config
│   ├── laidaBot_gpt.py             # Bot con inteligencia GPT
│   ├── laidaBot_conversacional.py  # Bot básico con flujo por botones
│   ├── scripts/
│   │   ├── migrate_leads.py
│   │   └── run_campaigns.py
│   └── requirements.txt
├── bd/                             # Base de datos SQLite
├── docs/                           # Documentación completa
├── openapi.yaml                    # Especificación OpenAPI (Swagger)
└── docker-compose.yml
```

### Roles del Sistema

```
Super Admin
  ├── Crea y gestiona bots
  ├── Registra managers y asigna bots
  ├── Ve todos los leads y estadísticas
  └── Ejecuta campañas

Manager
  ├── Ve leads de sus bots asignados
  ├── Gestiona productos, clientes y esencia de marca
  └── Configura flujo del bot
```

---

## Desarrollo Local

### Requisitos

- Node.js 18+
- Python 3.11+
- Docker (recomendado)
- pnpm

### Instalación sin Docker

```bash
# Frontend
cd frontend
pnpm install
pnpm dev

# Bot (en otra terminal)
cd bot
pip install -r requirements.txt
python bot_manager.py
```

### Variables de Entorno

```bash
cp .env.example .env
# Editar DB_PATH y BOT_DB_PATH si es necesario
# Los tokens de Telegram y las API Keys de OpenAI se configuran POR BOT
# desde el Dashboard (Gestión de Bots) — no van en .env
```

---

## Base de Datos

Tablas principales:

```
usuarios           — Cuentas del sistema (super_admin, manager)
bots               — Bots de Telegram (token, openai_key, estado, marca_id)
usuario_bots       — Asignación manager ↔ bot (many-to-many)
marcas             — Marcas/tenants registrados
leads              — Leads capturados por los bots (nombre, email, teléfono, categoría)
clientes           — Clientes registrados con cédula por marca
productos          — Catálogo de productos por marca
producto_atributos — Atributos configurables por producto (text/number/select/color)
config_bot         — Configuración de mensaje de bienvenida por marca
bot_flow_config    — Flujo conversacional personalizado por bot
esencia            — Valores, diferenciador e historia de cada marca
bot_interacciones  — Log de interacciones del bot (analytics)
notificaciones     — Alertas del sistema
campaigns          — Campañas de mensajería masiva
```

---

## Seguridad

**Implementado:**
- Autenticación basada en roles
- Middleware de autorización en todos los endpoints
- Separación de datos por tenant
- Foreign keys en BD
- Validación de entrada

**Pendiente (para producción):**
- bcrypt para hash de contraseñas
- JWT para tokens seguros
- Rate limiting en APIs
- HTTPS

---

## Documentación

| Archivo | Descripción |
|---------|-------------|
| [docs/QUICKSTART.md](./docs/QUICKSTART.md) | Guía de inicio en 3 minutos |
| [docs/SETUP.md](./docs/SETUP.md) | Configuración detallada |
| [docs/API.md](./docs/API.md) | Referencia completa de endpoints |
| [docs/BOT_GPT.md](./docs/BOT_GPT.md) | Bot con inteligencia artificial GPT |
| [docs/BOT_CONVERSACIONAL.md](./docs/BOT_CONVERSACIONAL.md) | Bot básico con flujo guiado |
| [docs/BOT_MULTITENANT.md](./docs/BOT_MULTITENANT.md) | Arquitectura multi-tenant |
| [docs/LEADS.md](./docs/LEADS.md) | Sistema de captura de leads |
| [docs/NOTIFICACIONES.md](./docs/NOTIFICACIONES.md) | Sistema de notificaciones |
| [openapi.yaml](./openapi.yaml) | Especificación OpenAPI (ver en [Swagger UI](http://localhost:8080)) |

---

## Licencia

Proyecto privado — Todos los derechos reservados.
