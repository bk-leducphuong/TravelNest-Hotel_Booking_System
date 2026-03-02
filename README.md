## TravelNest – Hotel Booking Platform

[![Backend CI](https://github.com/bk-leducphuong/TravelNest/actions/workflows/ci-backend.yml/badge.svg)](https://github.com/bk-leducphuong/TravelNest/actions/workflows/ci-backend.yml)
[![Frontend CI](https://github.com/bk-leducphuong/TravelNest/actions/workflows/ci-frontend.yml/badge.svg)](https://github.com/bk-leducphuong/TravelNest/actions/workflows/ci-frontend.yml)
[![Docker Build](https://github.com/bk-leducphuong/TravelNest/actions/workflows/docker-build-push.yml/badge.svg)](https://github.com/bk-leducphuong/TravelNest/actions/workflows/docker-build-push.yml)

<p align="center">
  <img src="https://github.com/bk-leducphuong/TravelNest/blob/master/docs/images/logo.png" width="260" alt="TravelNest logo">
</p>

TravelNest is a full-stack hotel booking platform inspired by [booking.com](https://booking.com).
Guests can search and book stays, while property owners manage listings, availability, pricing, and analytics through a dedicated admin interface.

> **Video demo**: [`YouTube playlist`](https://www.youtube.com/watch?v=-jxhmIJp988&list=PLCt2C1YyUqcCfEhqOXE-Mul8UINudlCse)

---

## Features

### For Guests

![TravelNest Guest UI](https://github.com/bk-leducphuong/TravelNest/blob/master/docs/images/booking_website.png)

- **Browse & search**: Filter by location, date, price, rating, and amenities.
- **Real‑time availability**: See up‑to‑date room availability and pricing.
- **Bookings**: Create, manage, and cancel reservations.
- **Reviews**: Rate and review properties after your stay.
- **Multi‑language**: Support for Vietnamese and English.

### For Property Owners / Admin

![TravelNest Admin UI](https://github.com/bk-leducphuong/TravelNest/blob/master/docs/images/admin_booking_website.png)

- **Property management**: Manage listings, photos, policies, and room inventory.
- **Booking management**: View and manage guest reservations.
- **Guest engagement**: Respond to reviews and notifications.
- **Analytics dashboards**: Track bookings, revenue, and review performance.
- **Multi‑language**: Manage content for multiple locales.

### Planned AI Features

- **Review sentiment analysis** to help owners understand guest feedback at scale.
- **Smart recommendations** for guests based on behavior and preferences.

---

## Tech Overview

- **Frontend (User app)**: Vue 3, Vite, Vue Router, Vuex, Element Plus, Leaflet.
- **Admin app**: Nuxt 4, Pinia, Tailwind CSS, Element Plus.
- **Backend**: Node.js, Express.js, Sequelize ORM.
- **Data & Infra**:
  - MySQL (primary database)
  - Redis (cache, sessions, queues)
  - Elasticsearch (search + logs)
  - ClickHouse (analytics)
  - MinIO / S3‑compatible object storage
- **Integrations**: Stripe (payments), Infobip (SMS), email validation, Nodemailer, Socket.IO.
- **Deployment**: Docker Compose on a VPS behind Cloudflare Tunnel, with GitHub Actions CI/CD.

---

## Monorepo Structure

This repository is structured as a monorepo:

- **`server/`** – Node.js/Express API and background workers  
  See `server/README.md` for:
  - Tech stack details
  - Local setup (DB, Redis, Elasticsearch, ClickHouse)
  - Running and testing the API

- **`client/`** – Vue 3 user‑facing web app  
  See `client/README.md` for:
  - Frontend tech choices and architecture
  - Local development and build commands

- **`admin-client/`** – Nuxt 4 admin dashboard  
  See `admin-client/README.md` for:
  - Admin features and tech stack
  - Dev, build, and test commands

- **`deploy/`** – Infrastructure and deployment automation  
  See `deploy/README.md` for:
  - VPS layout and architecture diagram
  - Docker Compose stack and services
  - CI/CD integration, backups, and hardening

Additional tools (e.g. scrapers or data utilities) may live in separate subdirectories.

---

## Getting Started (Local Development)

This is a high‑level overview; each package has its own detailed README.

1. **Clone the repository**

   ```bash
   git clone https://github.com/bk-leducphuong/TravelNest.git
   cd TravelNest
   ```

2. **Start the backend**

   See `server/README.md` for full instructions, but in short:

   ```bash
   cd server
   npm install
   # configure .env for MySQL, Redis, etc.
   npm run db:init
   npm run migrate
   npm run seed:all:quick
   npm run dev
   ```

3. **Start the user client**

   ```bash
   cd client
   npm install
   # configure Vite env (VITE_API_BASE_URL, etc.)
   npm run dev
   ```

4. **Start the admin client**

   ```bash
   cd admin-client
   npm install
   # configure Nuxt env (NUXT_API_BASE_URL / NUXT_PUBLIC_*)
   npm run dev
   ```

For production deployment, refer to `deploy/README.md`.

---

## CI/CD & Deployment

GitHub Actions are used to:

- Lint and test the backend and frontends.
- Build and push Docker images to a container registry.
- Deploy updated images and static assets to a VPS using Docker Compose.

High‑level CI/CD and deployment details live in:

- `deploy/docs/CICD.md`
- `deploy/docs/VPS_SETUP_GUIDE.md`
- `deploy/docs/VPS_SETUP_COMPLETE.md`

---

## Contributing & Roadmap

If you are interested in contributing, you can:

- Improve test coverage across `server`, `client`, and `admin-client`.
- Help refine the deployment & monitoring story (`deploy`).
- Experiment with the planned AI‑powered features.

Each package (`server`, `client`, `admin-client`, `deploy`) includes a **Roadmap** section
with future improvements specific to that part of the system.

