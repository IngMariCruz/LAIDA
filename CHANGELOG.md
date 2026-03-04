# Changelog

Todos los cambios notables de LAIDA se documentarán en este archivo.

## [2.0.0] - 2026-03-02

### 🚀 Refactorización Completa - Sistema Multi-Tenant

#### ✨ Añadido

**Sistema de Usuarios y Roles**
- Sistema de autenticación con roles (Super Admin / Manager)
- Usuario Super Admin por defecto (`admin@laida.com / admin123`)
- Tabla `usuarios` en base de datos
- Middleware de autenticación y autorización
- Funciones de auth en `lib/auth.ts`

**Sistema Multi-Tenant de Bots**
- Tabla `bots` para gestionar múltiples bots
- Tabla `usuario_bots` para asignación many-to-many
- Bot manager (`bot_manager.py`) para ejecutar múltiples bots
- Bot multi-tenant (`laidaBot_multitenant.py`) que carga config desde BD
- Cada bot tiene su propio token de Telegram y OpenAI key
- Logs de conversaciones separados por bot

**Dashboard de Super Admin**
- `/dashboard/admin` - Panel principal de Super Admin
- `/dashboard/admin/bots` - Gestión completa de bots (CRUD)
- `/dashboard/admin/usuarios` - Gestión de usuarios (CRUD)
- `/dashboard/admin/accesos` - Asignación de bots a managers

**Dashboard de Manager**
- `/dashboard/manager` - Panel de manager con bots asignados
- Acceso solo a bots asignados por Super Admin
- Vista de clientes, productos y configuración por bot

**APIs REST**
- `POST /api/login` - Autenticación renovada con roles
- `GET/POST/PUT/DELETE /api/usuarios` - CRUD de usuarios
- `GET/POST/PUT/DELETE /api/bots` - CRUD de bots
- `GET/POST/DELETE /api/accesos` - Gestión de asignaciones

**Documentación**
- `SETUP.md` - Documentación completa del sistema
- `QUICKSTART.md` - Guía de inicio rápido
- `API.md` - Documentación de APIs
- `CHANGELOG.md` - Este archivo
- README.md actualizado con nueva arquitectura

**Docker y Deployment**
- Docker Compose actualizado para multi-tenant
- Dockerfile del bot mejorado con bot_manager
- Volúmenes compartidos para BD entre servicios
- Variables de entorno actualizadas

#### 🔄 Cambiado

**Base de Datos**
- Migración de sistema single-tenant a multi-tenant
- Nuevas tablas: `usuarios`, `bots`, `usuario_bots`
- Tabla `marcas` mantenida para compatibilidad
- Schema actualizado en `db/init.ts`
- Funciones actualizadas en `db/utils.ts`

**Bot de Telegram**
- De un solo bot a múltiples bots independientes
- Configuración cargada desde BD en lugar de env vars
- Ejecución mediante bot_manager
- Logs separados por bot

**Autenticación**
- De sistema basado en `marcas` a sistema de `usuarios` con roles
- Token incluye información de rol
- Respuesta de login incluye bots asignados

**Frontend**
- Dashboard rediseñado con navegación por rol
- Componentes UI mejorados con shadcn/ui
- Flujo de autenticación actualizado

#### 🗑️ Deprecado

- Sistema anterior de marcas (mantenido para migración)
- Variable de entorno `TELEGRAM_TOKEN` (ahora en BD)
- Login con `correoEmpresa` (ahora usar `correo`)

#### 🔒 Seguridad

**Implementado:**
- Verificación de roles en todas las APIs
- Separación de permisos Super Admin / Manager
- Foreign keys en base de datos
- Validación de entrada en APIs

**Pendiente:**
- ⚠️ Implementar bcrypt para passwords
- ⚠️ Implementar JWT para tokens
- ⚠️ Añadir rate limiting
- ⚠️ Configurar HTTPS en producción

#### 📝 Notas de Migración

**Si actualizas desde v1.x:**

1. **Backup de tu base de datos** antes de migrar
2. Los datos de `marcas` se mantienen por compatibilidad
3. Crear nuevo usuario Super Admin manualmente o usar el por defecto
4. Crear bots desde el dashboard y configurar tokens
5. Migrar datos manualmente si es necesario

**Credenciales por defecto:**
```
Correo: admin@laida.com
Password: admin123
```

**⚠️ IMPORTANTE:** Cambiar credenciales en producción

---

## [1.0.0] - 2026-02-15

### ✨ Versión Inicial

- Sistema single-tenant con tabla `marcas`
- Bot único de Telegram
- Dashboard básico para gestión de clientes
- Sistema de autenticación simple
- Landing page
- CRUD de productos y clientes
- Configuración de esencia de marca

---

## Tipos de Cambios

- `✨ Añadido` - Nueva funcionalidad
- `🔄 Cambiado` - Cambios en funcionalidad existente
- `🗑️ Deprecado` - Funcionalidad que será removida
- `🔒 Seguridad` - Cambios de seguridad
- `🐛 Corregido` - Corrección de bugs
- `📝 Documentación` - Cambios solo en documentación
