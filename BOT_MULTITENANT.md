# 🚀 Sistema Multi-Tenant de Bots - LAIDA

## ¿Qué es Multi-Tenant?

En LAIDA, cada **super admin** puede crear múltiples bots, y cada bot:
- Tiene su propio **Token de Telegram** único
- Tiene su propia **API Key de OpenAI** (opcional)
- Se ejecuta de forma independiente
- Captura sus propios leads

**No hay configuración global.** Todo se gestiona por bot desde el dashboard.

## 📊 Arquitectura

```
Super Admin Dashboard
    ├─ Bot 1 (Tienda de Ropa)
    │   ├─ telegram_token: 123456:ABC...
    │   ├─ openai_key: sk-proj-...
    │   └─ Leads: 45
    │
    ├─ Bot 2 (Restaurante)
    │   ├─ telegram_token: 789012:DEF...
    │   ├─ openai_key: sk-proj-...
    │   └─ Leads: 32
    │
    └─ Bot 3 (Gimnasio)
        ├─ telegram_token: 345678:GHI...
        ├─ openai_key: null (modo básico)
        └─ Leads: 18
```

## 🎯 Flujo Completo

### 1. Super Admin Crea Bot

Desde el dashboard:
1. Ir a **"Bots"** → **"Crear Nuevo Bot"**
2. Llenar formulario:
   - **Nombre**: Nombre descriptivo (ej: "Bot Tienda X")
   - **Slug**: Identificador único (ej: "tienda-x")
   - **Token de Telegram**: Obtener de @BotFather
   - **OpenAI API Key**: (Opcional) Para habilitar GPT
   - **Manager**: Asignar a un usuario manager (opcional)

3. Click **"Guardar"**

El bot queda guardado en la tabla `bots` con toda su configuración.

### 2. Ejecutar el Bot

En el servidor, ejecutar:

```bash
cd bot
python3 bot_launcher.py <bot_id>
```

**Ejemplo:**
```bash
# Ejecutar bot con ID 1
python3 bot_launcher.py 1
```

### 3. ¿Qué Hace bot_launcher.py?

1. **Lee la configuración del bot** desde la base de datos
2. **Valida** que el bot exista y esté activo
3. **Verifica** que tenga telegram_token configurado
4. **Decide qué bot ejecutar**:
   - Si tiene `openai_key` → Ejecuta bot con GPT 🧠
   - Si NO tiene `openai_key` → Ejecuta bot básico 🤖
5. **Inicia el bot** con su configuración específica

### 4. Salida Esperada

```bash
$ python3 bot_launcher.py 1

🔍 Cargando configuración del bot 1...
✅ Bot encontrado: Tienda X (@tienda-x)
   Estado: activo
   Telegram Token: ✅ Configurado
   OpenAI Key: ✅ Configurado (modo GPT)

🧠 Iniciando bot con inteligencia GPT...

🤖 Bot conversacional con GPT en ejecución: Tienda X (ID: 1)
✅ OpenAI API configurada
📊 Base de datos: ../bd/laida.db

⏳ Esperando mensajes...
```

## 🛠️ Configuración del Bot (Dashboard)

### Obtener Token de Telegram

1. Abrir Telegram y buscar **@BotFather**
2. Enviar `/newbot`
3. Seguir instrucciones:
   - Nombre del bot: "Tienda X Bot"
   - Username: "tiendax_bot"
4. @BotFather te da el token: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`
5. **Copiar y pegar** en el campo "Token de Telegram" del dashboard

### Obtener API Key de OpenAI (Opcional)

1. Ir a [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Crear cuenta o iniciar sesión
3. Click en **"Create new secret key"**
4. Copiar la key: `sk-proj-xxxxxxxxxxxxxxxxxx`
5. **Pegar** en el campo "OpenAI API Key" del dashboard

**Nota:** Si no configuras OpenAI, el bot funcionará en **modo básico** (sin inteligencia GPT).

## 💻 Ejecutar Múltiples Bots Simultáneamente

Puedes ejecutar varios bots al mismo tiempo, cada uno en su propia sesión de terminal:

**Terminal 1:**
```bash
python3 bot_launcher.py 1
```

**Terminal 2:**
```bash
python3 bot_launcher.py 2
```

**Terminal 3:**
```bash
python3 bot_launcher.py 3
```

Cada bot:
- Escucha su propio canal de Telegram
- Guarda leads con su `bot_id`
- Usa su propia configuración

## 🐳 Ejecutar con Docker/PM2 (Producción)

### Opción 1: PM2 (Recomendado)

Crear archivo `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: "bot-1",
      script: "bot_launcher.py",
      args: "1",
      interpreter: "python3",
      cwd: "/path/to/LAIDA/bot",
      autorestart: true,
      max_memory_restart: "200M"
    },
    {
      name: "bot-2",
      script: "bot_launcher.py",
      args: "2",
      interpreter: "python3",
      cwd: "/path/to/LAIDA/bot",
      autorestart: true,
      max_memory_restart: "200M"
    }
  ]
}
```

Iniciar todos los bots:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

Ver estado:
```bash
pm2 status
```

### Opción 2: Systemd Services

Crear `/etc/systemd/system/laida-bot-1.service`:

```ini
[Unit]
Description=LAIDA Bot 1
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/LAIDA/bot
Environment="BOT_DB_PATH=../bd/laida.db"
ExecStart=/usr/bin/python3 bot_launcher.py 1
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Habilitar y arrancar:
```bash
sudo systemctl enable laida-bot-1
sudo systemctl start laida-bot-1
sudo systemctl status laida-bot-1
```

