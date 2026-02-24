# TravelNest - Hotel booking website

[![Backend CI](https://github.com/bk-leducphuong/TravelNest/actions/workflows/ci-backend.yml/badge.svg)](https://github.com/bk-leducphuong/TravelNest/actions/workflows/ci-backend.yml)
[![Frontend CI](https://github.com/bk-leducphuong/TravelNest/actions/workflows/ci-frontend.yml/badge.svg)](https://github.com/bk-leducphuong/TravelNest/actions/workflows/ci-frontend.yml)
[![Docker Build](https://github.com/bk-leducphuong/TravelNest/actions/workflows/docker-build-push.yml/badge.svg)](https://github.com/bk-leducphuong/TravelNest/actions/workflows/docker-build-push.yml)

<p align="center">
<img src="https://github.com/bk-leducphuong/TravelNest/blob/master/client/src/assets/images/logo.png" width="300" title="Login With Custom URL">
</p>

Welcome to the **TravelNest** - Hotel booking website. This platform allows users to book accommodations, post properties, leave reviews, and more. It provides an intuitive interface for guests and property owners, ensuring a seamless booking experience.
This project was inspired by [booking.com](https://booking.com)
> Video demo: [link to video](https://www.youtube.com/watch?v=-jxhmIJp988&list=PLCt2C1YyUqcCfEhqOXE-Mul8UINudlCse)
---

## Features

### For Guests
![TravelNest Preview](https://github.com/bk-leducphuong/TravelNest/blob/master/client/src/assets/images/booking_website.png)
- **Browse Hotels**: Search and filter hotels by location, price, amenities, and more.
- **Make Reservations**: Book rooms with real-time availability.
- **Review Hotels**: Leave feedback and rate services for hotels you've stayed at.
- **User Dashboard**: Manage bookings and view review history.
- **Post properties**: Allow user post their properties.
- **Switch languages**: Support 2 languages: Vietnamese and English 

### For Hotel Owners
![TravelNest Preview](https://github.com/bk-leducphuong/TravelNest/blob/master/client/src/assets/images/admin_booking_website.png)
- **List Properties**: Add property details, photos, and room availability.
- **Manage Bookings**: View and manage reservations for your property.
- **Respond to Reviews**: Reply to guest reviews to improve engagement and feedback.
- **Analytics Dashboard**: View booking and review statistics for your property.
- **Switch languages**: Support 2 languages: Vietnamese and English

### AI Integrations (Comming soon...)
- **Sentiment Analysis**: Automatically analyze the sentiment of guest reviews to provide actionable insights for hotel owners.
- **Smart Suggestions**: Recommend hotels to users based on their search preferences and past behavior.

---

## Technologies Used

- **Frontend**: Vuejs
- **Backend**: Node.js, Express.js
- **Database**: MySQL
- **Cache**: Redis Cloud
- **Payment & Payout**: Stripe
- **Map**: Leaflet
- **Authentication**: Session based authentication
- **Mail**: Nodemailer
- **Email validation**: abstractapi
- **SMS**: infobip
- **Realtime notification**: SocketIO
- **Cloud storage**: Cloudinary 
- **Hosting**: 

---

## CI/CD Pipeline

This project includes a comprehensive CI/CD pipeline using GitHub Actions for automated testing, building, and deployment.

### Features
- ✅ Automated testing (unit & integration tests)
- ✅ Code quality checks (ESLint, Prettier)
- ✅ Security scanning (npm audit, Snyk, Trivy)
- ✅ Docker image building and publishing
- ✅ Multi-environment deployment (dev, staging, production)
- ✅ Health checks and automatic rollback
- ✅ Slack notifications (optional)

### Quick Start

**1. Setup GitHub Secrets:**
- `DOCKERHUB_USERNAME` - Your Docker Hub username
- `DOCKERHUB_TOKEN` - Docker Hub access token
- `DEPLOY_HOST` - Your deployment server IP/domain
- `DEPLOY_USER` - SSH username
- `DEPLOY_SSH_KEY` - SSH private key

**2. Push to branches:**
- `develop` → Auto-deploy to development
- `staging` → Auto-deploy to staging
- `master` → Requires manual approval for production

### Documentation
- **[Quick Setup Guide](docs/CI-CD-SETUP.md)** - Get started in 30 minutes
- **[Full Documentation](docs/CI-CD.md)** - Comprehensive CI/CD guide

---

## Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/bk-leducphuong/Booking-webite.git
   cd hotel-booking-website

## Run with Docker
1. **Build and Run with Docker Compose**
   ```bash
   docker-compose up --build
   ```

2. **Access the Application**
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3000

3. **Stop the Containers**
   ```bash
   docker-compose down
   ```

Note: Make sure Docker and Docker Compose are installed on your system.

## Backend Setup

The backend is built with Node.js and uses MySQL as the database.
### Steps
1. **Install dependencies**
   ```bash
   cd server
   npm install
2. **Set Up the Environment Variables**
3. **Start backend server**
   ```bash
   npm run dev

## Frontend Setup

The frontend is built with Vuejs.
### Steps
1. **Install dependencies**
   ```bash
   cd client
   npm install
2. **Set Up the Environment Variables**
3. **Start backend server**
   ```bash
   npm run dev

## Run stripe webhook
Run in terminal
```bash
stripe listen --forward-to http://localhost:3000/stripe/webhook
```

## Scrape data (for test)
Document comming soon...



