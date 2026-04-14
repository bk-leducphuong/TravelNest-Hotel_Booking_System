# Migrating to Yarn Workspaces

This guide will help you migrate from independent npm packages to a unified Yarn Workspaces monorepo.

## Prerequisites

- Node.js >= 18.0.0
- Yarn >= 4.0.0

## Migration Steps

### 1. Install Yarn (if not already installed)

```bash
# Enable Corepack (comes with Node.js 16.10+)
corepack enable

# Install Yarn Berry (v4)
corepack prepare yarn@4.5.3 --activate
```

### 2. Clean up old dependencies

Before installing with Yarn workspaces, remove all existing `node_modules` directories:

```bash
# From the root directory
rm -rf node_modules
rm -rf client/node_modules
rm -rf server/node_modules
rm -rf admin-client/node_modules
rm -rf scrape_data/node_modules

# Also remove package-lock.json files if they exist
rm -f package-lock.json
rm -f client/package-lock.json
rm -f server/package-lock.json
rm -f admin-client/package-lock.json
rm -f scrape_data/package-lock.json
```

### 3. Install all dependencies

From the root directory, run:

```bash
yarn install
```

This will:
- Install all dependencies for all workspaces
- Create a single `node_modules` in the root
- Link workspace dependencies
- Generate `yarn.lock` file

### 4. Verify the installation

Check that all workspaces are recognized:

```bash
yarn workspaces list
```

You should see:
- @travelnest/admin-client
- @travelnest/client
- @travelnest/scrape-data
- @travelnest/server

## Using Yarn Workspaces

### Running scripts in specific workspaces

```bash
# Development
yarn workspace @travelnest/client dev
yarn workspace @travelnest/server dev
yarn workspace @travelnest/admin-client dev

# Or use the convenience scripts from root:
yarn dev:client
yarn dev:server
yarn dev:admin
```

### Building workspaces

```bash
yarn workspace @travelnest/client build
yarn workspace @travelnest/admin-client build

# Or use convenience scripts:
yarn build:client
yarn build:admin
```

### Running commands in all workspaces

```bash
# Run lint in all workspaces
yarn workspaces foreach -A run lint

# Run tests in all workspaces
yarn workspaces foreach -A run test

# Or use convenience scripts:
yarn lint
yarn test
```

### Adding dependencies

```bash
# Add a dependency to a specific workspace
yarn workspace @travelnest/client add axios

# Add a dev dependency
yarn workspace @travelnest/server add -D nodemon

# Add a dependency to the root
yarn add -D prettier
```

### Removing dependencies

```bash
yarn workspace @travelnest/client remove axios
```

## Workspace Structure

```
TravelNest-Hotel_Booking_System/
├── package.json                 # Root package with workspace config
├── .yarnrc.yml                  # Yarn configuration
├── yarn.lock                    # Lock file for all workspaces
├── node_modules/                # Shared dependencies
├── client/                      # @travelnest/client
│   ├── package.json
│   └── ...
├── server/                      # @travelnest/server
│   ├── package.json
│   └── ...
├── admin-client/                # @travelnest/admin-client
│   ├── package.json
│   └── ...
└── scrape_data/                 # @travelnest/scrape-data
    ├── package.json
    └── ...
```

## Benefits

1. **Single dependency installation**: All workspaces share the same `node_modules`
2. **Faster installations**: Yarn caches packages globally
3. **Consistent versions**: One `yarn.lock` for the entire project
4. **Easy cross-workspace references**: Workspaces can depend on each other
5. **Simplified CI/CD**: One install command for all packages
6. **Better memory efficiency**: Shared dependencies reduce disk usage

## Docker Considerations

If you're using Docker, you'll need to update your Dockerfiles to accommodate the monorepo structure:

- Copy the root `package.json`, `yarn.lock`, and `.yarnrc.yml`
- Copy the relevant workspace's `package.json`
- Run `yarn install` from the root
- Copy the workspace's source code

Example for client Dockerfile:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy monorepo config files
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn

# Copy workspace package.json
COPY client/package.json ./client/

# Install dependencies
RUN corepack enable && yarn install

# Copy source code
COPY client ./client

WORKDIR /app/client

CMD ["yarn", "dev"]
```

## Troubleshooting

### "Package not found" errors

If you get errors about packages not being found:

```bash
yarn install --force
```

### Clearing cache

```bash
yarn cache clean
```

### Reset everything

```bash
yarn clean  # Uses the convenience script
yarn install
```

## CI/CD Integration

For GitHub Actions or other CI systems:

```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '18'
    
- name: Enable Corepack
  run: corepack enable

- name: Install dependencies
  run: yarn install --immutable

- name: Run tests
  run: yarn test

- name: Build all
  run: |
    yarn build:client
    yarn build:admin
```

## VSCode Integration

Yarn workspaces are automatically recognized by VSCode. The TypeScript language server will work across workspaces.

To improve the experience, you can add to `.vscode/settings.json`:

```json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```
