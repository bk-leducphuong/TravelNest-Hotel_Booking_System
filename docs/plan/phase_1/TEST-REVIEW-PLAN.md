# TravelNest — Feature Test & Production-Readiness Review Plan

_Phase 1 — local dev stack · exhaustive A–Z · high-level outline_

This plan extends (does not duplicate) the existing
[`guest-e2e-test-plan.md`](../../guest-e2e-test-plan.md) and
[`PRODUCTION_READINESS.md`](../../PRODUCTION_READINESS.md), and covers every
surface in the monorepo.

---

## 1. Objective

Work through **every feature, one by one**, reviewing each across UI/UX,
API/contract, security/authz, data integrity, error/edge behaviour, performance,
and observability — then classify each as **production-ready** or **needs work**,
with evidence.

## 2. Environment & tooling (local dev stack)
Note: i brough up the local dev stack and ran the backend, frontend (guest and admin)

- **Bring-up:** docker-compose infra (MySQL, Redis, Elasticsearch, MongoDB,
  MinIO, NATS) + Keycloak, then `yarn dev:server`, `yarn dev:client`,
  `yarn dev:admin`; Go services `analytics`/`media`/`notification`; Stripe CLI
  (`stripe listen`) for webhooks. Set `RATE_LIMIT_ENABLED` deliberately per test.
- **Test data:** `yarn demo:seed` (server seeders: database/elasticsearch/mongodb).
  Guest creds per `server/__tests__/e2e/env.js`.
- **Tooling per axis:**
  - API → existing Jest + supertest e2e (`server/__tests__/e2e`) and integration
    suites; `curl`/REST for spot checks; Swagger at `/api-docs`.
  - UI/UX → Playwright MCP against real Chrome (as in the guest run) for guest
    and admin.
  - Security → manual authz matrix (permission × route), token tampering, IDOR,
    header/CORS checks.
  - Data → direct DB inspection, Redis queue inspection.
  - Ops → Bull Board (`/admin/queues`), `/health`, Kibana/ES, service healthz.

## 3. Review rubric — the axes applied to *every* feature

1. **UI/UX** — happy path, loading/empty/error states, validation feedback,
   responsive (390px), a11y (`aria-label`, labels, keyboard, contrast),
   i18n (EN/VI), consistency.
2. **API/contract** — request/response shape, status codes, pagination,
   validation messages, OpenAPI accuracy.
3. **Security/authz** — authentication required, correct permission, IDOR/tenant
   isolation, input sanitization, PII handling.
4. **Data integrity** — transactions, constraints, idempotency, race conditions.
5. **Error/edge** — negative cases, concurrency, not-found, conflicts, boundary
   values.
6. **Performance** — N+1, latency, large-data pagination.
7. **Observability** — logs (no PII), audit entries, metrics, event emission.
8. **Infra dependency** — behaviour when ES/Redis/NATS/Stripe/services degrade.

## 4. Status & severity scale

- **Status:** ✅ Ready · 🟡 Partial (needs work) · ❌ Not ready · ⬜ Not reviewed
- **Severity:** S1 blocks a core flow · S2 breaks a secondary flow/security ·
  S3 usability/edge · S4 cosmetic.

## 5. Feature inventory (A–Z, exhaustive)

> Each entry: *where it lives → what to check → risk focus.*

**A. Public discovery & content** — Home, trending hotels/destinations,
recently-viewed, hotel batch, nearby places.
UI (`HomeView`, `SearchResults` trending rows); API
`GET /hotels/trending|recently-viewed`, `POST /hotels/batch`,
`GET /hotels/:id/nearby-places`, `GET /search/destinations/trending`.
→ Check caching, empty results, auth-optional behaviour, map (Leaflet) rendering.
_Risk: N+1 on lists, unauthenticated data leakage._

**B. Search** — `GET /search/hotels`, `/search/hotels/:id/availability`,
`/search/autocomplete`, `/search/destinations/autocomplete`, `POST /search/log`,
`/search/recent`. UI `SearchBar`, filters, sort, pagination, shared-link validity.
→ Check filter accuracy, date/TZ handling, ES-dependent degradation, XSS in
highlight (`v-html`), recent-search scoping per user.
_Risk: logged-in vs anonymous (past S1 regression), ES outage._

**C. Hotel details, rooms, policies, public reviews** — `GET /hotels/:id`,
`/rooms`, `/policies`, `/nearby-places`; UI `HotelDetails` (gallery, amenities,
map, room select). → Check room availability/pricing accuracy, policy display,
image gallery. _Risk: room/price mismatch, missing-image handling._

**D. Authentication & session** — register, login, logout, Google/Twitter OAuth,
Keycloak (silent-SSO, ROPC), forgot password, `GET /auth/session`, route guards.
→ Check token/JWT handling, JWKS vs static PEM (R1, open), session expiry,
silent-SSO console errors. _Risk: auth failure returning 401 not 500, redirect loops._

