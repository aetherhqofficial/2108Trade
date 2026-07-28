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

# Copy worker source files (needed for background job processing)
COPY --from=builder /app/apps/web/src/worker.ts ./apps/web/src/worker.ts
COPY --from=builder /app/apps/web/src/lib/queue.ts ./apps/web/src/lib/queue.ts
COPY --from=builder /app/apps/web/src/lib/queue/jobs.ts ./apps/web/src/lib/queue/jobs.ts
COPY --from=builder /app/apps/web/src/lib/storage.ts ./apps/web/src/lib/storage.ts
COPY --from=builder /app/apps/web/tsconfig.json ./apps/web/tsconfig.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY apps/web/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

EXPOSE 3000

ENTRYPOINT ["/app/entrypoint.sh"]
