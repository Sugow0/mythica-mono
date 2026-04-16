# ─── deps ────────────────────────────────────────────────────────────────────
FROM oven/bun:1 AS deps

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# ─── runner ──────────────────────────────────────────────────────────────────
FROM oven/bun:1 AS runner

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY src ./src
COPY config ./config
COPY package.json tsconfig.json ./

EXPOSE 2100 2150

CMD ["bun", "--preload", "./src/env.ts", "src/index.ts"]
