#!/bin/bash

set -euo pipefail

DB_URL="${DATABASE_URL:-/data/scheduler.db}"

# Ensure database directory exists
DB_DIR=$(dirname "$DB_URL")
mkdir -p "$DB_DIR"

# Copy seed data files to /data if they don't exist (volume mount overwrites COPY)
echo "Checking seed data files..."
for f in /seed-data/*.json; do
  filename=$(basename "$f")
  if [ ! -f "/data/$filename" ]; then
    echo "Copying $filename to /data..."
    cp "$f" "/data/$filename"
  fi
done

# Run migrations before starting server
echo "Running migrations..."
goose -dir /migrations sqlite3 "$DB_URL" up

# Seed database
echo "Seeding database..."
/seeder -db="$DB_URL" -data=/data

# Start server in background
/app &

# Start Caddy
caddy run --config /etc/caddy/Caddyfile --adapter caddyfile

