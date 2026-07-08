# TravelNest – Hotel Booking Platform

[![Backend CI](https://github.com/bk-leducphuong/TravelNest/actions/workflows/backend.yml/badge.svg)](https://github.com/bk-leducphuong/TravelNest/actions/workflows/backend.yml)
[![Frontend CI](https://github.com/bk-leducphuong/TravelNest/actions/workflows/frontend.yml/badge.svg)](https://github.com/bk-leducphuong/TravelNest/actions/workflows/frontend.yml)
[![Admin Client CI](https://github.com/bk-leducphuong/TravelNest/actions/workflows/admin-client.yml/badge.svg)](https://github.com/bk-leducphuong/TravelNest/actions/workflows/admin-client.yml)
[![Analytics Service CI](https://github.com/bk-leducphuong/TravelNest/actions/workflows/analytics-service.yml/badge.svg)](https://github.com/bk-leducphuong/TravelNest/actions/workflows/analytics-service.yml)
[![Media Service CI](https://github.com/bk-leducphuong/TravelNest/actions/workflows/media-service.yml/badge.svg)](https://github.com/bk-leducphuong/TravelNest/actions/workflows/media-service.yml)
[![Notification Service CI](https://github.com/bk-leducphuong/TravelNest/actions/workflows/notification-service.yml/badge.svg)](https://github.com/bk-leducphuong/TravelNest/actions/workflows/notification-service.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

<p align="center">
  <img src="https://github.com/bk-leducphuong/TravelNest/blob/master/docs/images/logo.png" width="260" alt="TravelNest logo">
</p>

TravelNest is a full-stack hotel booking platform inspired by [booking.com](https://booking.com). Guests can search and book stays, while property owners manage listings, availability, pricing, and analytics through a dedicated admin interface.

> **Video demo**: [`YouTube playlist`](https://www.youtube.com/watch?v=-jxhmIJp988&list=PLCt2C1YyUqcCfEhqOXE-Mul8UINudlCse)

### Live URLs

- **User Client** → [deployserver.work](https://deployserver.work)
- **Admin Client** → [admin.deployserver.work](https://admin.deployserver.work)
- **Backend API** → [api.deployserver.work/api-docs](https://api.deployserver.work/api-docs) (Swagger)
- **Kibana Dashboard** → [kibana.deployserver.work](https://kibana.deployserver.work)

---

## Table of Contents

- [Features](#features)
- [Tech Overview](#tech-overview)
- [Monorepo Structure](#monorepo-structure)
- [Getting Started](#getting-started)
- [CI/CD & Deployment](#cicd--deployment)
- [Contributing](#contributing)
- [Wiki](#wiki)

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
- **Guest engagement**: Respond to reviews and send notifications.
- **Analytics dashboards**: Track bookings, revenue, and review performance.
- **Multi‑locale content management**.

---

## Tech Overview

| Layer | Technology |
|---|---|
| **Frontend (User)** | Vue 3, Vite, Vue Router, Vuex, Element Plus, Leaflet, i18n |
| **Admin App** | Nuxt 4, Pinia, Tailwind CSS, Element Plus, TypeScript |
| **Backend API** | Node.js, Express.js, Sequelize ORM (MySQL) |
| **Background Jobs** | BullMQ (Redis-backed queues) |
| **Microservices** | Go services: analytics, media, notification (NATS messaging) |
| **Primary Database** | MySQL 8.0 |
| **Search & Logs** | Elasticsearch 8.11 |
| **Analytics** | MongoDB + Mongoose, ClickHouse |
| **Cache & Queues** | Redis 7 |
| **Object Storage** | MinIO / S3-compatible |
| **Payments** | Stripe |
| **Notifications** | Nodemailer, Infobip (SMS), Socket.IO |
| **Auth** | Session-based, Passport (Google, Twitter), Keycloak |
| **Deployment** | Kubernetes + Argo CD GitOps, Docker Compose (legacy), GitHub Actions |

---

## Monorepo Structure

```
travelnest-monorepo/
├── client/           Vue 3 user-facing web app
├── admin-client/     Nuxt 4 admin dashboard
├── server/           Express API, workers, data access, integrations
├── services/         Go microservices (analytics, media, notification)
├── deploy/           Kubernetes manifests, Docker Compose, scripts, docs
├── scrape_data/      Data scraping utilities
├── docs/             Documentation and images
├── wiki/             GitHub Wiki pages (version-controlled)
└── plan/             Architecture and migration plans
```

Each package has its own detailed README:
- [`server/README.md`](server/README.md) — API setup, environment, testing
- [`client/README.md`](client/README.md) — User frontend development
- [`admin-client/README.md`](admin-client/README.md) — Admin dashboard development
- [`deploy/README.md`](deploy/README.md) — Infrastructure and deployment

---

## Getting Started

See the **[Wiki: Getting Started](https://github.com/bk-leducphuong/TravelNest/wiki/Getting-Started)** for detailed setup instructions.

```bash
# Clone the repository
git clone https://github.com/bk-leducphuong/TravelNest.git
cd TravelNest

# Install dependencies (Yarn Workspaces)
yarn install

# Start the backend API
yarn dev:server

# Start the user client (in another terminal)
yarn dev:client

# Start the admin client (in another terminal)
yarn dev:admin
```

---

## CI/CD & Deployment

GitHub Actions build and push Docker images for all packages. The active deployment uses **Kubernetes + Argo CD GitOps** — manifests live in `deploy/k8s/` and Argo CD auto-syncs changes. A legacy Docker Compose stack is in `deploy/docker/` for rollback reference.

See the **[Wiki: Deployment](https://github.com/bk-leducphuong/TravelNest/wiki/Deployment)** and **[Wiki: CI-CD](https://github.com/bk-leducphuong/TravelNest/wiki/CI-CD)** for details.

---

## Contributing

We welcome contributions! Please see:

- **[Wiki: Contributing](https://github.com/bk-leducphuong/TravelNest/wiki/Contributing)** — branching, PR checklist, conventions
- **[AGENT.md](AGENT.md)** — guide for AI coding agents working in this monorepo

Areas that need the most help:
- Improve test coverage across all packages
- Refine deployment & monitoring
- Experiment with planned AI-powered features (sentiment analysis, recommendations)

---

## Wiki

Comprehensive documentation lives in the **[GitHub Wiki](https://github.com/bk-leducphuong/TravelNest/wiki)** (also mirrored in `wiki/`):

- [Architecture](https://github.com/bk-leducphuong/TravelNest/wiki/Architecture)
- [Getting Started](https://github.com/bk-leducphuong/TravelNest/wiki/Getting-Started)
- [Backend Development](https://github.com/bk-leducphuong/TravelNest/wiki/Backend-Development)
- [Frontend Development](https://github.com/bk-leducphuong/TravelNest/wiki/Frontend-Development)
- [Go Microservices](https://github.com/bk-leducphuong/TravelNest/wiki/Go-Microservices)
- [API Reference](https://github.com/bk-leducphuong/TravelNest/wiki/API-Reference)
- [Database Schema](https://github.com/bk-leducphuong/TravelNest/wiki/Database-Schema)
- [Deployment](https://github.com/bk-leducphuong/TravelNest/wiki/Deployment)
- [CI/CD](https://github.com/bk-leducphuong/TravelNest/wiki/CI-CD)
- [Testing](https://github.com/bk-leducphuong/TravelNest/wiki/Testing)
- [Contributing](https://github.com/bk-leducphuong/TravelNest/wiki/Contributing)
- [Roadmap](https://github.com/bk-leducphuong/TravelNest/wiki/Roadmap)
