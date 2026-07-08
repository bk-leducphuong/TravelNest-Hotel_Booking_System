# Architecture

## System Overview

TravelNest follows a **monorepo architecture** with a Node.js/Express backend, two Vue 3 frontends, and evolving Go microservices. The system is migrating from a monolith to a microservices architecture using NATS JetStream as the event bus.

```
┌─────────────────────────────────────────────────────────┐
│                     Cloudflare Tunnel                    │
└──────────────────────┬──────────────────────────────────┘
                       │
              ┌────────┴────────┐
              │   Ingress (k3s) │
              └────────┬────────┘
                       │
         ┌─────────────┼──────────────┐
         │             │              │
    ┌────┴────┐  ┌────┴────┐  ┌─────┴─────┐
    │  User   │  │  Admin  │  │    API    │
    │ Client  │  │ Client  │  │ (Express) │
    │ (Vue 3) │  │(Nuxt 4) │  │  Node.js  │
    └─────────┘  └─────────┘  └─────┬─────┘
                                    │
         ┌──────────────────────────┼──────────────────────┐
         │          │               │              │       │
    ┌────┴────┐ ┌───┴────┐   ┌─────┴──────┐ ┌─────┴───┐ ┌──┴────┐
    │  MySQL  │ │ Redis  │   │Elasticsearch│ │ MongoDB │ │ MinIO │
    │  (SQL)  │ │(Cache) │   │  (Search)   │ │(Analyt.)│ │(Stor.)│
    └─────────┘ └───┬────┘   └────────────┘ └─────────┘ └───────┘
                    │
              ┌─────┴─────┐
              │  BullMQ   │
              │ (Workers) │
              └───────────┘
                                   
         ┌──────────────────────────┐
         │     NATS JetStream       │
         │     (Event Bus)          │
         └────┬──────┬──────┬───────┘
              │      │      │
        ┌─────┴┐ ┌───┴──┐ ┌┴────────┐
        │Analyt.│ │Media │ │Notific. │
        │  (Go) │ │ (Go) │ │  (Go)   │
        └───────┘ └──────┘ └─────────┘
```

## Component Breakdown

### Frontend Layer
- **User Client** (`client/`): Vue 3 SPA for guests — browse hotels, search, book, review
- **Admin Client** (`admin-client/`): Nuxt 4 app for property owners/admins — manage listings, bookings, analytics

### Backend Layer
- **API Server** (`server/`): Express.js REST API, Socket.IO realtime, BullMQ background workers
- **Go Microservices** (`services/`): Analytics, media processing, and notification services
- **Message Bus**: NATS JetStream for async communication between Node.js and Go services

### Data Layer
- **MySQL 8.0**: Primary relational database (Sequelize ORM, 47+ models)
- **Redis 7**: Caching, session storage, BullMQ queue backend
- **Elasticsearch 8.11**: Hotel search (edge ngram, geo, completion suggest) + log aggregation
- **MongoDB**: Analytics events (search logs, hotel view events)
- **MinIO**: S3-compatible object storage for images and media
- **ClickHouse**: Analytics data warehouse (search logs)

### External Integrations
- **Stripe**: Payment processing, webhooks, refunds, payouts, ledger
- **Infobip**: SMS notifications
- **Nodemailer**: Email delivery
- **Passport**: Google and Twitter OAuth

## Migration Path

The project is actively migrating from a Node.js monolith toward Go microservices:

1. ✅ **Phase 1**: Extract analytics, media, and notification into Go services
2. 🔄 **Phase 2**: Adopt NATS JetStream for event-driven communication
3. 🔄 **Phase 3**: Migrate from Docker Compose to Kubernetes + Argo CD
4. ⏳ **Phase 4**: Keycloak integration for unified auth
5. ⏳ **Phase 5**: Full microservice decomposition

## Request Flow

```
Browser → Cloudflare Tunnel → Ingress → Service (k3s)
                                              │
                                     ┌────────┴────────┐
                                     │  API (Express)   │
                                     └────────┬────────┘
                                              │
                    ┌─────────────────────────┼──────────────────────┐
                    │              │          │             │        │
              ┌─────┴────┐  ┌─────┴────┐ ┌───┴────┐  ┌────┴────┐   │
              │ Validator│  │Controller│ │Service │  │Repository│   │
              │  (Joi)   │  │  (thin)  │ │(logic) │  │  (DB)   │   │
              └──────────┘  └──────────┘ └────────┘  └─────────┘   │
                                                                    │
              ┌─────────────────────────────────────────────────────┘
              │
        ┌─────┴─────┐
        │ Middleware │
        │(auth,cors, │
        │ rate-limit)│
        └───────────┘
```
