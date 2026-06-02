#!/bin/bash
cd /home/z/my-project
export NODE_OPTIONS='--max-old-space-size=2048'
while true; do
  echo "[$(date)] Starting Next.js dev server..."
  npx next dev -p 3000 --turbopack 2>&1 | tee -a /home/z/my-project/dev.log
  echo "[$(date)] Server exited, restarting in 2s..."
  sleep 2
done
