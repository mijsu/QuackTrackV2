# ─── Build stage ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install dependencies (npm install for better compatibility with bun projects)
RUN npm install --legacy-peer-deps

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

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm install --production --legacy-peer-deps && npm cache clean --force

# Copy node_modules and built app from builder  
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

# Expose port
EXPOSE 3000

# Use dumb-init and run the standalone server with PORT handling
ENTRYPOINT ["/sbin/dumb-init", "--"]
CMD ["node", "server.js"]
ENV PORT=3000
