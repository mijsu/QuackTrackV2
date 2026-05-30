# ─── Build stage ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js app
RUN npm run build

# ─── Runtime stage ──────────────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Install dumb-init to handle signals properly
RUN apk add --no-cache dumb-init

# Install production dependencies only
RUN npm ci --only=production --legacy-peer-deps && npm cache clean --force

# Copy built app from builder
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

# Expose port
EXPOSE 3000

# Use dumb-init to run Node.js
ENTRYPOINT ["/sbin/dumb-init", "--"]

# Start the app
CMD ["node", "server.js"]
