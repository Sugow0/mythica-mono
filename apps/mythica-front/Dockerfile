FROM oven/bun:1-alpine AS builder
WORKDIR /app
COPY package.json bun.lock ./
COPY apps/mythica-front/package.json ./apps/mythica-front/
COPY apps/mythica-api/package.json ./apps/mythica-api/
COPY apps/mythica-gameplay/package.json ./apps/mythica-gameplay/
COPY apps/mythica-gateway/package.json ./apps/mythica-gateway/
COPY apps/mythica-mobile/package.json ./apps/mythica-mobile/
RUN bun install --frozen-lockfile
COPY apps/mythica-front ./apps/mythica-front
WORKDIR /app/apps/mythica-front
RUN bun run build

FROM oven/bun:1-alpine AS prod-deps
WORKDIR /app
COPY apps/mythica-front/package.json ./package.json
COPY apps/mythica-front/bun.lock ./bun.lock
RUN bun install --frozen-lockfile --production

FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=builder /app/apps/mythica-front/build ./build
COPY --from=prod-deps /app/node_modules ./node_modules
COPY apps/mythica-front/package.json ./package.json
COPY apps/mythica-front/tsconfig.json ./tsconfig.json

LABEL org.opencontainers.image.title="mythica-front" \
      org.opencontainers.image.description="Front web Mythica (SvelteKit · Vite)" \
      org.opencontainers.image.source="https://github.com/tengram-labs/mythica-mono" \
      org.opencontainers.image.version="0.0.1"

EXPOSE 3000

# Exécution en utilisateur non-root (fourni par l'image node)
USER node

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "build/index.js"]
