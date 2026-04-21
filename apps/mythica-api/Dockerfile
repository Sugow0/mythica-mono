FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json ./
RUN bun install --production
COPY prisma ./prisma
RUN bunx prisma generate

FROM oven/bun:1 AS runner
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/generated ./generated
COPY prisma ./prisma
COPY src ./src
COPY config ./config
COPY package.json ./
EXPOSE 3200 3250
CMD ["bun", "--preload", "./src/env.ts", "src/index.ts"]
