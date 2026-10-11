# K — Notifications & Realtime

> Part of [Phase 1 — Feature Test & Production-Readiness Review](../TEST-REVIEW-PLAN.md).
> **Status:** 🟡 Partial · **Owner:** _TBD_ · **Tier:** 2

## Scope

- **Entry points:** `GET /notifications`, `GET /notifications/unread-count`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`. Realtime: Socket.IO `/user` namespace (`socket.js`, `userSocket.js`). UI: `Notification.vue` (header bell popover).
- **Risk focus:** socket auth, IDOR on notification id.
- **Environment:** local dev stack (API :3000, client :5173), authenticated as Test User, 2026-10-09.

## Review axes

- [x] UI/UX
- [x] API/contract
- [x] Security/authz
- [x] Data integrity
- [x] Error/edge
- [ ] Performance _(N/A)_
- [x] Observability
- [x] Infra dependency _(Go notification service + Socket.IO)_

_(Rubric: see [plan §3](../TEST-REVIEW-PLAN.md#3-review-rubric--the-axes-applied-to-every-feature).)_

## Test cases

| # | Case | Type | Expected | Actual | Pass | Evidence |
|---|------|------|----------|--------|------|----------|
| K-API-01 | list notifications | API | 200 | 200 (type/category/priority/message/metadata) | ✅ | [api.md](./test-results/api.md) |
| K-API-02 | unreadOnly | API | 200 | 200 | ✅ | api.md |
| K-API-03 | unread count | API | 200 | 200 (45) | ✅ | api.md |
| K-API-04 | pagination | API | 200 | 200 | ✅ | api.md |
| K-API-05/06/07 | no token (list / count / read-all) | Security | 401 | 401 | ✅ | api.md |
| K-API-08 | mark one read | API | 200 | 200 | ✅ | api.md |
| K-API-09 | invalid uuid | API | 400 | 400 | ✅ | api.md |
| K-API-10 | user B marks A's notification | Security | deny | **403 FORBIDDEN** | ✅ | api.md |
| K-API-11 | unknown notification | API | 404 | 404 | ✅ | api.md |
| K-API-12→14 | unread 44 → read-all → 0 | Data | count transitions | 44 → 0 | ✅ | api.md |
| K-RT-01 | Socket.IO `/user` connect | Realtime | connects | `[userSocket] connected` + handshake | ✅ | [browser.md](./test-results/browser.md) |
| K-UI-01 | popover renders notifications | UI/UX | list | 20 items render | ✅ | browser.md |
| **K-UI-02** | notification timestamp | UI/UX | real time | **hardcoded "2 hrs ago"** | ❌ | browser.md |
| **K-UI-03** | click → mark read persisted | UI/UX | calls API | **local-only (no API call)** | ❌ | browser.md |
| K-UI-04 | "See all" | UI/UX | navigates | **no-op (console.log)** | ❌ | browser.md |

## Verdict

- **Status:** 🟡 Partial — the notification **API and realtime are production-quality** (scoped,
  IDOR-safe, correct counts, socket auth works), but the popover has three client defects:
  a **fake timestamp** (K-F1), **read-state not persisted on click** (K-F2) and a dead
  "See all" (K-F3). Not production-ready.
- **Open findings:** S1 _0_ · S2 _0_ · S3 _2_ · S4 _2_
- Detail: [review.md](./review.md) · Remediation: [improvements.md](./improvements.md)

## Files

- [`review.md`](./review.md) — findings & verdict detail
- [`improvements.md`](./improvements.md) — remediation work
- [`test-results/`](./test-results/) — raw evidence (api.md, browser.md)
