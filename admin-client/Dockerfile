# Built with the repository root as the build context (see admin-client.yml) so
# the image uses the committed yarn.lock instead of a floating npm resolution.
FROM node:25-alpine AS builder

WORKDIR /app
RUN corepack enable
COPY package.json yarn.lock .yarnrc.yml ./
COPY server/package.json server/
COPY client/package.json client/
# The workspace source must be present before installing: the admin-client
# `postinstall` script runs `nuxt prepare`, which reads nuxt.config.ts.
COPY admin-client/ ./admin-client/
RUN yarn workspaces focus @travelnest/admin-client

# Nuxt reads NUXT_PUBLIC_API_BASE at build time (see nuxt.config.ts).
ARG NUXT_PUBLIC_API_BASE
ENV NUXT_PUBLIC_API_BASE=${NUXT_PUBLIC_API_BASE}

RUN yarn workspace @travelnest/admin-client run build

FROM node:25-alpine

ENV NODE_ENV=production
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=3000

WORKDIR /app

COPY --from=builder /app/admin-client/.output ./.output

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:3000/ || exit 1

CMD ["node", ".output/server/index.mjs"]
