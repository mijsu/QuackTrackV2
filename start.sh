#!/bin/sh
set -e
echo "🚀 Starting QuackTrack server..."
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL not set!"
  exit 1
fi
echo "✅ DATABASE_URL configured"
echo "🔧 Starting Next.js server on port 3000..."
exec node server.js
