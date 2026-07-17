# ── Stage 1: deps ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

COPY package*.json ./
RUN npm ci

# ── Stage 2: builder ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* vars are inlined into the client bundle at build time, not read
# at container runtime — must be supplied as a build arg. Defaults to the
# in-network service name so browser-side fetches from a page rendered by
# this container still resolve; override at build time for other setups.
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL

RUN npm run build

# ── Stage 3: runner ───────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache curl

ENV NODE_ENV=production

# `output: "standalone"` (next.config.ts) produces a minimal server bundle
# with only the node_modules actually required at runtime.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

USER node

EXPOSE 3000
ENV PORT=3000
# Next.js standalone server.js binds to $HOSTNAME if set. Docker sets
# HOSTNAME to the container's own hostname/IP by default, which is NOT
# reachable via "localhost" from inside the container (breaks the
# HEALTHCHECK below and any in-container curl) — must force 0.0.0.0.
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:${PORT:-3000}/ || exit 1

CMD ["node", "server.js"]
