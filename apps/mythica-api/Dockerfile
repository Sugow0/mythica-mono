FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
COPY apps/mythica-api/package.json ./apps/mythica-api/
COPY apps/mythica-front/package.json ./apps/mythica-front/
COPY apps/mythica-gameplay/package.json ./apps/mythica-gameplay/
COPY apps/mythica-gateway/package.json ./apps/mythica-gateway/
COPY apps/mythica-mobile/package.json ./apps/mythica-mobile/
RUN bun install --frozen-lockfile
COPY apps/mythica-api/prisma ./apps/mythica-api/prisma
RUN cd apps/mythica-api && bunx prisma generate

FROM oven/bun:1 AS runner
WORKDIR /app/apps/mythica-api
COPY --from=deps /app/node_modules ../../node_modules
COPY --from=deps /app/apps/mythica-api/node_modules ./node_modules
COPY --from=deps /app/apps/mythica-api/generated ./generated
COPY apps/mythica-api/prisma ./prisma
COPY apps/mythica-api/src ./src
COPY apps/mythica-api/config ./config
COPY apps/mythica-api/package.json ./
EXPOSE 3200 3250
CMD ["bun", "--preload", "./src/env.ts", "src/index.ts"]
