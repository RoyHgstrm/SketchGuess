# Stage 1: Build the Remix application
FROM node:18-alpine AS builder
WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the Remix app
RUN npm run build

# Prune development dependencies
RUN npm prune --production

# Stage 2: Production image
FROM node:18-alpine
WORKDIR /app

# Copy the entire built app with production dependencies from the builder stage
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/build ./build
COPY --from=builder /app/public ./public
COPY --from=builder /app/server.js ./
COPY --from=builder /app/websocket-server.js ./

# Set environment variables (can be overridden)
ENV NODE_ENV=production
ENV PORT=3000
# Ensure servers bind to 0.0.0.0 inside the container
ENV HOST=0.0.0.0 

# Expose the single port for the integrated server
EXPOSE 3000

# Add healthcheck (optional but recommended)
# HEALTHCHECK --interval=15s --timeout=5s --start-period=30s \
#   CMD curl --fail http://localhost:3000/ || exit 1

# Start the integrated server
CMD ["npm", "run", "start:docker"] 