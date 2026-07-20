#!/usr/bin/env bash
set -euo pipefail

# ── 2108Trade Database Restore Script ────────────────────────────────────
# Restores a gzipped pg_dump backup. Drops and recreates the target database.
#
# Usage:
#   ./restore.sh <backup-file.sql.gz>            # interactive (asks confirm)
#   ./restore.sh <backup-file.sql.gz> --force    # non-interactive (CI)
#
# Environment variables:
#   DB_HOST      — PostgreSQL host (default: localhost)
#   DB_PORT      — PostgreSQL port (default: 5432)
#   DB_USER      — PostgreSQL superuser (default: 2108trade)
#   DB_NAME      — PostgreSQL database (default: 2108trade)
#   DB_PASSWORD  — PostgreSQL password (required)

# ── Parse arguments ───────────────────────────────────────────────────────
FORCE=false
BACKUP_FILE=""

for arg in "$@"; do
  case "$arg" in
    --force|-f)
      FORCE=true
      ;;
    *)
      if [ -z "$BACKUP_FILE" ]; then
        BACKUP_FILE="$arg"
      fi
      ;;
  esac
done

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup-file.sql.gz> [--force]"
  echo ""
  echo "  backup-file  Path to a gzipped pg_dump (.sql.gz)"
  echo "  --force      Skip confirmation prompt (for CI/automation)"
  exit 1
fi

# ── Configuration ─────────────────────────────────────────────────────────
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-2108trade}"
DB_NAME="${DB_NAME:-2108trade}"
DB_PASSWORD="${DB_PASSWORD:-}"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

# ── Pre-flight ────────────────────────────────────────────────────────────
if [ -z "$DB_PASSWORD" ]; then
  log "ERROR: DB_PASSWORD is required"
  exit 1
fi

if ! command -v psql &>/dev/null; then
  log "ERROR: psql not found. Install postgresql-client."
  exit 1
fi

if ! command -v gunzip &>/dev/null; then
  log "ERROR: gunzip not found."
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  log "ERROR: Backup file not found: $BACKUP_FILE"
  exit 1
fi

BACKUP_SIZE="$(du -h "$BACKUP_FILE" | cut -f1)"
log "Restore target: $BACKUP_FILE ($BACKUP_SIZE)"
log "Target database: $DB_NAME@$DB_HOST:$DB_PORT"

# ── Confirmation ──────────────────────────────────────────────────────────
if [ "$FORCE" = false ]; then
  echo ""
  echo "⚠️  WARNING: This will DROP and RECREATE database '$DB_NAME'."
  echo "   All existing data will be permanently lost."
  echo "   Backup file: $BACKUP_FILE"
  echo ""
  read -r -p "Type 'yes' to confirm restore: " CONFIRM
  if [ "$CONFIRM" != "yes" ]; then
    log "Restore cancelled."
    exit 0
  fi
fi

export PGPASSWORD="$DB_PASSWORD"

# ── Drop & Recreate Database ──────────────────────────────────────────────
log "Dropping database '$DB_NAME' (if exists)..."
psql \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --username="$DB_USER" \
  --dbname=postgres \
  --command="DROP DATABASE IF EXISTS \"$DB_NAME\";" 2>&1

log "Creating database '$DB_NAME'..."
psql \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --username="$DB_USER" \
  --dbname=postgres \
  --command="CREATE DATABASE \"$DB_NAME\";" 2>&1

# ── Restore ───────────────────────────────────────────────────────────────
log "Restoring from $BACKUP_FILE..."

gunzip -c "$BACKUP_FILE" | psql \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --username="$DB_USER" \
  --dbname="$DB_NAME" \
  --set=ON_ERROR_STOP=1 \
  2>&1

RESTORE_EXIT="${PIPESTATUS[0]}"

if [ "$RESTORE_EXIT" -ne 0 ]; then
  log "ERROR: Restore failed with exit code $RESTORE_EXIT"
  unset PGPASSWORD
  exit 1
fi

log "Restore complete. Database '$DB_NAME' restored from $BACKUP_FILE"
unset PGPASSWORD
