FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.8.1 --activate

# --- Dependencies ---
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/admin/package.json ./apps/admin/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile

# --- Build ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/admin/node_modules ./apps/admin/node_modules
COPY . .
WORKDIR /app/apps/admin
# Render passes env vars as build-time ARGs for Docker builds
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
RUN pnpm build

# --- Production ---
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/.next/static ./apps/admin/.next/static

USER nextjs
EXPOSE 10000
ENV PORT=10000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/admin/server.js"]
