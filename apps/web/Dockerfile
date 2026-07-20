# Stage 1: Build
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy root workspace configuration
COPY package.json bunfig.toml turbo.json ./

# Copy workspace package.json files for dependency resolution
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

# Install all dependencies (monorepo)
RUN bun install --frozen-lockfile

# Copy source code
COPY apps/web ./apps/web
COPY packages/shared ./packages/shared

# Build the web app (standalone output)
WORKDIR /app/apps/web
RUN bun run build

# Stage 2: Production runtime
FROM oven/bun:1-slim AS runner

WORKDIR /app

# Copy standalone output from builder
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

EXPOSE 3000

CMD ["bun", "run", "apps/web/server.js"]
