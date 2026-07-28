#!/bin/sh
set -e
echo "Running database migrations..."
cd /app/apps/web && bun run db:migrate
echo "Starting web application..."
exec bun run apps/web/server.js
