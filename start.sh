#!/bin/sh
set -e
echo "Starting QuackTrack..."
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL not set"
  exit 1
fi
echo "Syncing database..."
npx prisma db push --skip-generate --accept-data-loss || true
echo "Starting server..."
exec node server.js
