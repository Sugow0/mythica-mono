FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
COPY apps/mythica-api/package.json ./apps/mythica-api/
COPY apps/mythica-front/package.json ./apps/mythica-front/
COPY apps/mythica-gameplay/package.json ./apps/mythica-gameplay/
COPY apps/mythica-gateway/package.json ./apps/mythica-gateway/
COPY apps/mythica-mobile/package.json ./apps/mythica-mobile/
RUN bun install --frozen-lockfile

FROM oven/bun:1 AS runner
WORKDIR /app/apps/mythica-gameplay
COPY --from=deps /app/node_modules ../../node_modules
COPY --from=deps /app/apps/mythica-gameplay/node_modules ./node_modules
COPY apps/mythica-gameplay/src ./src
COPY apps/mythica-gameplay/package.json apps/mythica-gameplay/tsconfig.json ./
EXPOSE 3300 3350
CMD ["bun", "--preload", "./src/env.ts", "src/index.ts"]
