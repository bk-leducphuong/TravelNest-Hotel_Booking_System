# Built with the repository root as the build context (see backend.yml) so the
# image uses the committed yarn.lock instead of a floating npm resolution.
FROM node:26-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json yarn.lock .yarnrc.yml ./
COPY server/package.json server/
COPY client/package.json client/
COPY admin-client/package.json admin-client/
# Install only the API workspace's production dependencies.
RUN yarn workspaces focus @travelnest/server --production

FROM node:26-alpine
ENV NODE_ENV=production

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --chown=node:node server/ ./server/

USER node
WORKDIR /app/server

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health/live', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)}).on('error', () => process.exit(1))"

CMD ["node", "server.js"]
