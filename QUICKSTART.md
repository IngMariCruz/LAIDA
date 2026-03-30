# 🚀 Quickstart - LAIDA Multi-Tenant Bot

## ⚡ Inicio Rápido (3 minutos)

### 1. Iniciar el Sistema

```bash
# Desde la raíz del proyecto
docker-compose up --build
```

Espera a que los servicios inicien:
- ✅ Web: http://localhost:3000
- ✅ Bot Manager: Ejecutando en segundo plano

### 2. Primer Login

Abre: http://localhost:3000/login

**Credenciales por defecto:**
```
Correo: admin@laida.com
Contraseña: admin123
```

## 🧩 Precarga demo (Seed)

Cuando LAIDA inicia con una **base de datos vacía**, aplica una precarga demo (idempotente) para que puedas probar el dashboard sin configurar todo desde cero.

La precarga solo se ejecuta si no existen registros en tablas clave (bots/productos/config/esencia). Si ya tienes datos, **no pisa** nada.

### ¿Qué crea?

- 1 manager demo (marca): `demo@laida.com` / `demo123`
- 1 bot demo: **Bot Demo** (slug `bot-demo`) en estado **inactivo**
- Configuración y esencia demo para la marca
- 3 productos demo

### Importante sobre el bot demo

El bot demo se crea con un token placeholder `000000:demo-token` que **no es válido** en Telegram.
Para usarlo, edita el bot en el dashboard y pega el token real de @BotFather, luego actívalo.

### ¿Cómo re-ejecutar la precarga?

Si quieres volver a un estado “como recién instalado”, elimina la base de datos/volúmenes y vuelve a levantar:

```bash
docker-compose down -v
docker-compose up --build
```

### 3. Crear Tu Primer Bot

1. En el dashboard, ve a **"Gestión de Bots"**
2. Click en **"Crear Bot"**
3. Completa:
   - **Nombre**: Mi Primer Bot
   - **ID (slug)**: `primer-bot`
   - **Telegram Token**: [Tu token del BotFather]
   - **Estado**: Activo

4. Guarda

### 4. Registrar un Manager (Marca)

Los **managers se registran** desde la pantalla de registro (el Super Admin no crea managers).

1. Abrir: http://localhost:3000/registro
2. Completar los datos de la marca (nombre de marca, correos, representante, etc.)
3. Crear la cuenta

### 5. Asignar el Bot al Manager

1. Ve a **"Gestión de Accesos"**
2. Click en **"Asignar Bot"**
3. Selecciona:
   - **Manager**: manager@ejemplo.com
   - **Bot**: Mi Primer Bot
4. Click en **"Asignar"**

### 6. Reiniciar Bots

Para que el bot nuevo se ejecute:

```bash
# Detener
docker-compose down

# Iniciar de nuevo
docker-compose up
```

### 7. Probar el Bot

1. Busca tu bot en Telegram
2. Envía: `/start`
3. Sigue el flujo de captura de lead

## 📋 Comandos Útiles

```bash
# Ver logs del bot
docker-compose logs bot -f

# Ver logs del web
docker-compose logs web -f

# Reiniciar solo el bot
docker-compose restart bot

# Detener todo
docker-compose down

# Limpiar y reiniciar
docker-compose down -v
docker-compose up --build
```

## 🔑 Obtener Token de Telegram

1. Busca [@BotFather](https://t.me/botfather) en Telegram
2. Envía: `/newbot`
3. Sigue las instrucciones
4. Copia el **token** que te da
5. Úsalo al crear el bot en LAIDA

## 🐛 Problemas Comunes

### El bot no responde

**Solución:**
```bash
# 1. Ver logs
docker-compose logs bot

# 2. Verificar que el bot esté activo en la BD
# 3. Verificar que el token sea correcto
# 4. Reiniciar
docker-compose restart bot
```

### Veo un bot demo pero no responde

En una base vacía, LAIDA puede precargar un **bot demo** con token placeholder (`000000:demo-token`).
Ese token es inválido: edita el bot y coloca el token real de @BotFather.

### No puedo iniciar sesión

**Solución:**
- Verifica credenciales: `admin@laida.com` / `admin123`
- Limpia localStorage del navegador
- Intenta en modo incógnito

### Errores de base de datos

**Solución:**
```bash
# Limpiar y reiniciar
docker-compose down -v
docker-compose up --build
```

## 📚 Siguientes Pasos

1. **Cambiar contraseña del admin**
   - Ir a Gestión de Usuarios
   - Editar admin@laida.com
   - Cambiar contraseña

2. **Configurar múltiples bots**
   - Crear bot para cada área/producto
   - Asignar managers específicos

3. **Personalizar mensajes**
   - Editar `laidaBot_multitenant.py`
   - Personalizar mensajes de bienvenida
   - Agregar lógica de negocio

4. **Ver leads capturados**
   - Dashboard de Manager
   - Sección "Ver Clientes"

## 🔒 Seguridad

⚠️ **Antes de producción:**

1. Cambiar credenciales por defecto
2. Implementar bcrypt para passwords
3. Usar JWT para tokens
4. Configurar HTTPS
5. Limitar acceso a puertos

## 📞 Soporte

Para más información, consulta [SETUP.md](./SETUP.md)

---

¡Listo! Tu sistema LAIDA está corriendo 🎉
