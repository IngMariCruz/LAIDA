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

### 3. Crear Tu Primer Bot

1. En el dashboard, ve a **"Gestión de Bots"**
2. Click en **"Crear Bot"**
3. Completa:
   - **Nombre**: Mi Primer Bot
   - **ID (slug)**: `primer-bot`
   - **Telegram Token**: [Tu token del BotFather]
   - **Estado**: Activo

4. Guarda

### 4. Crear un Manager

1. Ve a **"Gestión de Usuarios"**
2. Click en **"Crear Usuario"**
3. Completa:
   - **Correo**: manager@ejemplo.com
   - **Contraseña**: temporal123
   - **Rol**: Manager

### 5. Asignar el Bot

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
