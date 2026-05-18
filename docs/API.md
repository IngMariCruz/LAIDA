# API Reference - LAIDA

Documentación de las APIs disponibles en LAIDA.

## Autenticación

Todas las APIs (excepto `/api/login` y `/api/registro`) requieren autenticación mediante token Bearer.

```http
Authorization: Bearer <token>
```

---

## Endpoints

### 1. Autenticación

#### POST /api/login

Inicia sesión y obtiene un token de autenticación.

**Request:**
```json
{
  "correo": "admin@laida.com",
  "password": "admin123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Sesión iniciada exitosamente",
  "usuario": {
    "id": 1,
    "correo": "admin@laida.com",
    "rol": "super_admin",
    "nombre": "Super Admin",
    "botsAsignados": []
  },
  "token": "MTo..."
}
```

**Errores:**
- `400`: Campos faltantes
- `401`: Credenciales incorrectas

---

#### POST /api/registro

Registra un **manager** junto con su **marca** (tenant). No requiere autenticación.

**Request:**
```json
{
  "nombreMarca": "Marca Demo",
  "correoEmpresa": "ventas@marca.com",
  "nombreRepresentante": "Mariana",
  "numero": "+57 300 000 0000",
  "correoPersonal": "mariana@marca.com",
  "password": "secreto123"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Registro completado exitosamente",
  "marcaId": 1,
  "usuarioId": 2
}
```

**Errores:**
- `400`: Campos faltantes o correos inválidos
- `409`: El correo ya está registrado

---

### 2. Bots

#### GET /api/bots

Obtiene todos los bots (Super Admin) o los bots del manager autenticado.

**Query Parameters:**
- `id` (opcional): ID del bot específico
- `slug` (opcional): Slug del bot
- `managerId` (opcional): Bots de un manager

**Response (200):**
```json
[
  {
    "id": 1,
    "nombre": "Bot Principal",
    "slug": "default",
    "telegram_token": "123:ABC...",
    "openai_key": "sk-...",
    "estado": "activo",
    "manager_id": null,
    "marca_id": null,
    "created_at": "2026-03-02T10:00:00.000Z",
    "actualizado_en": "2026-03-02T10:00:00.000Z"
  }
]
```

#### POST /api/bots

Crea un nuevo bot (Solo Super Admin).

**Request:**
```json
{
  "nombre": "Bot de Ingeniería",
  "slug": "ingenieria",
  "telegram_token": "123456:ABC-DEF...",
  "openai_key": "sk-...",
  "estado": "activo",
  "manager_id": 2
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Bot creado exitosamente",
  "bot": {
    "id": 2,
    "nombre": "Bot de Ingeniería",
    "slug": "ingenieria"
  }
}
```

**Errores:**
- `400`: Datos inválidos o slug duplicado
- `403`: No autorizado

#### PUT /api/bots

Actualiza un bot (Solo Super Admin).

**Request:**
```json
{
  "id": 2,
  "nombre": "Bot de Ingeniería Actualizado",
  "estado": "inactivo"
}
```

#### DELETE /api/bots?id=2

Elimina un bot (Solo Super Admin).

**Response (200):**
```json
{ "success": true, "message": "Bot eliminado exitosamente" }
```

---

### 3. Usuarios

#### GET /api/usuarios

Obtiene todos los usuarios (Solo Super Admin).

**Response (200):**
```json
[
  {
    "id": 1,
    "correo": "admin@laida.com",
    "rol": "super_admin",
    "nombre": "Super Admin",
    "created_at": "2026-03-01T00:00:00.000Z",
    "actualizado_en": "2026-03-01T00:00:00.000Z"
  }
]
```

#### POST /api/usuarios

Crea un nuevo usuario con rol `super_admin` (Solo Super Admin).

> **Nota:** este endpoint solo acepta `rol: "super_admin"`. Para crear un manager, el Dashboard llama internamente a `POST /api/registro` (pasando el `nombre_marca` requerido). Los managers también pueden auto-registrarse en `/registro` públicamente.

