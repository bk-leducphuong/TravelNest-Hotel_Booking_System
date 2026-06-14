FROM node:18-alpine
ENV NODE_ENV=production

# Create app directory
WORKDIR /usr/src/app

# Copy server package files from the monorepo workspace.
COPY --chown=node:node server/package*.json ./

# Install production dependencies.
# Fall back to npm install when no lockfile is present in the repo.
RUN if [ -f package-lock.json ]; then \
      npm ci --omit=dev; \
    else \
      npm install --omit=dev; \
    fi && \
    npm cache clean --force

# Copy only the server workspace contents so npm scripts match the installed app.
COPY --chown=node:node server/ ./

# Switch to non-root user
USER node

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health/live', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)}).on('error', () => process.exit(1))"

# Start the server
CMD ["npm", "start"]
