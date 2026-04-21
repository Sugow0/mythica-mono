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
COPY package.json bun.lock ./
COPY apps/mythica-front/package.json ./apps/mythica-front/
COPY apps/mythica-api/package.json ./apps/mythica-api/
COPY apps/mythica-gameplay/package.json ./apps/mythica-gameplay/
COPY apps/mythica-gateway/package.json ./apps/mythica-gateway/
COPY apps/mythica-mobile/package.json ./apps/mythica-mobile/
RUN bun install --frozen-lockfile --production

FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=builder /app/apps/mythica-front/build ./build
COPY --from=prod-deps /app/apps/mythica-front/node_modules ./node_modules
COPY apps/mythica-front/package.json ./
EXPOSE 3000
CMD ["node", "build/index.js"]
