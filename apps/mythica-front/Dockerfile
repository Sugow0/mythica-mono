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

FROM node:22-alpine AS runner
WORKDIR /app
RUN corepack enable pnpm
COPY apps/mythica-front/package.json ./
RUN pnpm install --prod --ignore-scripts --shamefully-hoist
COPY --from=builder /app/apps/mythica-front/build ./build
EXPOSE 3000
CMD ["node", "build/index.js"]