**Request:**
```json
{
  "correo": "admin2@laida.com",
  "password": "temporal123",
  "rol": "super_admin",
  "nombre": "Otro Super Admin"
}
```

**Errores:**
- `400`: Email duplicado o rol inválido (no se permite `manager` aquí)

#### PUT /api/usuarios

Actualiza un usuario (Solo Super Admin).

**Request:**
```json
{
  "id": 3,
  "nombre": "Juan Pérez García",
  "password": "nuevaPassword"
}
```

#### DELETE /api/usuarios?id=3

Elimina un usuario (Solo Super Admin).

---

#### GET /api/usuarios/{id}/bots

Obtiene los bots asignados a un usuario específico (Solo Super Admin).

**Response (200):**
```json
[
  { "id": 1, "nombre": "Bot Principal", "slug": "default", "estado": "activo" }
]
```

---

### 4. Accesos (Asignación de Bots)

#### GET /api/accesos?usuarioId=2

Obtiene los bots asignados a un usuario.

**Response (200):**
```json
{
  "bots": [
    { "id": 1, "nombre": "Bot Principal", "slug": "default", "estado": "activo" }
  ]
}
```

#### GET /api/accesos?botId=1

Obtiene los usuarios con acceso a un bot.

**Response (200):**
```json
{
  "usuarios": [
    { "id": 2, "correo": "manager@empresa.com", "rol": "manager", "nombre": "Juan Pérez" }
  ]
}
```

#### POST /api/accesos

Asigna un bot a un usuario (Solo Super Admin).

**Request:**
```json
{ "usuarioId": 2, "botId": 1 }
```

**Response (200):**
```json
{
  "success": true,
  "message": "Bot 'Bot Principal' asignado a manager@empresa.com exitosamente"
}
```

#### DELETE /api/accesos?usuarioId=2&botId=1

Remueve acceso de un usuario a un bot (Solo Super Admin).

---

### 5. Leads

#### GET /api/leads

Retorna leads según el rol:
- `super_admin`: todos los leads
- `manager`: solo leads de sus bots asignados

**Query Parameters:**
- `botId` (opcional): filtrar por bot
- `estado` (opcional): `nuevo` | `contactado` | `cerrado`
- `categoria` (opcional): `hot` | `warm` | `cold`

**Response (200):**
```json
[
  {
    "id": 1,
    "nombre": "Juan García",
    "bot_id": 1,
    "bot_nombre": "Mi Bot",
    "interes": "Producto X",
    "email": "cliente@email.com",
    "telefono": "3000000000",
    "telegram_user_id": 123456789,
    "estado": "nuevo",
    "categoria": "hot",
    "producto_id": 10,
    "detalles_compra": "{\"color\":\"rojo\"}",
    "notas": "Dijo que compra hoy",
    "created_at": "2026-03-04T10:30:00Z",
    "actualizado_en": "2026-03-04T10:35:00Z"
  }
]
```

#### POST /api/leads

Crea un lead. Se permiten **leads parciales** (email/teléfono/interés pueden ser `null`) para clasificar desde el primer mensaje.

**Request (mínimo):**
```json
{
  "bot_id": 1,
  "telegram_user_id": 123456789,
  "categoria": "warm"
}
```

**Request (completo):**
```json
{
  "bot_id": 1,
  "bot_slug": "mi-bot",
  "bot_nombre": "Mi Bot",
  "nombre": "Juan García",
  "interes": "Producto X",
  "email": "cliente@email.com",
  "telefono": "3000000000",
  "telegram_user_id": 123456789,
  "estado": "nuevo",
  "categoria": "hot",
  "producto_id": 10,
  "detalles_compra": "{\"color\":\"rojo\"}",
  "notas": "Dijo que compra hoy"
}
```

#### PATCH /api/leads/{id}

Actualiza campos de un lead existente (manager o super_admin).

**Request:**
```json
{ "estado": "contactado" }
```

#### DELETE /api/leads/{id}

Solo `super_admin`.

---

### 6. Clientes