**E. Account & profile** — `GET/PATCH /user`, `PATCH /user/password`,
`PATCH /user/avatar`; UI `AccountSettings`/`SettingDetails`. → Check field
validation, password rules, avatar upload limits/type, partial update semantics.
_Risk: mass-assignment, stored-XSS via profile fields._

**F. Favorites / saved hotels** — `GET/POST /user/favorite-hotels`, check
`/favorite-hotels/:hotelId`, DELETE; UI `SavedHotels`, `SavedHotelIcon`. → Check
UUID contract (past S3 bug fixed), duplicate-favorite, missing-hotel → 404 (past
500 fixed), pagination. _Risk: FK errors surfacing as 5xx._

**G. Holds** — `POST/GET /hold`, `GET/DELETE /hold/:id` + hold-expiry BullMQ job.
→ Check TTL, oversell under concurrency (R5), release on abandon, no idempotency
key (R6, partial). _Risk: inventory leak/oversell._

**H. Bookings (guest)** — `POST /bookings`, `GET /bookings`,
`/bookings/code/:code`, `/:id`, `POST /:id/payment-intent`, `DELETE /:id`; UI
`Book`, `BookingConfirmation`, `Bookings`, `BookingDetails`, `BookingCancellation`.
→ Check idempotency key (R6/R7), double-cancel → 409 (fixed), N+1, nights/TZ math
(fixed), status transitions. _Risk: double-charge, race on cancel._

**I. Payments (guest) & Stripe webhook** — `POST/GET /payments`,
`/payments/bookings/:bookingId`, `/transactions/:id`, `POST /webhooks/stripe`.
→ Check intent lifecycle, webhook signature (fail-closed in prod, R4),
reconciliation `pending_payment → confirmed`, refund visibility.
_Risk: webhook replay, fail-open secret, txn + external I/O (R8, fixed)._

**J. Reviews (guest)** — `GET /reviews/hotels/:hotelId`, `/reviews`,
`/reviews/validate`, `/reviews/check`, `POST /reviews`; UI `Reviews`,
`ReviewDetails`. → Check eligibility (completed booking only), one-review-per-booking,
edit policy, rating-summary projection, image attachments.
_Risk: review without completed booking._

**K. Notifications & realtime** — `GET /notifications`, `/unread-count`,
`PATCH /read-all`, `/:id/read`; Socket.IO (`socket.js`, `userSocket.js`); UI
`Notification`. → Check unread counts, realtime delivery, reconnect, cross-user
leakage. _Risk: socket auth, IDOR on notification id._

**L. Media / images** — `GET /images/:entityType/:entityId`, `POST` (authz +
upload), `PUT .../primary/:imageId`, `DELETE /:id` + image-auth middleware + media
Go service (processing, MinIO). → Check entity-write authorization (past unauth
bug fixed), MIME/size limits, primary-image semantics, orphan cleanup.
_Risk: upload authz bypass, SSRF/storage abuse._

**M. Onboarding / become-a-host** — `POST /join`, `POST /join/photos`; UI
`JoinHome`, `JoinForms`. → Check rate limiting (write limiter), photo upload
(30 max), duplicate submissions, validation, spam/abuse.
_Risk: unauthenticated upload abuse._

**N. Analytics** — `GET /analytics/search/demand`, `/users/me/search-summary`,
`/users/me/searches` + Go analytics service. → Check data scoping (own data only),
aggregation accuracy, ES/Mongo/ClickHouse consistency.
_Risk: cross-user data exposure._

**O. Admin auth, session & RBAC** — Keycloak bearer login, `GET /admin/me`,
hotel switcher, `usePermissions`, `Can.vue`. → Check permission catalog
(`constants/permissions.js`), global vs hotel-role union, `X-Hotel-Id` context
enforcement, platform staff global actions.
_Risk: privilege escalation, missing `requireHotelPermission`, cross-hotel access._

**P. Admin dashboard** — `admin-client/pages/index.vue` + Bar/Donut/Trend charts.
→ Check metric correctness, empty/loading states, responsive tables.
_Risk: wrong/lagging aggregates._

**Q. Admin properties / catalog** — `GET /admin/hotels`, `/:id`, `PATCH`, rooms
CRUD, policies CRUD; UI `properties/index`, `[hotelId]`. → Check permission per
mutation, hotel-context scoping, photos, validation, audit entries.
_Risk: cross-hotel edit (IDOR), missing HOTEL_UPDATE gate._

**R. Admin inventory / availability** — `GET /admin/inventory/hotels/:id/rooms|occupancy`,
`GET/PATCH /rooms/:roomId`; UI `availability/index`. → Check bulk-update
correctness (rules/guards), date ranges, concurrency, `inventory.changed` events.
_Risk: oversell from bad bulk edit._

**S. Admin bookings** — `GET /admin/bookings`, `/hotels/:hotelId/stats|trend`,
`/:id`, `PATCH /:id/status`, `POST /:id/cancel`; UI `bookings/index`,
`[bookingId]`. → Check status state machine (valid transitions), force-cancel
(audit + refund), hotel scoping, stats accuracy.
_Risk: illegal status jumps, cross-hotel access._

