# 🔌 API Reference - LAIDA

Documentación de las APIs disponibles en LAIDA.

## 🔐 Autenticación

Todas las APIs (excepto `/login`) requieren autenticación mediante token Bearer.

```http
Authorization: Bearer <token>
```

---

## 📋 Endpoints

### 1. Authentication

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

### 1.1 Registro (Manager + Marca)

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

Obtiene todos los bots (Super Admin) o bots del manager.

**Headers:**
```
Authorization: Bearer <token>
```

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
    "slug": "ingenieria",
    ...
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

**Response (200):**
```json
{
  "success": true,
  "message": "Bot actualizado exitosamente",
  "bot": {
    "id": 2,
    "nombre": "Bot de Ingeniería Actualizado",
    "estado": "inactivo",
    ...
  }
}
```

#### DELETE /api/bots?id=2

Elimina un bot (Solo Super Admin).

**Response (200):**
```json
{
  "success": true,
  "message": "Bot eliminado exitosamente"
}
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

Crea un nuevo usuario (Solo Super Admin).

**Nota:** este endpoint solo permite crear usuarios con rol `super_admin`.
Los managers deben registrarse con su marca usando `/api/registro`.

**Request:**
```json
{
  "correo": "admin2@laida.com",
  "password": "temporal123",
  "rol": "super_admin",
  "nombre": "Otro Super Admin"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Usuario creado exitosamente",
  "usuario": {
    "id": 3,
    "correo": "admin2@laida.com",
    "rol": "super_admin",
    "nombre": "Otro Super Admin",
    ...
  }
}
```

**Errores:**
- `400`: Email duplicado o rol inválido (no se permite `manager`)

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

### 4. Accesos (Asignación de Bots)

#### GET /api/accesos?usuarioId=2

Obtiene los bots asignados a un usuario.

**Response (200):**
```json
{
  "bots": [
    {
      "id": 1,
      "nombre": "Bot Principal",
      "slug": "default",
      "estado": "activo"
    }
  ]
}
```

#### GET /api/accesos?botId=1

Obtiene los usuarios con acceso a un bot.

**Response (200):**
```json
{
  "usuarios": [
    {
      "id": 2,
      "correo": "manager@empresa.com",
      "rol": "manager",
      "nombre": "Juan Pérez"
    }
  ]
}
```

#### POST /api/accesos

Asigna un bot a un usuario (Solo Super Admin).

**Request:**
```json
{
  "usuarioId": 2,
  "botId": 1
}
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
- `super_admin`: todos los leads.
- `manager`: solo leads de sus bots asignados.

**Query Parameters:**
- `botId` (opcional)
- `estado` (opcional): `nuevo` | `contactado` | `cerrado`

#### POST /api/leads

Crea un lead. Se permiten **leads parciales** (email/teléfono/interés pueden ser `null`) para poder clasificar desde el primer mensaje.

**Request (ejemplo mínimo):**
```json
{
  "bot_id": 1,
  "telegram_user_id": 123456789,
  "categoria": "warm"
}
```

**Request (ejemplo completo):**
```json
{
  "bot_id": 1,
  "bot_slug": "mi-bot",
  "bot_nombre": "Mi Bot",
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

Actualiza un lead existente (por ejemplo, cambiar `estado`). Requiere autenticación y rol `manager` o `super_admin`.

**Request:**
```json
{
  "estado": "contactado"
}
```

#### DELETE /api/leads/{id}

Solo `super_admin`. Actualmente retorna un mensaje (borrado real: próximamente).

---

## 🧪 Ejemplos con cURL

### Login

```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "correo": "admin@laida.com",
    "password": "admin123"
  }'
```

### Crear Bot

```bash
curl -X POST http://localhost:3000/api/bots \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <tu-token>" \
  -d '{
    "nombre": "Mi Bot",
    "slug": "mi-bot",
    "telegram_token": "123:ABC",
    "estado": "activo"
  }'
```

### Listar Bots

```bash
curl http://localhost:3000/api/bots \
  -H "Authorization: Bearer <tu-token>"
```

### Crear Usuario

```bash
curl -X POST http://localhost:3000/api/usuarios \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <tu-token>" \
  -d '{
    "correo": "admin2@laida.com",
    "password": "temporal123",
    "rol": "super_admin",
    "nombre": "Otro Super Admin"
  }'

### Registrar Manager (sin auth)

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
```

### Asignar Bot

```bash
curl -X POST http://localhost:3000/api/accesos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <tu-token>" \
  -d '{
    "usuarioId": 2,
    "botId": 1
  }'
```

---

## 🧪 Ejemplos con JavaScript/Fetch

### Login y guardar token

```javascript
const login = async () => {
  const response = await fetch('http://localhost:3000/api/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      correo: 'admin@laida.com',
      password: 'admin123',
    }),
  })

  const data = await response.json()
  
  if (data.success) {
    localStorage.setItem('token', data.token)
    localStorage.setItem('usuario', JSON.stringify(data.usuario))
  }
  
  return data
}
```

### Hacer request autenticado

```javascript
const getBots = async () => {
  const token = localStorage.getItem('token')
  
  const response = await fetch('http://localhost:3000/api/bots', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })

  return await response.json()
}
```

### Crear bot

```javascript
const createBot = async (botData) => {
  const token = localStorage.getItem('token')
  
  const response = await fetch('http://localhost:3000/api/bots', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(botData),
  })

  return await response.json()
}

// Uso
await createBot({
  nombre: 'Bot de Ventas',
  slug: 'ventas',
  telegram_token: '123:ABC',
  estado: 'activo',
})
```

---

## 🔒 Códigos de Estado HTTP

- `200` - OK
- `201` - Creado
- `400` - Request inválido
- `401` - No autenticado
- `403` - No autorizado (sin permisos)
- `404` - No encontrado
- `500` - Error del servidor

---

## 🚨 Manejo de Errores

Todas las APIs retornan errores en el siguiente formato:

```json
{
  "error": "Descripción del error",
  "success": false
}
```

### Ejemplo de manejo en frontend:

```javascript
try {
  const response = await fetch('/api/bots', options)
  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data.error || 'Error desconocido')
  }
  
  return data
} catch (error) {
  console.error('Error:', error.message)
  toast.error(error.message)
}
```

---

## 📌 Notas

- Los tokens actualmente son simples (base64). En producción usar JWT.
- Las contraseñas se almacenan en texto plano. Implementar bcrypt.
- No hay rate limiting. Agregar en producción.
- CORS está habilitado por defecto en Next.js.

---

Para más detalles, ver [SETUP.md](./SETUP.md)
