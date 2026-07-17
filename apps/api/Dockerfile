# ── Stage 1: builder ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
# Prisma schema must be present before `npm ci` so that the @prisma/client
# postinstall hook (`prisma generate`) can generate the typed client.
COPY prisma ./prisma
# openssl CLI is required so that Prisma's platform detection can run
# `openssl version` and select the linux-musl-openssl-3.0.x engine binary
# (which links against libssl.so.3 present on node:20-alpine).  Without it,
# detection falls back to linux-musl (OpenSSL 1.1), absent on Alpine 3.18+.
RUN apk add --no-cache openssl && npm ci

COPY . .
RUN npm run build

# Remove devDependencies in-place so we can copy a lean node_modules to the
# runner stage (avoids a second `npm install` which would re-trigger husky).
RUN npm prune --omit=dev

# ── Stage 2: runner ───────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# curl is required for the HEALTHCHECK below.
# openssl CLI enables Prisma's platform detection to choose the correct engine
# binary (linux-musl-openssl-3.0.x) at startup; libssl.so.3 is already present.
RUN apk add --no-cache curl openssl

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package*.json ./

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:${PORT:-3000}/health || exit 1

CMD ["node", "dist/src/main"]