Módulo para gestionar clientes registrados de una marca (distinto de leads: aquí se almacenan clientes con cédula/datos completos).

#### GET /api/clientes?marcaId=1

Obtiene todos los clientes de una marca.

**Query Parameters:**
- `marcaId` (requerido): ID de la marca
- `id` (opcional): ID específico de cliente

**Response (200):**
```json
[
  {
    "id": 1,
    "cedula": "12345678",
    "nombre": "Juan",
    "apellido": "García",
    "correo": "juan@email.com",
    "telefono": "3000000000",
    "marca_id": 1,
    "created_at": "2026-03-01T00:00:00.000Z"
  }
]
```

#### POST /api/clientes

Crea un nuevo cliente.

**Request:**
```json
{
  "cedula": "12345678",
  "nombre": "Juan",
  "apellido": "García",
  "correo": "juan@email.com",
  "telefono": "3000000000",
  "marcaId": 1
}
```

**Errores:**
- `400`: `cedula`, `nombre`, `apellido` o `marcaId` faltantes

#### PUT /api/clientes

Actualiza un cliente.

**Request:**
```json
{
  "id": 1,
  "marcaId": 1,
  "nombre": "Juan Actualizado"
}
```

#### DELETE /api/clientes?id=1&marcaId=1

Elimina un cliente (validando que pertenezca a la marca indicada).

---

#### POST /api/clientes/import

Importa clientes en lote desde un archivo (Excel/CSV).

**Request:** `multipart/form-data` con campo `file`.

**Response (200):**
```json
{ "success": true, "imported": 15, "errors": [] }
```

---

### 7. Marcas

#### GET /api/marcas

Obtiene marcas según el rol:
- `super_admin`: todas las marcas
- `manager`: solo su propia marca

**Response (200):**
```json
[
  {
    "id": 1,
    "usuario_id": 2,
    "nombre_marca": "Tienda Demo",
    "created_at": "2026-03-01T00:00:00.000Z",
    "actualizado_en": "2026-03-01T00:00:00.000Z"
  }
]
```

---

### 8. Esencia de Marca

Módulo para configurar la identidad/esencia de cada marca (valores, diferenciador, historia). Esta información se usa para enriquecer el contexto del bot GPT.

#### GET /api/esencia?marcaId=1

Obtiene la esencia de una marca.

**Response (200):**
```json
{
  "id": 1,
  "marca_id": 1,
  "valores": "Calidad, Innovación, Cercanía",
  "diferencia": "Productos hechos a mano con materiales sostenibles",
  "historia": "Fundada en 2020 por...",
  "created_at": "2026-03-01T00:00:00.000Z"
}
```

#### POST /api/esencia

Crea la esencia de una marca.

**Request:**
```json
{
  "marcaId": 1,
  "valores": "Calidad, Innovación",
  "diferencia": "Productos hechos a mano",
  "historia": "Fundada en 2020..."
}
```

**Errores:**
- `400`: `marcaId`, `valores` o `diferencia` faltantes

#### PUT /api/esencia

Actualiza la esencia de una marca.

**Request:**
```json
{
  "marcaId": 1,
  "valores": "Calidad, Innovación, Sustentabilidad"
}
```

#### DELETE /api/esencia?marcaId=1

Elimina la esencia de una marca.

---

### 9. Productos

#### GET /api/productos

Obtiene productos (filtrados por `marcaId`).

**Query Parameters:**
- `marcaId` (recomendado): ID de la marca

#### POST /api/productos

Crea un nuevo producto.

**Request:**
```json
{
  "nombre": "Camiseta Polo",
  "precio": 250,
  "descripcion": "Camiseta elegante...",
  "imagen_url": "https://...",
  "activo": 1,
  "marca_id": 1
}
```

#### PUT /api/productos

Actualiza un producto.

#### DELETE /api/productos?id=1

Elimina un producto.

---

#### GET /api/productos/atributos?productoId=1

Obtiene los atributos de un producto.

