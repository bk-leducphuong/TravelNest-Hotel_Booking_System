# CI/CD Quick Setup Guide

This guide will help you set up the CI/CD pipeline for TravelNest in under 30 minutes.

## Prerequisites

- GitHub repository with admin access
- Docker Hub account
- Deployment server with SSH access
- Basic knowledge of GitHub Actions

## Step 1: Docker Hub Setup (5 minutes)

1. Go to [hub.docker.com](https://hub.docker.com) and sign in
2. Create two repositories:
   - `travelnest-backend` (public or private)
   - `travelnest-frontend` (public or private)
3. Generate access token:
   - Click your profile → Account Settings → Security
   - Click "New Access Token"
   - Name: `TravelNest CI/CD`
   - Permissions: Read & Write
   - Copy the token (you won't see it again!)

## Step 2: GitHub Secrets Setup (10 minutes)

1. Go to your GitHub repository
2. Navigate to **Settings → Secrets and variables → Actions**
3. Click **New repository secret** for each:

### Required Secrets:

```
DOCKERHUB_USERNAME = your_dockerhub_username
DOCKERHUB_TOKEN = dckr_pat_xxxxxxxxxxxxx
```

### Deployment Secrets (for development environment):

```
DEPLOY_HOST = your-server-ip-or-domain
DEPLOY_USER = ubuntu
DEPLOY_SSH_KEY = -----BEGIN RSA PRIVATE KEY-----
                 (paste your entire SSH private key)
                 -----END RSA PRIVATE KEY-----
```

### Optional Secrets:

```
SNYK_TOKEN = (get from snyk.io for security scanning)
SLACK_WEBHOOK_URL = (for notifications)
DEPLOY_PORT = 22 (if different)
```

## Step 3: Server Setup (15 minutes)

### SSH into your server:

```bash
ssh user@your-server
```

### Install Docker:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

### Create application directory:

```bash
# Create directory
sudo mkdir -p /opt/travelnest
sudo chown $USER:$USER /opt/travelnest
cd /opt/travelnest

# Copy docker-compose.prod.yml from your repo
# Or use scp to copy from local machine
```

### Create .env file:

```bash
nano .env
```

Paste this content (update values):

```env
# Database
DB_PASSWORD=your_secure_password
DB_NAME=booking_website
DB_USER=root

# Secrets
SESSION_SECRET=your_session_secret_min_32_chars
JWT_SECRET=your_jwt_secret_min_32_chars

# Images
BACKEND_IMAGE=your_dockerhub_username/travelnest-backend:latest
FRONTEND_IMAGE=your_dockerhub_username/travelnest-frontend:latest
```

Save and exit (`Ctrl+X`, then `Y`, then `Enter`)

## Step 4: Test the Pipeline (5 minutes)

### Test CI:

1. Create a new branch:
   ```bash
   git checkout -b test-ci-cd
   ```

2. Make a small change (e.g., add a comment to a file)
   ```bash
   echo "# CI/CD Test" >> README.md
   ```

3. Commit and push:
   ```bash
   git add .
   git commit -m "test: CI/CD pipeline setup"
   git push origin test-ci-cd
   ```

4. Create Pull Request on GitHub
5. Watch GitHub Actions run the CI workflows

### Test Docker Build:

1. Merge the PR to `develop` branch
2. Watch GitHub Actions build and push Docker images
3. Check Docker Hub to see your new images

### Test Deployment:

1. Ensure your server is ready (Step 3 completed)
2. The deploy workflow should trigger automatically
3. Watch GitHub Actions deploy to your server
4. Visit your server URL to verify deployment

## Step 5: Verify Everything Works

### Check GitHub Actions:

Go to **Actions** tab in your repository. You should see:
- ✅ Backend CI
- ✅ Frontend CI  
- ✅ Build and Push Docker Images
- ✅ Deploy Application

### Check Docker Hub:

Visit your Docker Hub repositories. You should see:
- Images tagged with `develop`, `latest`, and git SHA
- Recent push timestamps

### Check Server:

```bash
# SSH into server
ssh user@your-server

# Check running containers
cd /opt/travelnest
docker-compose ps

# All services should be "Up" and "healthy"
# View logs
docker-compose logs -f
```

### Test Application:

```bash
# Test backend
curl http://your-server/api/health

# Test frontend
curl http://your-server
```

## Common Issues & Solutions

### Issue: Docker build fails with authentication error

**Solution:**
```bash
# Regenerate Docker Hub token
# Update DOCKERHUB_TOKEN secret in GitHub
# Retrigger the workflow
```

### Issue: SSH connection fails

**Solution:**
```bash
# Verify SSH key format in GitHub secret (no extra spaces/newlines)
# Test SSH manually: ssh -i your_key user@host
# Check server firewall allows GitHub IPs
```

### Issue: Container unhealthy on server

**Solution:**
```bash
# Check logs
docker-compose logs service_name

# Check environment variables
docker-compose config

# Restart services
docker-compose restart
```

## Next Steps

### Setup Staging Environment:

1. Create `staging` branch
2. Add staging server secrets (`STAGING_DEPLOY_HOST`, etc.)
3. Configure GitHub environment for staging
4. Push to staging branch to trigger deployment

### Setup Production Environment:

1. Add production server secrets (`PROD_DEPLOY_HOST`, etc.)
2. Configure GitHub environment with protection rules:
   - Required reviewers
   - Deployment branch: `master` only
3. Push to master to trigger approval workflow
4. Manually approve in GitHub Actions UI

### Enable Notifications:

1. Create Slack/Discord webhook
2. Add `SLACK_WEBHOOK_URL` secret
3. Receive build and deployment notifications

## Monitoring

### View Logs:

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f server

# Last 100 lines
docker-compose logs --tail=100 server
```

### Check Health:

```bash
# Container health status
docker-compose ps

# Resource usage
docker stats

# Disk usage
docker system df
```

### Clean Up:

```bash
# Remove unused images
docker image prune -a -f

# Remove unused volumes
docker volume prune -f

# Full cleanup (careful!)
docker system prune -a -f
```

## Helpful Commands

```bash
# Restart all services
docker-compose restart

# Rebuild and restart
docker-compose up -d --build

# Stop all services
docker-compose down

# View specific container logs
docker logs container_name -f

# Access container shell
docker-compose exec server sh

# Run migrations manually
docker-compose exec server npm run migrate

# Create database backup
docker-compose exec mysql mysqldump -u root -p booking_website > backup.sql
```

## Support

- **Documentation**: See `docs/CI-CD.md` for detailed information
- **Issues**: Check GitHub Actions logs for error details
- **Questions**: Open an issue in the repository

---

**Congratulations!** 🎉 Your CI/CD pipeline is now set up!

Every push to `develop`, `staging`, or `master` will automatically:
1. Run tests and checks
2. Build Docker images
3. Deploy to corresponding environment
4. Notify you of success/failure
