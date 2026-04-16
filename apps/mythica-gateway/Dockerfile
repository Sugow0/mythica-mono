FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
COPY apps/mythica-gateway/package.json ./apps/mythica-gateway/
RUN bun install --frozen-lockfile

FROM oven/bun:1 AS runner
WORKDIR /app/apps/mythica-gateway
COPY --from=deps /app/node_modules ../../node_modules
COPY --from=deps /app/apps/mythica-gateway/node_modules ./node_modules
COPY apps/mythica-gateway/src ./src
COPY apps/mythica-gateway/config ./config
COPY apps/mythica-gateway/package.json apps/mythica-gateway/tsconfig.json ./
EXPOSE 2100 2150
CMD ["bun", "--preload", "./src/env.ts", "src/index.ts"]
