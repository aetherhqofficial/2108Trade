# ── 2108Trade Backup Cron Container ─────────────────────────────────────
# Alpine-based cron container that runs backup.sh daily at 2am UTC.
#
# Build:
#   docker build -f scripts/backup-cron.Dockerfile -t 2108trade-backup-cron .
#
FROM alpine:3.21

RUN apk add --no-cache \
    postgresql16-client \
    bash \
    dcron \
    gzip \
    coreutils \
    tzdata

# Set timezone to UTC
ENV TZ=UTC

# Create backup directory and cron directories
RUN mkdir -p /backups /etc/periodic/daily /var/spool/cron/crontabs

# Copy backup script
COPY scripts/backup.sh /usr/local/bin/backup.sh
RUN chmod +x /usr/local/bin/backup.sh

# Create cron job: daily at 2:00 AM UTC
RUN echo "0 2 * * * /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1" \
    > /var/spool/cron/crontabs/root

# Ensure cron directories have correct permissions
RUN chmod 0644 /var/spool/cron/crontabs/root && \
    touch /var/log/backup.log

# Set default environment variables (overridable at runtime)
ENV DB_HOST=postgres \
    DB_PORT=5432 \
    DB_USER=2108trade \
    DB_NAME=2108trade \
    DB_PASSWORD="" \
    BACKUP_DIR=/backups \
    RETENTION_DAILY=7 \
    RETENTION_WEEKLY=4

# Run cron in foreground with logging
CMD ["crond", "-f", "-l", "2"]
