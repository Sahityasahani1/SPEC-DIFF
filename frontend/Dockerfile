# ==============================================================================
# Multi-stage Production Dockerfile for SpecDiff React Frontend
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build Static Assets
# ------------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Cache package dependencies
COPY package*.json ./
RUN npm ci

# Copy frontend source files
COPY . .

# Compile optimized static bundle with Vite
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: High-Performance Nginx Alpine Runtime
# ------------------------------------------------------------------------------
FROM nginx:alpine AS runner

# Remove default nginx boilerplate
RUN rm -rf /usr/share/nginx/html/*

# Copy built distribution assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
    CMD wget -q -O - http://localhost/nginx-health || exit 1

CMD ["nginx", "-g", "daemon off;"]
