# Dockerfile pentru Wind Warning - Next.js App
FROM node:18-alpine AS base

# Instalare dependențe pentru build
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copiere fișiere package pentru instalare dependențe
COPY package.json package-lock.json* ./
RUN npm ci

# Build aplicația
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Dezactivare telemetrie Next.js
ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Imagine de producție - rulare aplicație
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiere fișiere build
COPY --from=builder /app/public ./public

# Set correct permissions for prerender cache
RUN mkdir -p .next
RUN chown nextjs:nodejs .next

# Copy next build
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
