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
COPY apps/mythica-api/prisma ./apps/mythica-api/prisma
RUN cd apps/mythica-api && bunx prisma generate

FROM oven/bun:1-alpine AS runner
WORKDIR /app/apps/mythica-api
COPY --from=deps /app/node_modules ../../node_modules
COPY --from=deps /app/apps/mythica-api/node_modules ./node_modules
COPY --from=deps /app/apps/mythica-api/generated ./generated
COPY apps/mythica-api/prisma ./prisma
COPY apps/mythica-api/src ./src
COPY apps/mythica-api/config ./config
COPY apps/mythica-api/package.json ./

LABEL org.opencontainers.image.title="mythica-api" \
      org.opencontainers.image.description="API plateforme Mythica (Elysia · Bun · Prisma)" \
      org.opencontainers.image.source="https://github.com/tengram-labs/mythica-mono" \
      org.opencontainers.image.version="1.0.50"

EXPOSE 3200 3250

# Exécution en utilisateur non-root (fourni par l'image oven/bun)
USER bun

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:3200/health || exit 1

CMD ["bun", "--preload", "./src/env.ts", "src/index.ts"]
