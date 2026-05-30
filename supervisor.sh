#!/bin/bash
cd /home/z/my-project
while true; do
  if ! pgrep -f "next-server" > /dev/null 2>&1; then
    echo "$(date): (Re)starting dev server..." >> /home/z/my-project/supervisor.log
    # Start next dev in background, log to dev.log
    npx next dev -p 3000 > dev.log 2>&1 &
    # Wait for it to start
    sleep 8
  fi
  sleep 5
done
