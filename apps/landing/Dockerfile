# Stage 1: Build
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy root workspace configuration
COPY package.json bunfig.toml turbo.json ./

# Copy workspace package.json files for dependency resolution
COPY apps/landing/package.json ./apps/landing/
COPY packages/shared/package.json ./packages/shared/

# Install all dependencies (monorepo)
RUN bun install --frozen-lockfile

# Copy source code
COPY apps/landing ./apps/landing
COPY packages/shared ./packages/shared

# Build the landing page (static export)
WORKDIR /app/apps/landing
RUN bun run build

# Stage 2: Serve static files with nginx
FROM nginx:1.27-alpine AS runner

# Copy static export
COPY --from=builder /app/apps/landing/out /usr/share/nginx/html

# Copy nginx config for SPA/client-side routing support
COPY apps/landing/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
