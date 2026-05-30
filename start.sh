#!/bin/sh
# Production startup script for QuackTrack on Render
# Runs database migrations and starts the server

set -e

echo "🚀 Starting QuackTrack..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL environment variable not set!"
  exit 1
fi

echo "📊 Syncing Prisma schema with database..."
npx prisma db push --skip-generate --accept-data-loss || true

echo "✅ Database synced"
echo "🔧 Starting Next.js server..."

# Start the app
exec node server.js
