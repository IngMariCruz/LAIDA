FROM node:20-slim AS deps
WORKDIR /app
ENV npm_config_build_from_source=true
RUN apt-get update && apt-get install -y --no-install-recommends \
		g++ \
		make \
	python3 \
	python3-setuptools \
	pkg-config \
		libsqlite3-dev \
	&& rm -rf /var/lib/apt/lists/*
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --no-frozen-lockfile

FROM node:20-slim AS builder
WORKDIR /app
ENV npm_config_build_from_source=true
RUN apt-get update && apt-get install -y --no-install-recommends \
		g++ \
		make \
	python3 \
	python3-setuptools \
	pkg-config \
		libsqlite3-dev \
	&& rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable && pnpm rebuild better-sqlite3 && pnpm build

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
EXPOSE 3000
CMD ["pnpm", "start"]
