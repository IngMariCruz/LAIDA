# Dependencies stage - solo instala deps
FROM node:20-slim AS deps
WORKDIR /app
ENV npm_config_build_from_source=true

# Instala herramientas de compilación una sola vez
RUN apt-get update && apt-get install -y --no-install-recommends \
    g++ make python3 python3-setuptools pkg-config libsqlite3-dev \
    && rm -rf /var/lib/apt/lists/*

# Copia solo package files primero (mejor cache)
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --no-frozen-lockfile

# Builder stage - compila Next.js
FROM deps AS builder
WORKDIR /app

# Copia el resto del código
COPY . .

# Rebuild better-sqlite3 y build de Next.js
RUN pnpm rebuild better-sqlite3
RUN pnpm build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
RUN corepack enable && mkdir -p /app/data
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY init-db.js ./init-db.js
EXPOSE 3000
CMD ["sh", "-c", "node init-db.js && pnpm start"]
