# Rollback Strategy

## Docker Images

To roll back to a previous version:

```bash
# List available image tags
docker image ls ghcr.io/aetherhqofficial/2108trade-web --format "{{.Tag}}"

# Roll back to specific version
VERSION=v0.1.0
docker compose down
export WEB_IMAGE_TAG=$VERSION
docker compose up -d

# Verify health
curl -s http://localhost:3000/api/health | jq .
```

## Database Migrations

Drizzle migrations are forward-only by default. To roll back:

```bash
# Option 1: Restore from backup (preferred)
cd /home/agent-lead/2108Trade
bash scripts/restore.sh --force

# Option 2: Create a rollback migration
cd apps/web
# Create a new migration that reverses the change
bun run db:generate  # after reverting schema changes
bun run db:migrate
```

## Health Verification

After any rollback, verify:

```bash
# 1. Web app health
curl -s http://localhost:3000/api/health | jq .

# 2. Landing page health
curl -s http://localhost:3001/api/health | jq .

# 3. AI service health
curl -s http://localhost:8001/api/v1/health | jq .

# 4. Quant service health
curl -s http://localhost:8002/api/quant/health | jq .

# 5. Database connectivity
docker compose exec postgres pg_isready -U 2108trade -d 2108trade

# 6. Redis connectivity
docker compose exec redis redis-cli ping
```

## Emergency Procedure

If a deployment causes critical issues:

1. **Stop all services:** `docker compose down`
2. **Restore database:** `bash scripts/restore.sh --force`
3. **Pin previous version:** `export WEB_IMAGE_TAG=<last-stable-tag>`
4. **Redeploy:** `docker compose up -d`
5. **Verify:** Run health checks from above
6. **Monitor:** Check Grafana dashboards for error rates
