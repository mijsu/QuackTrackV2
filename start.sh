#!/bin/bash
export DATABASE_URL="postgresql://quacktrack_6u94_ocuw_user:2J7RM278uUzHOo57S1EeVMFksI7eBMG7@dpg-d7fo1vi8qa3s73dmdmb0-a.oregon-postgres.render.com/quacktrack_6u94_ocuw?sslmode=require"
export NEXTAUTH_SECRET="92gaKeqa6ANdsyOgeVMwiEMvwDqMzju4nhx6kdadw7Q="
export NEXTAUTH_URL="http://localhost:3000"
export ADMIN_DEFAULT_PASSWORD="password123"
cd /home/z/my-project/.next/standalone
exec node server.js
