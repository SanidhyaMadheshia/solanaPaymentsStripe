#!/bin/sh
set -e
# Apply pending database migrations (idempotent), then start the API.
export DIRECT_URL="${DIRECT_URL:-$DATABASE_URL}"
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  npx prisma migrate deploy --schema src/db/prisma/schema.prisma
fi
exec node dist/index.js