**Response (200):**
```json
[
  {
    "id": 1,
    "producto_id": 1,
    "nombre": "Color",
    "tipo": "select",
    "opciones": "Rojo, Azul, Verde",
    "requerido": 1,
    "orden": 1
  }
]
```

#### POST /api/productos/atributos

Crea un atributo para un producto.

**Request:**
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

**Tipos válidos:** `text` | `number` | `select` | `color`

#### DELETE /api/productos/atributos?id=1

Elimina un atributo.

---

#### POST /api/productos/import

Importa productos en lote. Acepta Excel (`.xlsx`), CSV, texto libre o URL.

**Request:** `multipart/form-data` con campo `file`, o `{ "url": "https://..." }` en JSON.

**Response (200):**
```json
{ "success": true, "imported": 10, "errors": [] }
```

---

### 10. Configuración del Bot

#### GET /api/config-bot?marcaId=1

Obtiene la configuración del bot de una marca (mensaje de bienvenida).

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "marca_id": 1,
    "mensaje_bienvenida": "¡Hola! 👋 Bienvenido...",
    "created_at": "2026-03-01T00:00:00.000Z"
  }
}
```

#### POST /api/config-bot

Guarda o actualiza la configuración del bot de una marca. Al guardar, escribe un archivo flag `reload_bot_{marcaId}.flag` en el directorio de datos para señalar al bot que recargue su configuración.

**Request:**
```json
{
  "marca_id": 1,
  "mensaje_bienvenida": "¡Hola! 👋 Bienvenido a nuestra tienda."
}
```

---

#### GET /api/config-bot/flow?botId=1

Obtiene la configuración del flujo conversacional de un bot.

**Response (200):**
```json
{
  "bot_id": 1,
  "mensaje_bienvenida": "¡Hola! 👋",
  "mensaje_sin_interes": "Hasta pronto 👋",
  "mensaje_productos": "Aquí nuestros productos:",
  "mensaje_caracteristicas": "Cuéntanos qué características necesitas:",
  "mensaje_confirmacion": "¿Confirmas tu pedido?",
  "mensaje_agradecimiento": "¡Gracias! Te contactaremos pronto.",
  "mostrar_productos_inicio": 1,
  "max_productos_mostrar": 5,
  "permitir_recomendaciones": 1
}
```

#### POST /api/config-bot/flow

Crea o actualiza la configuración de flujo de un bot.

**Request:**
```json
{
  "bot_id": 1,
  "mensaje_bienvenida": "¡Hola! 👋",
  "mostrar_productos_inicio": 1,
  "max_productos_mostrar": 5,
  "permitir_recomendaciones": 1
}
```

---

### 11. Notificaciones

#### GET /api/notificaciones

Obtiene notificaciones del usuario autenticado.

**Query Parameters:**
- `action=count`: retorna solo el contador de no leídas
- `action=unread`: retorna solo las no leídas
- (sin parámetro): retorna todas

**Response `action=count`:**
```json
{ "count": 5 }
```

**Response (lista):**
```json
[
  {
    "id": 1,
    "usuario_id": 1,
    "tipo": "nuevo_lead",
    "titulo": "Nuevo Lead",
    "mensaje": "Lead interesado en 'Producto X' - usuario@email.com",
    "lead_id": 10,
    "bot_id": 2,
    "leida": 0,
    "created_at": "2026-03-04T10:30:00Z"
  }
]
```

**Tipos de notificación:** `nuevo_lead` | `lead_actualizado` | `nuevo_bot` | `sistema`

#### POST /api/notificaciones

Marca todas las notificaciones como leídas, o crea una notificación manual (Solo Super Admin).

**Marcar todas leídas:**
```json
{ "action": "mark_all_read" }
```

**Crear notificación (solo super_admin):**
```json
{
  "tipo": "sistema",
  "titulo": "Mantenimiento programado",
  "mensaje": "El sistema estará en mantenimiento el sábado",
  "lead_id": null,
  "bot_id": null
}
```

#### PATCH /api/notificaciones/{id}

Marca una notificación específica como leída.

#### DELETE /api/notificaciones/{id}

Elimina una notificación (Solo Super Admin).

---

### 12. Campañas

#### GET /api/campaigns

Obtiene campañas según el rol del usuario.

**Query Parameters:**
- `botId` (opcional): filtrar por bot

**Response (200):**
```json
[
  {
    "id": 1,
    "nombre": "Campaña Verano",
    "mensaje": "¡Aprovecha nuestras ofertas de verano!",
    "categoria_filter": "hot",
    "bot_id": 1,
    "programada_para": "2026-06-01T10:00:00.000Z",
    "ejecutada": 0,
    "created_at": "2026-05-18T00:00:00.000Z"
  }
]
```

#### POST /api/campaigns

Crea una nueva campaña.

**Request:**
```json
{
  "nombre": "Campaña Verano",
  "mensaje": "¡Aprovecha nuestras ofertas!",
  "categoria_filter": "hot",
  "bot_id": 1,
  "programada_para": "2026-06-01T10:00:00.000Z"
}
```

**Validaciones:**
- `nombre` y `mensaje` son requeridos
- Para managers: `bot_id` es requerido y debe ser un bot asignado al manager

#### PATCH /api/campaigns

Ejecuta todas las campañas pendientes cuya fecha programada ya llegó. Solo Super Admin.

Marca cada campaña como `ejecutada = 1`. La ejecución real del envío se realiza mediante el script `bot/scripts/run_campaigns.py`.

**Response (200):**
```json
{ "processed": [...], "count": 3 }
```

---

#### GET /api/campaigns/{id}

Obtiene una campaña específica por ID.

#### PATCH /api/campaigns/{id}

Actualiza o ejecuta una campaña específica.

#### DELETE /api/campaigns/{id}

Elimina una campaña.

---

### 13. Analytics

#### GET /api/analytics/overview

Retorna métricas agregadas del sistema para el dashboard de analytics.

**Query Parameters:**
- `marcaId` (opcional, solo super_admin): filtrar por marca
- `productoId` (opcional): filtrar categorías por producto

**Permisos:**
- `manager`: datos filtrados por sus bots asignados
- `super_admin`: todos los datos (o filtrados por `marcaId`)

**Response (200):**
```json
{
  "totalLeads": 156,
  "leadsByCategory": [
    { "categoria": "hot", "count": 35 },
    { "categoria": "warm", "count": 80 },
    { "categoria": "cold", "count": 41 }
  ],
  "leadsByBot": [
    { "bot_nombre": "Bot Principal", "count": 90 },
    { "bot_nombre": "Bot Secundario", "count": 66 }
  ],
  "leadsByDay": [
    { "day": "2026-05-12", "count": 8 },
    { "day": "2026-05-13", "count": 12 }
  ],
  "popularProducts": [
    { "nombre": "Camiseta Polo", "count": 45 },
    { "nombre": "Pants Deportivo", "count": 28 }
  ]
}
```

---

## Resumen de Endpoints

| Método | Ruta | Descripción | Rol mínimo |
|--------|------|-------------|-----------|
| POST | `/api/login` | Iniciar sesión | Público |
| POST | `/api/registro` | Registrar manager + marca | Público |
| GET/POST/PUT/DELETE | `/api/bots` | CRUD de bots | super_admin |
| GET/POST/PUT/DELETE | `/api/usuarios` | CRUD de usuarios | super_admin |
| GET | `/api/usuarios/{id}/bots` | Bots de un usuario | super_admin |
| GET/POST/DELETE | `/api/accesos` | Asignación bot-usuario | super_admin |
| GET/POST/PATCH/DELETE | `/api/leads` | CRUD de leads | manager |
| GET/POST/PUT/DELETE | `/api/clientes` | CRUD de clientes | manager |
| POST | `/api/clientes/import` | Importar clientes | manager |
| GET | `/api/marcas` | Listar marcas | manager |
| GET/POST/PUT/DELETE | `/api/esencia` | Esencia de marca | manager |
| GET/POST/PUT/DELETE | `/api/productos` | CRUD de productos | manager |
| GET/POST/DELETE | `/api/productos/atributos` | Atributos de productos | manager |
| POST | `/api/productos/import` | Importar productos | manager |
| GET/POST | `/api/config-bot` | Config. de bienvenida | manager |
| GET/POST | `/api/config-bot/flow` | Config. flujo conversacional | manager |
| GET/POST/PATCH/DELETE | `/api/notificaciones` | Sistema de notificaciones | manager |
| GET/POST/PATCH | `/api/campaigns` | Campañas masivas | manager |
| GET/PATCH/DELETE | `/api/campaigns/{id}` | Campaña específica | manager |
| GET | `/api/analytics/overview` | Métricas agregadas | manager |

---

## Ejemplos con cURL

### Login

```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"correo": "admin@laida.com", "password": "admin123"}'
```

### Crear Bot

```bash
curl -X POST http://localhost:3000/api/bots \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <tu-token>" \
  -d '{"nombre": "Mi Bot", "slug": "mi-bot", "telegram_token": "123:ABC", "estado": "activo"}'
