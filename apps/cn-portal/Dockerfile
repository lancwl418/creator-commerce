FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.8.1 --activate

# --- Dependencies ---
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/cn-portal/package.json ./apps/cn-portal/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile

# --- Build ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/ ./
COPY . .
WORKDIR /app/apps/cn-portal
# Render passes env vars as build-time ARGs for Docker builds.
# NEXT_PUBLIC_* must be present at build time for Next.js to inline them.
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

COPY --from=builder --chown=nextjs:nodejs /app/apps/cn-portal/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/cn-portal/.next/static ./apps/cn-portal/.next/static
# Next.js standalone output does NOT bundle public/; copy it explicitly.
COPY --from=builder --chown=nextjs:nodejs /app/apps/cn-portal/public ./apps/cn-portal/public

USER nextjs
EXPOSE 10000
ENV PORT=10000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/cn-portal/server.js"]
