# 2108Trade — Production Deployment Guide

This guide covers deploying 2108Trade in production with TLS termination,
database backups, and monitoring.

## Prerequisites

- **Docker** 24+ and **Docker Compose** v2+
- A **domain name** pointing to your server
- **Port 80** and **443** open in your firewall
- (Optional) **certbot** for Let's Encrypt certificates

## Quick Start

```bash
# Clone the repository
git clone https://github.com/aetherhqofficial/2108Trade.git
cd 2108Trade

# Copy and configure environment
cp .env.example .env
# Edit .env — set strong passwords, encryption key, etc.

# Generate SSL certificates (see TLS section below)
# Start everything
docker compose --profile full up -d
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_USER` | `2108trade` | PostgreSQL user |
| `POSTGRES_PASSWORD` | `2108trade` | PostgreSQL password (**change this!**) |
| `POSTGRES_DB` | `2108trade` | PostgreSQL database name |
| `ENCRYPTION_KEY` | — | AES-256-GCM key for broker credential encryption |
| `OLLAMA_MODEL` | `llama3.1:8b` | LLM model for AI service |
| `LOG_LEVEL` | `info` | Logging level (debug, info, warn, error) |
| `NODE_ENV` | `production` | Node environment |

## TLS Configuration

### Option 1: Let's Encrypt (Recommended)

1. Set up certbot to obtain certificates for your domain
2. Place the certificates:
   ```bash
   sudo cp /etc/letsencrypt/live/your-domain/fullchain.pem nginx/certs/fullchain.pem
   sudo cp /etc/letsencrypt/live/your-domain/privkey.pem nginx/certs/privkey.pem
   ```
3. Start the TLS proxy:
   ```bash
   docker compose --profile tls up -d nginx
   ```

4. Set up auto-renewal cron (on the host):
   ```bash
   # Run certbot renew twice daily
   0 0,12 * * * certbot renew --quiet --post-hook "cp /etc/letsencrypt/live/your-domain/fullchain.pem /path/to/nginx/certs/fullchain.pem && cp /etc/letsencrypt/live/your-domain/privkey.pem /path/to/nginx/certs/privkey.pem && docker compose --profile tls restart nginx"
   ```

### Option 2: Existing Certificates

Place your `fullchain.pem` and `privkey.pem` in `nginx/certs/` and start nginx:

```bash
docker compose --profile tls up -d nginx
```

### Option 3: Development (Self-Signed)

For local development only:

```bash
# Generate self-signed certs
./scripts/generate-dev-certs.sh

# Copy to the expected dev path or use nginx.dev.conf
docker compose --profile tls up -d nginx
```

Note: for development, replace the nginx config mount with `nginx.dev.conf`.

## Database Backups

### Automated Backups

The `backup-cron` container runs daily at 2:00 AM UTC, creating timestamped
gzipped dumps in the `backup_data` volume.

```bash
# View backup logs
docker compose logs backup-cron

# List backups in the volume
docker compose exec backup-cron ls -lh /backups
```

### Manual Backup

```bash
# With the stack running:
docker compose exec backup-cron /usr/local/bin/backup.sh

# Or from the host (with postgres port exposed):
DB_HOST=localhost DB_USER=2108trade DB_NAME=2108trade DB_PASSWORD=<your-pw> ./scripts/backup.sh
```

### Restore from Backup

```bash
# Copy a backup file from the volume to the host
docker compose cp backup-cron:/backups/2108trade_2026-07-20_020000.sql.gz ./restore.sql.gz

# Restore (interactive — drops and recreates the database)
DB_HOST=localhost DB_USER=2108trade DB_NAME=2108trade DB_PASSWORD=<your-pw> \
  ./scripts/restore.sh ./restore.sql.gz

# Or non-interactive (for scripts/CI):
DB_HOST=localhost DB_USER=2108trade DB_NAME=2108trade DB_PASSWORD=<your-pw> \
  ./scripts/restore.sh ./restore.sql.gz --force
```

### Backup Retention

- **Daily backups**: last 7 are kept
- **Weekly backups**: last 4 distinct ISO weeks are kept
- Older backups are automatically pruned after each backup run

Configure via env vars: `RETENTION_DAILY` (default: 7), `RETENTION_WEEKLY` (default: 4).

## Monitoring Stack

Start with monitoring:

```bash
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d
```

This adds Prometheus, Grafana, and node-exporter. See `docker-compose.monitoring.yml`
for service definitions.

## Security Hardening Checklist

- [ ] Change all default passwords in `.env`
- [ ] Set a strong `ENCRYPTION_KEY` (generate with `openssl rand -hex 32`)
- [ ] Enable TLS in production (`--profile tls`)
- [ ] Use a firewall to restrict direct access to PostgreSQL/Redis ports
- [ ] Set up regular backup verification (restore to staging, verify data)
- [ ] Enable Docker content trust: `export DOCKER_CONTENT_TRUST=1`
- [ ] Regularly update base images: `docker compose pull`
- [ ] Review nginx rate limiting settings for your traffic patterns
- [ ] Use a secrets manager for production credentials (not `.env` files)

## Troubleshooting

### Postgres won't start
```bash
docker compose logs postgres
# Check if the data directory is corrupted or permissions are wrong
```

### Backup cron not running
```bash
docker compose logs backup-cron
# Check crond is running:
docker compose exec backup-cron ps aux | grep crond
# Trigger a manual backup:
docker compose exec backup-cron /usr/local/bin/backup.sh
```

### TLS certificate errors
```bash
# Verify certificates exist and match
docker compose exec nginx ls -la /etc/nginx/certs/
# Check nginx config
docker compose exec nginx nginx -t
```

### Cannot connect to database from host
The `postgres` service exposes port 5432 by default. If you changed `POSTGRES_PORT`,
connect on that port instead. Ensure no firewall blocks the connection.

## Architecture

```
                       ┌──────────────────────────────┐
                       │          Internet            │
                       └──────────────┬───────────────┘
                                      │ :80, :443
                       ┌──────────────▼───────────────┐
                       │    Nginx (TLS Termination)   │
                       │    - TLS 1.2+ / strong       │
                       │      ciphers                 │
                       │    - HTTP → HTTPS redirect   │
                       │    - Rate limiting           │
                       │    - Proxy headers           │
                       └──┬────────────┬──────────────┘
                          │            │
               ┌──────────▼──┐  ┌──────▼──────────┐
               │   Landing   │  │   Web App        │
               │   :3000     │  │   :3000          │
               └─────────────┘  └──────┬───────────┘
                                       │
                          ┌────────────┼────────────┐
                          │            │            │
                   ┌──────▼──┐  ┌──────▼──┐  ┌──────▼──────┐
                   │PostgreSQL│  │  Redis   │  │Backup Cron  │
                   │  :5432   │  │  :6379   │  │ daily@2am   │
                   └──────────┘  └──────────┘  └─────────────┘
```
