#!/bin/bash

set -euo pipefail

DB_URL="${DATABASE_URL:-appuser:admin@tcp(localhost:3306)/scheduler}"

if [ -v RUN_MIGRATIONS ]; then
	# Run migrations before starting server
	goose -dir /migrations mysql "$DB_URL" up
fi

# Start server
exec /go/bin/app

