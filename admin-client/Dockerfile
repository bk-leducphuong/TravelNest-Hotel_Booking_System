# Built with the repository root as the build context (see admin-client.yml) so
# the image uses the committed yarn.lock instead of a floating npm resolution.
FROM node:22-alpine AS builder

WORKDIR /app
RUN corepack enable
COPY package.json yarn.lock .yarnrc.yml ./
COPY server/package.json server/
COPY client/package.json client/
# The workspace source must be present before installing: the admin-client
# `postinstall` script runs `nuxt prepare`, which reads nuxt.config.ts.
COPY admin-client/ ./admin-client/
RUN yarn workspaces focus @travelnest/admin-client

# Nuxt reads NUXT_PUBLIC_* at build time (see nuxt.config.ts). The admin client
# is a static SPA, so its public runtime config is baked during the build.
ARG NUXT_PUBLIC_API_BASE
ARG NUXT_PUBLIC_KEYCLOAK_URL
ARG NUXT_PUBLIC_KEYCLOAK_REALM
ARG NUXT_PUBLIC_KEYCLOAK_CLIENT_ID
ARG NUXT_PUBLIC_KEYCLOAK_SILENT_CHECK_SSO_REDIRECT_URI
ENV NUXT_PUBLIC_API_BASE=${NUXT_PUBLIC_API_BASE}
ENV NUXT_PUBLIC_KEYCLOAK_URL=${NUXT_PUBLIC_KEYCLOAK_URL}
ENV NUXT_PUBLIC_KEYCLOAK_REALM=${NUXT_PUBLIC_KEYCLOAK_REALM}
ENV NUXT_PUBLIC_KEYCLOAK_CLIENT_ID=${NUXT_PUBLIC_KEYCLOAK_CLIENT_ID}
ENV NUXT_PUBLIC_KEYCLOAK_SILENT_CHECK_SSO_REDIRECT_URI=${NUXT_PUBLIC_KEYCLOAK_SILENT_CHECK_SSO_REDIRECT_URI}

RUN yarn workspace @travelnest/admin-client run build

FROM node:22-alpine

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
