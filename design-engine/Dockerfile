FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.8.1 --activate

# --- Dependencies ---
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY design-engine/package.json ./design-engine/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile

# --- Build ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/design-engine/node_modules ./design-engine/node_modules
COPY . .
WORKDIR /app/design-engine
RUN pnpm build

# --- Production ---
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/design-engine/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/design-engine/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/design-engine/.next/static ./design-engine/.next/static

USER nextjs
EXPOSE 3001
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

CMD ["node", "design-engine/server.js"]
