#!/bin/bash
cd /home/z/my-project
while true; do
  if ! pgrep -f "next-server" > /dev/null; then
    echo "$(date): Starting dev server..." >> /home/z/my-project/watchdog.log
    next dev -p 3000 2>&1 | tee dev.log &
    SERVER_PID=$!
    sleep 10
  fi
  sleep 5
done
