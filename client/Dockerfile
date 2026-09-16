# Built with the repository root as the build context (see frontend.yml) so the
# image uses the committed yarn.lock instead of a floating npm resolution.
FROM node:26-alpine AS builder

WORKDIR /app
RUN corepack enable
COPY package.json yarn.lock .yarnrc.yml ./
COPY server/package.json server/
COPY client/package.json client/
COPY admin-client/package.json admin-client/
# Install the frontend workspace including dev deps (vite, etc.).
RUN yarn workspaces focus @travelnest/client

COPY client/ ./client/

# Vite inlines VITE_* variables at build time.
ARG VITE_SERVER_HOST
ARG VITE_MINIO_URL
ENV VITE_SERVER_HOST=${VITE_SERVER_HOST}
ENV VITE_MINIO_URL=${VITE_MINIO_URL}

RUN yarn workspace @travelnest/client run build

# Production stage with nginx
FROM nginx:alpine

COPY client/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/client/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:80/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
