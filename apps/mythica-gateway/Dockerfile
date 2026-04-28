FROM oven/bun:1-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
COPY apps/mythica-api/package.json ./apps/mythica-api/
COPY apps/mythica-front/package.json ./apps/mythica-front/
COPY apps/mythica-gameplay/package.json ./apps/mythica-gameplay/
COPY apps/mythica-gateway/package.json ./apps/mythica-gateway/
COPY apps/mythica-mobile/package.json ./apps/mythica-mobile/
RUN bun install --frozen-lockfile

FROM oven/bun:1-alpine AS runner
WORKDIR /app/apps/mythica-gateway
COPY --from=deps /app/node_modules ../../node_modules
COPY --from=deps /app/apps/mythica-gateway/node_modules ./node_modules
COPY apps/mythica-gateway/src ./src
COPY apps/mythica-gateway/config ./config
COPY apps/mythica-gateway/package.json apps/mythica-gateway/tsconfig.json ./
EXPOSE 2100 2150
CMD ["bun", "--preload", "./src/env.ts", "src/index.ts"]
