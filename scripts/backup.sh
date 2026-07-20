#!/usr/bin/env bash
set -euo pipefail

# ── 2108Trade Database Backup Script ─────────────────────────────────────
# Creates timestamped pg_dump → gzip backups. Keeps last 7 daily + last 4
# weekly backups (one per ISO week).
#
# Environment variables:
#   DB_HOST      — PostgreSQL host (default: localhost)
#   DB_PORT      — PostgreSQL port (default: 5432)
#   DB_USER      — PostgreSQL user (default: 2108trade)
#   DB_NAME      — PostgreSQL database (default: 2108trade)
#   DB_PASSWORD  — PostgreSQL password (required)
#   BACKUP_DIR   — Backup output directory (default: ./backups)
#   RETENTION_DAILY  — Number of daily backups to keep (default: 7)
#   RETENTION_WEEKLY — Number of weekly backups to keep (default: 4)

# ── Configuration ─────────────────────────────────────────────────────────
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-2108trade}"
DB_NAME="${DB_NAME:-2108trade}"
DB_PASSWORD="${DB_PASSWORD:-}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAILY="${RETENTION_DAILY:-7}"
RETENTION_WEEKLY="${RETENTION_WEEKLY:-4}"

# ── Pre-flight ────────────────────────────────────────────────────────────
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

if [ -z "$DB_PASSWORD" ]; then
  log "ERROR: DB_PASSWORD is required"
  exit 1
fi

if ! command -v pg_dump &>/dev/null; then
  log "ERROR: pg_dump not found. Install postgresql-client."
  exit 1
fi

if ! command -v gzip &>/dev/null; then
  log "ERROR: gzip not found."
  exit 1
fi

mkdir -p "$BACKUP_DIR"

# ── Create Backup ─────────────────────────────────────────────────────────
TIMESTAMP="$(date '+%Y-%m-%d_%H%M%S')"
BACKUP_FILE="${BACKUP_DIR}/2108trade_${TIMESTAMP}.sql.gz"
WEEK_LABEL="$(date '+%Y-W%V')"

export PGPASSWORD="$DB_PASSWORD"

log "Starting backup of $DB_NAME@$DB_HOST:$DB_PORT → $BACKUP_FILE"

pg_dump \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --username="$DB_USER" \
  --dbname="$DB_NAME" \
  --no-owner \
  --no-acl \
  --compress=0 \
  2>&1 | gzip > "$BACKUP_FILE"

BACKUP_EXIT="${PIPESTATUS[0]}"

if [ "$BACKUP_EXIT" -ne 0 ]; then
  log "ERROR: pg_dump failed with exit code $BACKUP_EXIT"
  rm -f "$BACKUP_FILE"
  exit 1
fi

BACKUP_SIZE="$(du -h "$BACKUP_FILE" | cut -f1)"
log "Backup complete: $BACKUP_FILE ($BACKUP_SIZE)"

# ── Retention: Daily ──────────────────────────────────────────────────────
# Keep only the last N daily backups (by modification time).
log "Applying daily retention: keep latest $RETENTION_DAILY"
DAILY_FILES=($(ls -1t "${BACKUP_DIR}"/2108trade_*.sql.gz 2>/dev/null || true))
COUNT=0
for f in "${DAILY_FILES[@]}"; do
  COUNT=$((COUNT + 1))
  if [ "$COUNT" -gt "$RETENTION_DAILY" ]; then
    log "Removing old daily backup: $f"
    rm -f "$f"
  fi
done

# ── Retention: Weekly ─────────────────────────────────────────────────────
# Keep one backup per ISO week, keep last N distinct weeks.
log "Applying weekly retention: keep latest $RETENTION_WEEKLY weeks"
WEEKLY_BACKUPS=()
declare -A SEEN_WEEKS

# Collect all backups with their ISO week
for f in $(ls -1t "${BACKUP_DIR}"/2108trade_*.sql.gz 2>/dev/null || true); do
  BASENAME="$(basename "$f")"
  FILE_DATE="$(echo "$BASENAME" | sed 's/2108trade_\([0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}\).*/\1/')"
  if [ -n "$FILE_DATE" ] && [ "$FILE_DATE" != "$BASENAME" ]; then
    ISO_WEEK="$(date -d "$FILE_DATE" '+%Y-W%V' 2>/dev/null || echo "unknown")"
    if [ -z "${SEEN_WEEKS[$ISO_WEEK]:-}" ]; then
      SEEN_WEEKS[$ISO_WEEK]=1
      WEEKLY_BACKUPS+=("$f")
    fi
  fi
done

WEEK_COUNT=0
for f in "${WEEKLY_BACKUPS[@]}"; do
  WEEK_COUNT=$((WEEK_COUNT + 1))
  if [ "$WEEK_COUNT" -le "$RETENTION_WEEKLY" ]; then
    # Create a weekly symlink/copy marker for clarity
    WEEK_LINK="${BACKUP_DIR}/.weekly_${WEEK_COUNT}"
    rm -f "$WEEK_LINK"
    ln -sf "$(basename "$f")" "$WEEK_LINK"
  else
    log "Removing old weekly backup: $f"
    rm -f "$f"
  fi
done

log "Retention complete. Daily: up to $RETENTION_DAILY, Weekly: up to $RETENTION_WEEKLY"
unset PGPASSWORD
