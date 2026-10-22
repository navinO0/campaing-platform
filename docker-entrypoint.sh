#!/bin/sh
set -e

# Automatically apply database migrations if DATABASE_URL is configured
if [ -n "$DATABASE_URL" ] && [ -f "./scripts/migrate.js" ]; then
  echo "🚀 Applying pending database migrations..."
  node ./scripts/migrate.js || echo "⚠️ Notice: Database migration encountered an issue, starting server..."
fi

exec "$@"