## 📋 Comandos Útiles

### Ver logs de un bot (PM2)
```bash
pm2 logs bot-1
```

### Reiniciar un bot
```bash
pm2 restart bot-1
```

### Detener un bot
```bash
pm2 stop bot-1
```

### Ver consumo de recursos
```bash
pm2 monit
```

## 🔍 Troubleshooting

### Error: "No se encontró el bot con id X"

**Causa:** El bot no existe en la base de datos

**Solución:**
1. Verificar en el dashboard que el bot esté creado
2. Confirmar el ID del bot
3. Verificar ruta a la base de datos: `BOT_DB_PATH`

### Error: "El bot no tiene configurado telegram_token"

**Causa:** El bot fue creado sin token de Telegram

**Solución:**
1. Ir al dashboard → Editar Bot
2. Obtener token de @BotFather
3. Pegar en el campo "Token de Telegram"
4. Guardar cambios
5. Reiniciar el bot

### Error: "El bot está en estado 'inactivo'"

**Causa:** El bot fue desactivado desde el dashboard

**Solución:**
1. Ir al dashboard → Editar Bot
2. Cambiar estado a "Activo"
3. Guardar cambios
4. Ejecutar el bot

### Bot se ejecuta pero no responde mensajes

**Posibles causas:**
1. Token de Telegram incorrecto
2. Bot no iniciado con `/start` en Telegram
3. Problema de conectividad

**Solución:**
```bash
# Revisar logs del bot
# Si usas PM2:
pm2 logs bot-1

# Si ejecutas manualmente, verás el error en consola
```

## 🔐 Seguridad

### Protección de Tokens

Los tokens NO deben estar en el código ni en `.env` global:
- ✅ Se guardan en la base de datos
- ✅ Se leen solo cuando se ejecuta el bot
- ✅ Cada bot tiene sus propios tokens
- ✅ Solo super admins pueden ver/editar tokens

### Mejores Prácticas

1. **No compartir tokens** de Telegram ni OpenAI
2. **Rotar tokens** periódicamente
3. **Usar variables de entorno** en producción para `BOT_DB_PATH`
4. **Limitar permisos** de la base de datos
5. **Monitorear logs** para detectar problemas

## 📊 Monitoreo y Analytics

### Ver leads por bot

Desde el dashboard:
1. Ir a **"Leads"**
2. Filtrar por bot específico
3. Ver categorías (hot/warm/cold)
4. Exportar datos

### Ver interacciones

```sql
-- Interacciones del bot 1 en las últimas 24 horas
SELECT tipo, COUNT(*) as total
FROM bot_interacciones
WHERE bot_id = 1 
  AND created_at > datetime('now', '-1 day')
GROUP BY tipo;
```

### Métricas importantes

- **Tasa de conversión**: Leads hot / Total leads
- **Engagement**: Promedio de mensajes por conversación
- **Productos más vistos**: Producto_id más frecuente en interacciones

## 🎓 Resumen

### Antes (Sistema Antiguo ❌)
```
.env
├─ TELEGRAM_TOKEN=global_token
└─ OPENAI_API_KEY=global_key

❌ Solo 1 bot
❌ Configuración hardcodeada
❌ No escalable
```

### Ahora (Sistema Multi-Tenant ✅)
```
Dashboard → Crear Bot
├─ Bot 1: telegram_token_1, openai_key_1
├─ Bot 2: telegram_token_2, openai_key_2
└─ Bot N: telegram_token_n, openai_key_n

Ejecutar:
├─ python3 bot_launcher.py 1
├─ python3 bot_launcher.py 2
└─ python3 bot_launcher.py n

✅ Múltiples bots
✅ Configuración por dashboard
✅ Totalmente escalable
```

## 🚀 Próximos Pasos

1. **Auto-start**: Script que ejecute automáticamente todos los bots activos
2. **Health checks**: Endpoint para verificar que los bots estén corriendo
3. **Webhooks**: Usar webhooks en lugar de polling para mayor eficiencia
4. **Load balancing**: Distribuir bots en múltiples servidores
5. **Dashboard de monitoreo**: Ver estado de bots en tiempo real

---

## 📞 Soporte

Si tienes problemas:
1. Revisar logs del bot
2. Verificar configuración en dashboard
3. Confirmar que el bot esté activo
4. Validar tokens de Telegram y OpenAI

**¿Todo listo?**
```bash
cd bot
python3 bot_launcher.py 1
```

¡Tu bot multi-tenant ya está funcionando! 🎉
