# TravelNest – Hotel Booking Platform

[![Backend CI](https://github.com/bk-leducphuong/TravelNest-Hotel_Booking_System/actions/workflows/backend.yml/badge.svg)](https://github.com/bk-leducphuong/TravelNest-Hotel_Booking_System/actions/workflows/backend.yml)
[![Frontend CI](https://github.com/bk-leducphuong/TravelNest-Hotel_Booking_System/actions/workflows/frontend.yml/badge.svg)](https://github.com/bk-leducphuong/TravelNest-Hotel_Booking_System/actions/workflows/frontend.yml)
[![Admin Client CI](https://github.com/bk-leducphuong/TravelNest-Hotel_Booking_System/actions/workflows/admin-client.yml/badge.svg)](https://github.com/bk-leducphuong/TravelNest-Hotel_Booking_System/actions/workflows/admin-client.yml)
[![Superadmin Client CI](https://github.com/bk-leducphuong/TravelNest-Hotel_Booking_System/actions/workflows/superadmin-client.yml/badge.svg)](https://github.com/bk-leducphuong/TravelNest-Hotel_Booking_System/actions/workflows/superadmin-client.yml)
[![Analytics Service CI](https://github.com/bk-leducphuong/TravelNest-Hotel_Booking_System/actions/workflows/analytics-service.yml/badge.svg)](https://github.com/bk-leducphuong/TravelNest-Hotel_Booking_System/actions/workflows/analytics-service.yml)
[![Media Service CI](https://github.com/bk-leducphuong/TravelNest-Hotel_Booking_System/actions/workflows/media-service.yml/badge.svg)](https://github.com/bk-leducphuong/TravelNest-Hotel_Booking_System/actions/workflows/media-service.yml)
[![Notification Service CI](https://github.com/bk-leducphuong/TravelNest-Hotel_Booking_System/actions/workflows/notification-service.yml/badge.svg)](https://github.com/bk-leducphuong/TravelNest-Hotel_Booking_System/actions/workflows/notification-service.yml)
[![Validate Deploy Manifests](https://github.com/bk-leducphuong/TravelNest-Hotel_Booking_System/actions/workflows/deploy-validate.yml/badge.svg)](https://github.com/bk-leducphuong/TravelNest-Hotel_Booking_System/actions/workflows/deploy-validate.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

<p align="center">
  <img src="https://github.com/bk-leducphuong/TravelNest/blob/master/docs/images/logo.png" width="260" alt="TravelNest logo">
</p>

TravelNest is a full-stack hotel booking platform inspired by [booking.com](https://booking.com). Guests can search and book stays, while property owners manage listings, availability, pricing, and analytics through a dedicated admin interface.

> **Video demo**: [`YouTube playlist`](https://www.youtube.com/watch?v=-jxhmIJp988&list=PLCt2C1YyUqcCfEhqOXE-Mul8UINudlCse)

### Live URLs

A single **production** environment runs on a Hetzner VPS (**k3s** + Argo CD),
exposed through a **Cloudflare Tunnel**.

| Service | URL |
|---|---|
| **Guest app** | [deployserver.work](https://deployserver.work) |
| **Admin console** | [admin.deployserver.work](https://admin.deployserver.work) |
| **Superadmin console** | [superadmin.deployserver.work](https://superadmin.deployserver.work) |
| **Backend API** | [api.deployserver.work](https://api.deployserver.work) — Swagger at `/api-docs` (enabled in non-production, and in production only when `ENABLE_API_DOCS=true`) |
| **Keycloak** | [keycloak.deployserver.work](https://keycloak.deployserver.work) |
| **Media storage (MinIO)** | [storage.deployserver.work](https://storage.deployserver.work) |
| **Argo CD** | [argocd.deployserver.work](https://argocd.deployserver.work) (behind Cloudflare Access) |

Elasticsearch (search/logs) is external — hosted on **Elastic Cloud** — while
MySQL, Redis, MinIO, MongoDB, NATS and Keycloak all run in-cluster.

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
- **Multi‑language**: English & Vietnamese with an in‑app language switcher.

### For Property Owners / Admin

![TravelNest Admin UI](https://github.com/bk-leducphuong/TravelNest/blob/master/docs/images/admin_booking_website.png)

- **Property management**: Manage listings, photos, policies, and room inventory.
- **Booking management**: View and manage guest reservations.
- **Guest engagement**: Respond to reviews and send notifications.
- **Analytics dashboards**: Track bookings, revenue, and review performance.

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
| **Deployment** | k3s + Argo CD GitOps (Hetzner VPS), Cloudflare Tunnel, GitHub Actions |

---

## Monorepo Structure

```
travelnest-monorepo/
├── client/           Vue 3 user-facing web app
├── admin-client/     Nuxt 4 admin dashboard
├── superadmin-client/ Nuxt 4 superadmin console
├── server/           Express API, workers, data access, integrations
├── services/         Go microservices (analytics, media, notification)
├── deploy/           Kubernetes manifests, Terraform, scripts, docs
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

See the **[Wiki: Getting Started](https://github.com/bk-leducphuong/TravelNest/wiki/Getting-Started)** for detailed setup instructions, and the
**[Demo Guide](wiki/Demo-Guide.md)** for a repeatable demo bring-up, seeded accounts and a suggested demo script.

```bash
# Clone the repository
git clone https://github.com/bk-leducphuong/TravelNest.git
cd TravelNest

# Install dependencies (Yarn Workspaces)
yarn install

# Start the backend API
yarn dev:server

# Start the user client (in another terminal)
yarn dev:guest

# Start the admin client (in another terminal)
yarn dev:admin
```

---

## CI/CD & Deployment

GitHub Actions build, test, and push Docker images for all packages, tagged with
an immutable `sha-<short-commit>` (plus `latest` on the default branch). Builds
are multi-arch (`linux/amd64`, `linux/arm64`) and pull their public base images
through Google's Docker Hub mirror (`mirror.gcr.io`) to stay under Docker Hub's
pull-rate limit. Dependency installs run through Yarn Berry from the committed
root `yarn.lock`, and the container builds use the same lockfile. **Only `master`
publishes images** — `develop` builds are build-only, so unreleased code can
never reach production.

The active deployment is **Kubernetes + Argo CD GitOps** — manifests live in
`deploy/k8s/` and Argo CD auto-syncs changes. After a successful **master**
build, the workflow promotes the image by committing the immutable `sha-*` tag
straight into the matching `deploy/k8s/apps/*/overlays/prod/kustomization.yaml`
(via `deploy/scripts/ci/update-image-tag.sh`); Argo CD's automated sync then
rolls the workload out. Every deploy is therefore a revertible Git commit — no
manual tag edits and no in-cluster tag poller. Changes under `deploy/**` are
rendered and schema-checked by the `Validate Deploy Manifests` workflow before
they can reach the cluster. Database migrations run as an Argo CD PreSync hook.

> **Quality gates are currently advisory.** The lint, formatting and unit-test
> steps run but do not block builds (`continue-on-error`) because the repository
> has pre-existing failures that predate this pipeline. Remove the
> `continue-on-error` flags once the debt is cleared — see the `TODO(quality-debt)`
> comments in `.github/workflows/`.

The legacy Docker Compose stack has been retired; **Kubernetes + Argo CD** is the
only deployment path.

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
