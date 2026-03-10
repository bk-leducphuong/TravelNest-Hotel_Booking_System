# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Build-time environment (injected via docker build args)
# ARG NUXT_PUBLIC_API_BASE
# ARG NITRO_PUBLIC_API_BASE
# ARG NITRO_MINIO_URL
#
# ENV NUXT_PUBLIC_API_BASE=${NUXT_PUBLIC_API_BASE} \
#     NITRO_PUBLIC_API_BASE=${NITRO_PUBLIC_API_BASE} \
#     NITRO_MINIO_URL=${NITRO_MINIO_URL}

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
# Nuxt outputs to .output/public when using generate (static site for nginx)
RUN npm run generate

# Production stage
FROM nginx:alpine

# Copy built assets from builder (Nuxt generate puts static files in .output/public)
COPY --from=builder /app/.output/public /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

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
