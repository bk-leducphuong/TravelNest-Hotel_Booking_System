# Multi-stage build for optimized production image
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

# Build-time environment (injected via docker build args)
# ARG VITE_SERVER_HOST
# ARG VITE_ENV
# ARG VITE_STRIPE_PUBLIC_KEY
# ARG VITE_MINIO_URL
#
# ENV VITE_SERVER_HOST=${VITE_SERVER_HOST} \
#     VITE_ENV=${VITE_ENV} \
#     VITE_STRIPE_PUBLIC_KEY=${VITE_STRIPE_PUBLIC_KEY} \
#     VITE_MINIO_URL=${VITE_MINIO_URL}

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

# Production stage with nginx
FROM nginx:alpine

# Copy built assets from builder
COPY --from=builder /usr/src/app/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create non-root user for security
RUN addgroup -g 1001 -S nginx_custom && \
    adduser -S nginx_custom -u 1001

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
