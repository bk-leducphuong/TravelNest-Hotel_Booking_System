# CI/CD Pipeline Documentation

## Overview

This document describes the Continuous Integration and Continuous Deployment (CI/CD) pipeline for the TravelNest project. The pipeline is built using GitHub Actions and includes automated testing, building, security scanning, and deployment processes for both backend and frontend applications.

---

## Table of Contents

1. [Pipeline Architecture](#pipeline-architecture)
2. [CI Workflows](#ci-workflows)
3. [CD Workflows](#cd-workflows)
4. [Docker Configuration](#docker-configuration)
5. [Setup Instructions](#setup-instructions)
6. [Environment Variables](#environment-variables)
7. [Deployment Strategies](#deployment-strategies)
8. [Troubleshooting](#troubleshooting)

---

## Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Code Push/PR                             │
└────────────────┬────────────────────────────────────────────────┘
                 │
    ┌────────────┴────────────┐
    │                         │
┌───▼─────┐            ┌─────▼────┐
│ Backend │            │ Frontend │
│   CI    │            │    CI    │
└───┬─────┘            └─────┬────┘
    │                         │
    │ ✓ Lint                 │ ✓ Lint
    │ ✓ Unit Tests           │ ✓ Build
    │ ✓ Integration Tests    │ ✓ Security Scan
    │ ✓ Coverage             │
    │ ✓ Security Scan        │
    │                         │
    └────────────┬────────────┘
                 │
                 │ (on master/develop/staging)
                 │
         ┌───────▼────────┐
         │  Build & Push  │
         │ Docker Images  │
         └───────┬────────┘
                 │
                 │ ✓ Backend Image
                 │ ✓ Frontend Image
                 │ ✓ Trivy Scan
                 │
         ┌───────▼────────┐
         │   Deployment   │
         │  (by branch)   │
         └───────┬────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
┌───▼───┐   ┌───▼────┐   ┌──▼────┐
│  Dev  │   │Staging │   │  Prod │
│ Auto  │   │  Auto  │   │Manual │
└───────┘   └────────┘   └───────┘
```

---

## CI Workflows

### 1. Backend CI (`ci-backend.yml`)

**Triggers:**
- Push to `master`, `develop`, `staging` branches
- Pull requests targeting these branches
- Changes in `server/**` directory

**Jobs:**

#### Lint and Test
- **Matrix**: Node.js 18.x and 20.x
- **Services**: MySQL 8.0, Redis
- **Steps**:
  1. Install dependencies
  2. Run ESLint
  3. Check code formatting (Prettier)
  4. Run unit tests
  5. Run integration tests
  6. Generate coverage report
  7. Upload coverage to Codecov

#### Security Scan
- Run `npm audit`
- Run Snyk security scan (requires `SNYK_TOKEN`)

#### Build Validation
- Validate production build configuration

### 2. Frontend CI (`ci-frontend.yml`)

**Triggers:**
- Push to `master`, `develop`, `staging` branches
- Pull requests targeting these branches
- Changes in `client/**` directory

**Jobs:**

#### Lint and Build
- **Matrix**: Node.js 18.x and 20.x
- **Steps**:
  1. Install dependencies
  2. Run ESLint
  3. Check code formatting (Prettier)
  4. Build production bundle
  5. Analyze bundle size
  6. Archive build artifacts

#### Security Scan
- Run `npm audit`
- Run Snyk security scan

#### Preview Validation
- Build and test preview server

---

## CD Workflows

### 3. Docker Build & Push (`docker-build-push.yml`)

**Triggers:**
- Push to `master`, `develop`, `staging` branches
- Release published
- Manual workflow dispatch

**Jobs:**

#### Build Backend
1. Setup Docker Buildx
2. Login to Docker Hub
3. Extract metadata and tags
4. Build multi-platform image (amd64, arm64)
5. Push to Docker Hub
6. Run Trivy vulnerability scan
7. Upload security results to GitHub

#### Build Frontend
1. Setup Docker Buildx
2. Login to Docker Hub
3. Extract metadata and tags
4. Build multi-platform image (amd64, arm64)
5. Push to Docker Hub
6. Run Trivy vulnerability scan
7. Upload security results to GitHub

#### Notify
- Send build status to Slack (optional)

**Image Tags:**
- Branch name (e.g., `develop`, `staging`, `master`)
- PR number (e.g., `pr-123`)
- Git SHA (e.g., `master-abc1234`)
- Semantic version (e.g., `v1.2.3`, `1.2`)
- `latest` (for default branch)

### 4. Deployment (`deploy.yml`)

**Triggers:**
- Push to `develop`, `staging`, `master` branches
- Manual workflow dispatch with environment selection

**Environments:**

| Branch    | Environment | Auto Deploy | Approval Required |
|-----------|-------------|-------------|-------------------|
| `develop` | Development | ✅          | ❌                |
| `staging` | Staging     | ✅          | ❌                |
| `master`  | Production  | ❌          | ✅ (Manual)       |

**Deployment Steps:**
1. Determine target environment
2. Pull Docker images
3. Run database migrations
4. Deploy with rolling update (zero downtime)
5. Wait for health checks
6. Run smoke tests
7. Clean up old images
8. Rollback on failure
9. Send notification

**Production Deployment:**
- Requires manual approval in GitHub UI
- Creates database backup before deployment
- Uses blue-green deployment strategy
- Creates deployment record

---

## Docker Configuration

### Backend Dockerfile

**Multi-stage build:**
1. **Builder stage**: Install all dependencies
2. **Production stage**:
   - Install only production dependencies
   - Copy built application
   - Create non-root user (nodejs:nodejs)
   - Health check on `/health` endpoint
   - Expose port 3000

**Optimizations:**
- Use `npm ci` for faster, deterministic installs
- Layer caching for dependencies
- Minimal image size with alpine base
- Security best practices (non-root user)

### Frontend Dockerfile

**Multi-stage build:**
1. **Builder stage**:
   - Install dependencies
   - Build production bundle
2. **Production stage**:
   - Use nginx:alpine base
   - Copy built assets
   - Copy custom nginx configuration
   - Health check on `/health` endpoint
   - Expose port 80

**nginx.conf features:**
- SPA routing support (Vue Router)
- Gzip compression
- Security headers
- Static asset caching
- API proxy support
- Health check endpoint

### .dockerignore

Excludes:
- `node_modules`
- `.env` files
- Tests and coverage
- Documentation
- Development files
- Logs

---

## Setup Instructions

### 1. GitHub Repository Secrets

Navigate to **Settings → Secrets and variables → Actions** and add:

#### Required Secrets:

| Secret Name               | Description                          | Example                  |
|---------------------------|--------------------------------------|--------------------------|
| `DOCKERHUB_USERNAME`      | Docker Hub username                  | `yourusername`           |
| `DOCKERHUB_TOKEN`         | Docker Hub access token              | `dckr_pat_...`           |
| `DEPLOY_HOST`             | Deployment server hostname           | `dev.travelnest.com`     |
| `DEPLOY_USER`             | SSH username                         | `ubuntu`                 |
| `DEPLOY_SSH_KEY`          | SSH private key                      | `-----BEGIN RSA...`      |
| `PROD_DEPLOY_HOST`        | Production server hostname           | `travelnest.com`         |
| `PROD_DEPLOY_USER`        | Production SSH username              | `ubuntu`                 |
| `PROD_DEPLOY_SSH_KEY`     | Production SSH private key           | `-----BEGIN RSA...`      |

#### Optional Secrets:

| Secret Name               | Description                          |
|---------------------------|--------------------------------------|
| `SNYK_TOKEN`              | Snyk API token for security scanning |
| `SLACK_WEBHOOK_URL`       | Slack webhook for notifications      |
| `DEPLOY_PORT`             | SSH port (default: 22)               |
| `PROD_DEPLOY_PORT`        | Production SSH port (default: 22)    |

### 2. Docker Hub Setup

1. Create account at [hub.docker.com](https://hub.docker.com)
2. Create repositories:
   - `travelnest-backend`
   - `travelnest-frontend`
3. Generate access token:
   - Account Settings → Security → New Access Token
   - Copy token and save as `DOCKERHUB_TOKEN`

### 3. Server Setup

#### Prerequisites:
- Ubuntu 20.04+ or similar Linux distribution
- Docker and Docker Compose installed
- SSH access configured
- Firewall configured (ports 80, 443, 22)

#### Directory Structure:
```bash
/opt/travelnest/
├── docker-compose.yml
├── .env
└── backups/
```

#### Install Docker:
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

#### Install Docker Compose:
```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 4. Environment Configuration

Create environment-specific `.env` files on deployment servers:

**Development/Staging:**
```env
NODE_ENV=production
DB_HOST=mysql
DB_PORT=3306
DB_USER=root
DB_PASSWORD=<secure_password>
DB_NAME=booking_website
REDIS_HOST=redis
REDIS_PORT=6379
SESSION_SECRET=<random_secret>
# ... other environment variables
```

### 5. GitHub Environments

Configure environments in **Settings → Environments**:

1. **development**
   - No protection rules
   - Auto-deploy on `develop` branch

2. **staging**
   - No protection rules
   - Auto-deploy on `staging` branch

3. **production**
   - Required reviewers: Add team members
   - Deployment branches: `master` only
   - Manual approval required

---

## Environment Variables

### Backend Environment Variables

```env
# Application
NODE_ENV=production
PORT=3000

# Database
DB_HOST=mysql
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=booking_website

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# Authentication
SESSION_SECRET=
JWT_SECRET=

# Email
MAIL_HOST=
MAIL_PORT=
MAIL_USER=
MAIL_PASSWORD=

# Payment
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Storage
MINIO_ENDPOINT=
MINIO_ACCESS_KEY=
MINIO_SECRET_KEY=

# External APIs
INFOBIP_API_KEY=
ABSTRACTAPI_KEY=
```

### Frontend Environment Variables

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_STRIPE_PUBLIC_KEY=
```

---

## Deployment Strategies

### Rolling Update (Default)

- Updates containers one at a time
- Minimal downtime
- Gradual rollout

```bash
docker-compose up -d --no-deps --build service_name
```

### Blue-Green Deployment (Production)

- Run new version alongside old version
- Switch traffic once verified
- Quick rollback capability

```bash
docker-compose up -d --scale server=2
# Verify new instance
docker-compose up -d --scale server=1
```

### Zero-Downtime Deployment

1. Scale up new instances
2. Health check validation
3. Scale down old instances
4. Cleanup

---

## Monitoring and Health Checks

### Backend Health Endpoint

```javascript
// Add to your Express app
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
```

### Frontend Health Endpoint

Already configured in `nginx.conf`:
```
GET /health
Response: 200 OK "healthy"
```

### Docker Health Checks

- **Backend**: Checks `/health` endpoint every 30s
- **Frontend**: Checks root endpoint every 30s
- **Startup period**: 40s (backend), 5s (frontend)
- **Retries**: 3 before marking unhealthy

---

## Troubleshooting

### Common Issues

#### 1. Build Failures

**Issue**: Docker build fails with "no space left on device"

**Solution**:
```bash
docker system prune -a
docker volume prune
```

#### 2. Test Failures in CI

**Issue**: Tests pass locally but fail in CI

**Solution**:
- Check environment variables in workflow
- Verify database/Redis services are healthy
- Review timeout settings
- Check for hardcoded URLs or ports

#### 3. Deployment Failures

**Issue**: SSH connection timeout

**Solution**:
- Verify `DEPLOY_HOST` is correct
- Check SSH key format (no extra whitespace)
- Ensure server allows SSH from GitHub IPs
- Verify firewall rules

#### 4. Image Pull Failures

**Issue**: "unauthorized: incorrect username or password"

**Solution**:
- Regenerate Docker Hub token
- Update `DOCKERHUB_TOKEN` secret
- Verify username matches exactly

#### 5. Migration Failures

**Issue**: Database migrations fail during deployment

**Solution**:
```bash
# Rollback migration
docker-compose exec server npm run migrate:undo

# Check migration status
docker-compose exec server npm run migrate:status

# Rerun migrations
docker-compose exec server npm run migrate
```

### Debugging Commands

```bash
# View container logs
docker-compose logs -f service_name

# Check container status
docker-compose ps

# Inspect container
docker inspect container_name

# Access container shell
docker-compose exec service_name sh

# View resource usage
docker stats

# Check image layers
docker history image_name
```

### Rollback Procedure

**Automatic Rollback**: Triggered on smoke test failure

**Manual Rollback**:
```bash
# SSH to server
ssh user@server

# Navigate to app directory
cd /opt/travelnest

# Pull previous version
docker-compose pull

# Restart with previous images
docker-compose up -d

# Or restore from backup
docker-compose down
docker-compose up -d
```

---

## Best Practices

### 1. Code Quality
- Always run tests locally before pushing
- Keep test coverage above 80%
- Use linters and formatters (ESLint, Prettier)
- Write meaningful commit messages

### 2. Security
- Never commit secrets or API keys
- Use environment variables for sensitive data
- Regularly update dependencies
- Review security scan results
- Use non-root users in Docker containers

### 3. Performance
- Optimize Docker images (multi-stage builds)
- Use layer caching effectively
- Minimize image size
- Clean up unused images regularly

### 4. Monitoring
- Monitor application logs
- Set up alerting for failures
- Track deployment metrics
- Regular health check reviews

### 5. Documentation
- Document all environment variables
- Keep deployment docs updated
- Document rollback procedures
- Maintain change logs

---

## Continuous Improvement

### Potential Enhancements

1. **Add E2E Tests**: Integrate Playwright or Cypress for end-to-end testing
2. **Performance Testing**: Add load testing with k6 or Artillery
3. **Container Orchestration**: Migrate to Kubernetes for better scalability
4. **Monitoring**: Integrate Prometheus + Grafana for metrics
5. **Log Aggregation**: Setup ELK stack or Loki for centralized logging
6. **Database Backups**: Automated daily backups to S3
7. **CDN Integration**: Add CloudFlare or AWS CloudFront
8. **Canary Deployments**: Gradual rollout to small percentage of users

---

## Support

For issues or questions:
1. Check this documentation
2. Review GitHub Actions logs
3. Check container logs on server
4. Contact DevOps team

---

## Changelog

| Date       | Version | Changes                                    |
|------------|---------|---------------------------------------------|
| 2026-02-23 | 1.0.0   | Initial CI/CD pipeline implementation       |

---

**Last Updated**: February 23, 2026
**Maintained By**: DevOps Team
