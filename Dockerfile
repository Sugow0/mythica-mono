# Stage 1 — Build
FROM oven/bun:1-alpine AS builder

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

# Stage 2 — Production dependencies
FROM oven/bun:1-alpine AS prod-deps

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# Stage 3 — Runner
FROM node:22-alpine AS runner

WORKDIR /app

COPY --from=builder /app/build ./build
COPY --from=prod-deps /app/node_modules ./node_modules
COPY package.json ./

EXPOSE 3000

CMD ["node", "build/index.js"]
