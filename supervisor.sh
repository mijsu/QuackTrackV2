#!/bin/bash
# Supervisor script for Next.js dev server
cd /home/z/my-project
while true; do
  echo "[$(date)] Starting Next.js dev server..."
  NODE_OPTIONS='--max-old-space-size=4096' npx next dev -p 3000 --webpack
  EXIT_CODE=$?
  echo "[$(date)] Next.js exited with code $EXIT_CODE, restarting in 3s..."
  sleep 3
done
