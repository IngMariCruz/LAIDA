FROM python:3.12-slim
WORKDIR /app
RUN mkdir -p /app/data /app/data/conversations
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

# Dar permisos de ejecución
RUN chmod +x bot_manager.py laidaBot_multitenant.py 2>/dev/null || true

# Variables de entorno
ENV PYTHONUNBUFFERED=1
ENV BOT_DB_PATH=/app/data/laida.db
ENV BOT_CONVERSATIONS_DIR=/app/data/conversations

# Ejecutar el gestor de bots (ejecuta todos los bots activos)
CMD ["python", "bot_manager.py"]
