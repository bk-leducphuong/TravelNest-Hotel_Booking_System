# TravelNest — Hotel Booking Platform

[![Backend CI](https://github.com/bk-leducphuong/TravelNest/actions/workflows/backend.yml/badge.svg)](https://github.com/bk-leducphuong/TravelNest/actions/workflows/backend.yml)
[![Frontend CI](https://github.com/bk-leducphuong/TravelNest/actions/workflows/frontend.yml/badge.svg)](https://github.com/bk-leducphuong/TravelNest/actions/workflows/frontend.yml)
[![Admin Client CI](https://github.com/bk-leducphuong/TravelNest/actions/workflows/admin-client.yml/badge.svg)](https://github.com/bk-leducphuong/TravelNest/actions/workflows/admin-client.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/bk-leducphuong/TravelNest/blob/master/LICENSE)

<p align="center">
  <img src="https://github.com/bk-leducphuong/TravelNest/blob/master/docs/images/logo.png" width="260" alt="TravelNest logo">
</p>

TravelNest is a full-stack hotel booking platform inspired by [booking.com](https://booking.com). Guests can search and book stays, while property owners manage listings, availability, pricing, and analytics through a dedicated admin interface.

> **Video demo**: [YouTube playlist](https://www.youtube.com/watch?v=-jxhmIJp988&list=PLCt2C1YyUqcCfEhqOXE-Mul8UINudlCse)

## Live URLs

| Service | URL |
|---|---|
| User Client | [deployserver.work](https://deployserver.work) |
| Admin Client | [admin.deployserver.work](https://admin.deployserver.work) |
| Backend API (Swagger) | [api.deployserver.work/api-docs](https://api.deployserver.work/api-docs) |
| Kibana Dashboard | [kibana.deployserver.work](https://kibana.deployserver.work) |

## Quick Links

- [Getting Started](Getting-Started) — set up your local development environment
- [Architecture](Architecture) — understand the system design
- [Contributing](Contributing) — how to contribute to TravelNest
- [Roadmap](Roadmap) — planned features and improvements

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend (User) | Vue 3, Vite, Vue Router, Vuex, Element Plus, Leaflet, i18n |
| Admin App | Nuxt 4, Pinia, Tailwind CSS, Element Plus, TypeScript |
| Backend API | Node.js, Express.js, Sequelize ORM (MySQL) |
| Background Jobs | BullMQ (Redis-backed queues) |
| Microservices | Go services: analytics, media, notification (NATS messaging) |
| Primary Database | MySQL 8.0 |
| Search & Logs | Elasticsearch 8.11 |
| Analytics | MongoDB + Mongoose, ClickHouse |
| Cache & Queues | Redis 7 |
| Object Storage | MinIO / S3-compatible |
| Payments | Stripe |
| Notifications | Nodemailer, Infobip (SMS), Socket.IO |
| Auth | Session-based, Passport (Google, Twitter), Keycloak |
| Deployment | Kubernetes + Argo CD GitOps, Docker Compose (legacy), GitHub Actions |

## Repository Structure

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
