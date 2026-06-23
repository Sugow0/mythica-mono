FROM oven/bun:1-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
COPY apps/mythica-api/package.json ./apps/mythica-api/
COPY apps/mythica-front/package.json ./apps/mythica-front/
COPY apps/mythica-gameplay/package.json ./apps/mythica-gameplay/
COPY apps/mythica-gateway/package.json ./apps/mythica-gateway/
COPY apps/mythica-mobile/package.json ./apps/mythica-mobile/
COPY packages/character-engine/package.json ./packages/character-engine/
RUN bun install --frozen-lockfile

FROM oven/bun:1-alpine AS runner
WORKDIR /app/apps/mythica-gateway
COPY --from=deps /app/node_modules ../../node_modules
COPY --from=deps /app/apps/mythica-gateway/node_modules ./node_modules
COPY apps/mythica-gateway/src ./src
COPY apps/mythica-gateway/config ./config
COPY apps/mythica-gateway/package.json apps/mythica-gateway/tsconfig.json ./

LABEL org.opencontainers.image.title="mythica-gateway" \
      org.opencontainers.image.description="Gateway applicatif Mythica (Elysia · Bun)" \
      org.opencontainers.image.source="https://github.com/tengram-labs/mythica-mono" \
      org.opencontainers.image.version="1.0.50"

EXPOSE 2100 2150

# Exécution en utilisateur non-root (fourni par l'image oven/bun)
USER bun

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:2100/health || exit 1

CMD ["bun", "--preload", "./src/env.ts", "src/index.ts"]
