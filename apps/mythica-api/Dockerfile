# ─── deps ────────────────────────────────────────────────────────────────────
FROM oven/bun:1 AS deps

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY prisma ./prisma
RUN bunx prisma generate

# ─── runner ──────────────────────────────────────────────────────────────────
FROM oven/bun:1 AS runner

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY --from=deps /app/generated ./generated
COPY src ./src
COPY config ./config
COPY package.json tsconfig.json ./

EXPOSE 3200 3250

CMD ["bun", "--preload", "./src/env.ts", "src/index.ts"]
