FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./

# Fall back to npm install when no lockfile is present in the repo.
RUN if [ -f package-lock.json ]; then \
      npm ci; \
    else \
      npm install; \
    fi && \
    npm cache clean --force

COPY . .

RUN npm run build

FROM node:22-alpine

ENV NODE_ENV=production
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=3000

WORKDIR /app

COPY --from=builder /app/.output ./.output

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:3000/ || exit 1

CMD ["node", ".output/server/index.mjs"]
