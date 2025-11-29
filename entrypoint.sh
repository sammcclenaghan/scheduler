#!/bin/bash

set -euo pipefail

DB_URL="${DATABASE_URL:-/data/scheduler.db}"

# Ensure database directory exists
DB_DIR=$(dirname "$DB_URL")
mkdir -p "$DB_DIR"

# Run migrations before starting server
echo "Running migrations..."
goose -dir /migrations sqlite3 "$DB_URL" up

# Seed database
echo "Seeding database..."
/seeder -db="$DB_URL" -data=/seed-data

echo "Starting Go server..."
DATABASE_URL="$DB_URL" /app &

# Wait a moment to ensure server starts
sleep 1

echo "Starting Caddy..."
caddy run --config /etc/caddy/Caddyfile --adapter caddyfile

