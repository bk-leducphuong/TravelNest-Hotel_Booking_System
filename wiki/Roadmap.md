# Roadmap

## Current Focus

### Migration to Microservices
- ✅ Analytics, media, notification extracted to Go services
- ✅ NATS JetStream event bus operational
- ✅ Kubernetes + Argo CD GitOps deployment active
- 🔄 Full decomposition of monolith into domain services
- ⏳ Keycloak migration for unified authentication

### Testing
- ✅ Server: Jest + Testcontainers unit/integration tests
- ✅ Client: Vitest + Playwright tests
- ✅ Admin: Vitest + Nuxt test utils + Playwright
- 🔄 Improving integration test coverage for payments, notifications
- ⏳ Expanding E2E coverage for complex booking/admin workflows

---

## Planned Features

### AI & Intelligence
- **Review sentiment analysis** — Automatically classify reviews as positive/negative/neutral and extract key themes to help owners understand guest feedback at scale
- **Smart recommendations** — Personalized hotel recommendations based on guest browsing behavior, past bookings, and preferences

### Backend
- [ ] Full OpenAPI/Swagger coverage for all endpoints
- [ ] Feature flags for gradual rollout
- [ ] Per-tenant and per-user rate limiting
- [ ] Improved observability (metrics, distributed tracing)
- [ ] Background jobs for reporting and data exports

### User Client
- [ ] Improved accessibility (ARIA, keyboard nav, contrast)
- [ ] Route-level code splitting for better performance
- [ ] Offline resilience and error states

### Admin Client
- [ ] Infinite scroll / table virtualization for large datasets
- [ ] Role-based UI visibility
- [ ] Auditing views for sensitive actions (refunds, payouts)
- [ ] Enhanced analytics dashboards

### Infrastructure
- [ ] Monitoring and alerting (Grafana / Prometheus)
- [ ] Automated backup verification
- [ ] Canary deployments with Argo CD
- [ ] Disaster recovery plan

---

## How to Help

See [Contributing](Contributing) for how to get involved. Areas that need the most help:
- Test coverage improvements
- Documentation
- AI feature implementation
- Infrastructure hardening
