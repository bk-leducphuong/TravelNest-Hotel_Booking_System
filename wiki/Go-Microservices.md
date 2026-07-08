# Go Microservices

TravelNest has three Go microservices under `services/`, communicating with the Node.js backend via NATS JetStream.

## Overview

```
┌──────────────────────┐
│  Express API (Node)  │
└──────┬───────────────┘
       │ NATS JetStream
       │
┌──────┼──────┬──────┬──┘
│      │      │      │
│ ┌────┴──┐ ┌─┴───┐ ┌┴────────┐
│ │Analyt.│ │Media│ │Notific. │
│ │ (Go)  │ │(Go) │ │  (Go)   │
│ └───────┘ └─────┘ └─────────┘
│
│ Data Stores:
│ ┌────────┐ ┌──────┐ ┌────────┐
│ │MongoDB │ │MinIO │ │ MySQL  │
│ └────────┘ └──────┘ └────────┘
```

## Analytics Service (`services/analytics/`)

Handles search analytics and hotel view tracking.

- **Language**: Go 1.22
- **Dependencies**: NATS, Redis, MongoDB
- **Events consumed**: search.queries, hotel.views
- **Storage**: MongoDB (analytics data)

## Media Service (`services/media/`)

Handles image processing and media management.

- **Language**: Go 1.22
- **Dependencies**: NATS, MinIO, MySQL
- **Events consumed**: media.process, image.resize
- **Storage**: MinIO (images), MySQL (metadata)

## Notification Service (`services/notification/`)

Handles email and SMS notifications.

- **Language**: Go 1.22
- **Dependencies**: NATS, MySQL
- **Events consumed**: notification.send (email, SMS)
- **Storage**: MySQL (notification logs)

## Developing a New Service

1. Create a new directory under `services/`
2. Follow the existing structure:
   ```
   services/your-service/
   ├── cmd/api/         Entry point
   ├── internal/
   │   ├── config/     Configuration
   │   ├── events/     NATS handlers
   │   ├── model/      Domain models
   │   ├── service/    Business logic
   │   └── ...         Service-specific packages
   ├── Dockerfile
   ├── go.mod
   └── .env.format
   ```
3. Add NATS event subscriptions in the internal/events package
4. Add a Dockerfile for containerized deployment
5. Register the service in `deploy/k8s/apps/` manifests
6. Add a GitHub Actions workflow (see existing examples in `.github/workflows/`)

## Running Locally

```bash
cd services/analytics
cp .env.format .env
go mod download
go run ./cmd/api
```

## Commands (from repo root)

```bash
yarn dev:analytics       # Start analytics service
yarn dev:media           # Start media service
yarn dev:notification    # Start notification service
yarn build:analytics     # Build binary
yarn build:media
yarn build:notification
```