**T. Admin payments & refunds** — `GET /admin/payments`, transactions, refunds;
UI `payments/index`, `refunds`, `transactions/[id]`. → Check refund rules
(`domain/refund-rules.js`), partial/full refunds, Stripe reconciliation, audit.
_Risk: over-refund, refund without permission._

**U. Admin payouts & Stripe Connect** — `GET /admin/payouts`,
`/hotels/:id/summary`, `POST /eligible`, connected-accounts
(create/link/sync/check), `/:id/process`, `PATCH /:id/status`; UI `payouts/*`.
→ Check payout lifecycle (`domain/payout-rules.js`), batch generation idempotency,
Connect onboarding states, owner notifications.
_Risk: duplicate/incorrect payouts._

**V. Admin reviews & moderation** — `GET /admin/reviews`, `/summary`, `/:id`,
`PATCH /:id/status`, `POST/PATCH/DELETE /:id/reply`; UI `reviews/*`. → Check
moderation policy, reply CRUD, rating projection updates, hotel scoping.
_Risk: moderating other hotels' reviews._

**W. Internal superadmin API** — `platform/internal` (`/internal/superadmin`,
runner, registries). → Check auth (past fully-unauthenticated bug fixed), token
handling, destructive ops, audit. _Risk: unauthenticated admin._

**X. Search infrastructure** — Elasticsearch indexer, seeders, hybrid search.
→ Check index/DB drift, reindex procedure, degradation when ES down (R10).
_Risk: stale index, no fallback._

**Y. Microservices & eventing** — Go `analytics`/`media`/`notification`; NATS
JetStream; domain events (`review.*`, `payment.refund_*`, `booking.*`,
`inventory.changed`, `payout.*`); audit log. → Check consumer reliability,
no-outbox best-effort delivery (R9, open), idempotent consumers, audit coverage
(R18, partial), service healthz + ports. _Risk: lost events, duplicate processing._

**Z. Platform, infra & ops** — health, rate limiting (R2), CORS (R14), helmet
(R12), body limits (R13, open), env validation (R15), idempotency, graceful
shutdown (R16, open), Bull Board auth, Swagger, K8s/Argo CD + image updater, CI
workflows, observability metrics/tracing. → Check prod-config parity, backup/DR,
canary. _Risk: fail-open guards, exposed dashboards._

## 6. Cross-cutting checks (run once, then verify per feature)

Authz matrix (every route × every role), validation errors, uniform error
envelope (`status/message/errors`), pagination contract, i18n EN/VI coverage,
a11y sweep, responsive 390px, PII redaction in logs, and N+1/query counts.

## 7. Execution order

1. **Tier 0 – Foundations:** Z, D, O, W (auth, RBAC, config, internal API).
2. **Tier 1 – Money & inventory (highest risk):** G, H, I, R, S, T, U.
3. **Tier 2 – Guest core:** A, B, C, F, J, K.
4. **Tier 3 – Admin core:** P, Q, V.
5. **Tier 4 – Content & support:** L, M, N.
6. **Tier 5 – Platform services:** X, Y.
   (Reference the existing guest report for A–N to avoid re-work; focus new effort
   on **O–Z**, which are largely unreviewed.)

## 8. Per-feature review card (template)

```markdown
### <ID> — <Feature>
- Entry points: <UI route / admin page / API endpoints>
- Axes checked: UI/UX · API · Security · Data · Edge · Perf · Observability
- Cases run: <list or link to test file>
- Evidence: <screenshots / test report / curl output / audit rows>
- Findings: <id, severity, symptom, root cause>
- Verdict: ✅ Ready | 🟡 Partial | ❌ Not ready  (with justification)
- Follow-up: <fix / ticket>
```

**Agent prompt template (copy-paste per feature):**

> "Using the local dev stack, review `<Feature ID + endpoints/page>`. Apply the
> 8-axis rubric in `plans/phase_1/TEST-REVIEW-PLAN.md`. Run the listed API cases
> (Jest/supertest) and UI cases (Playwright MCP against the real app). Test authz
> for each relevant role, negatives, and concurrency. Capture evidence, list
> findings with severity S1–S4 and root cause, and give a Ready/Partial/Not-ready
> verdict. Do not modify product code."

## 9. Tracking

A single table: `ID | Feature | Owner | Status | S1 | S2 | S3 | S4 | Evidence | Verdict`.

## 10. Definition of "production-ready" (exit criteria)

- No open **S1/S2**; all core guest + admin flows pass end-to-end.
- Authz matrix complete with no cross-tenant/IDOR gaps; no fail-open security guards.
- Idempotency on all money/hold mutations; races return 4xx not 5xx.
- Observability: audit coverage on sensitive ops, no PII in logs, alerts on
  `/health` + queues.
- Open items from `PRODUCTION_READINESS.md` **R1, R6, R9, R13, R16, R17, R18**
  closed or explicitly accepted.
- Load/soak test evidenced; graceful shutdown verified; backups/DR documented.

## 11. Explicitly out of scope (first pass)

Deep Stripe Connect edge cases, multi-currency/tax, native mobile, and
non-functional DR drills — deferred to a second pass.