```

### Listar Leads

```bash
curl "http://localhost:3000/api/leads?estado=nuevo" \
  -H "Authorization: Bearer <tu-token>"
```

### Registrar Manager

```bash
curl -X POST http://localhost:3000/api/registro \
  -H "Content-Type: application/json" \
  -d '{
    "nombreMarca": "Marca Demo",
    "correoEmpresa": "ventas@marca.com",
    "nombreRepresentante": "Mariana",
    "numero": "+57 300 000 0000",
    "correoPersonal": "mariana@marca.com",
    "password": "secreto123"
  }'
```

### Asignar Bot

```bash
curl -X POST http://localhost:3000/api/accesos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <tu-token>" \
  -d '{"usuarioId": 2, "botId": 1}'
```

### Analytics Overview

```bash
curl "http://localhost:3000/api/analytics/overview" \
  -H "Authorization: Bearer <tu-token>"
```

---

## Ejemplos con JavaScript/Fetch

### Login y guardar token

```javascript
const login = async () => {
  const response = await fetch('http://localhost:3000/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo: 'admin@laida.com', password: 'admin123' }),
  })
  const data = await response.json()
  if (data.success) {
    localStorage.setItem('token', data.token)
    localStorage.setItem('usuario', JSON.stringify(data.usuario))
  }
  return data
}
```

### Request autenticado

```javascript
const getBots = async () => {
  const token = localStorage.getItem('token')
  const response = await fetch('http://localhost:3000/api/bots', {
    headers: { 'Authorization': `Bearer ${token}` },
  })
  return await response.json()
}
```

### Crear campaña

```javascript
const createCampaign = async () => {
  const token = localStorage.getItem('token')
  const response = await fetch('http://localhost:3000/api/campaigns', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      nombre: 'Campaña Verano',
      mensaje: '¡Aprovecha nuestras ofertas de verano!',
      categoria_filter: 'hot',
      bot_id: 1,
    }),
  })
  return await response.json()
}
```

---

## Códigos de Estado HTTP

| Código | Significado |
|--------|-------------|
| `200` | OK |
| `201` | Creado |
| `400` | Request inválido |
| `401` | No autenticado |
| `403` | No autorizado (sin permisos) |
| `404` | No encontrado |
| `500` | Error del servidor |

---

## Manejo de Errores

Todas las APIs retornan errores en este formato:

```json
{
  "error": "Descripción del error",
  "success": false
}
```

```javascript
try {
  const response = await fetch('/api/bots', options)
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Error desconocido')
  return data
} catch (error) {
  console.error('Error:', error.message)
}
```

---

## Notas de Seguridad

- Los tokens actualmente son simples (base64). En producción usar JWT.
- Las contraseñas se almacenan en texto plano actualmente. Implementar bcrypt antes de producción.
- No hay rate limiting. Agregar en producción.
- CORS está habilitado por defecto en Next.js.

---

Para la especificación OpenAPI completa, abre Swagger UI en [http://localhost:8080](http://localhost:8080) con el servidor en ejecución.
