# N — Analytics (Guest)

> Part of [Phase 1 — Feature Test & Production-Readiness Review](../TEST-REVIEW-PLAN.md).
> **Status:** ✅ Ready · **Owner:** _TBD_ · **Tier:** 4

## Scope

- **Entry points:** `GET /analytics/search/demand` (public), `GET /analytics/users/me/search-summary` (auth), `GET /analytics/users/me/searches` (auth). Backed by the Go **analytics** service (MongoDB/ClickHouse).
- **Risk focus:** cross-user data exposure.
- **Environment:** local dev stack (API :3000, analytics :8081), authenticated as Test User, 2026-10-09.
- **Note:** the guest client does **not** consume these endpoints (no analytics service in `client/src`; the home "Continue your search" uses localStorage). So this feature is **API-only from the guest side** — no guest UI to test.

## Review axes

- [ ] UI/UX _(no guest UI)_
- [x] API/contract
- [x] Security/authz
- [x] Data integrity
- [x] Error/edge
- [ ] Performance _(N/A)_
- [x] Observability
- [x] Infra dependency _(analytics service)_

_(Rubric: see [plan §3](../TEST-REVIEW-PLAN.md#3-review-rubric--the-axes-applied-to-every-feature).)_

## Test cases

| # | Case | Type | Expected | Actual | Pass | Evidence |
|---|------|------|----------|--------|------|----------|
| N-API-01 | search demand (public) | API | 200 | 200 (aggregated by date/destination) | ✅ | [api.md](./test-results/api.md) |
| N-API-02 | demand limit/nextDays | API | 200 | 200 | ✅ | api.md |
| N-API-03 | demand limit=999 | API | 400 | 400 | ✅ | api.md |
| N-API-04 | my search summary | API | 200 | 200 (own: 259 searches) | ✅ | api.md |
| N-API-05 | my searches | API | 200 | 200 | ✅ | api.md |
| N-API-06 | user B summary (scoped) | Security | own data | own (0 searches, not A's) | ✅ | api.md |
| N-API-07/08 | no token | Security | 401 | 401 | ✅ | api.md |
| N-API-09 | arbitrary user id in path | Security | no IDOR | **404** (route doesn't exist) | ✅ | api.md |

## Verdict

- **Status:** ✅ **Ready** — no feature-specific defects. The `me` endpoints are scoped by
  `req.user.id` (no cross-user exposure), demand is public/aggregated, validation works, and
  there is no IDOR surface.
- **Open findings:** S1 _0_ · S2 _0_ · S3 _0_ · S4 _0_
- Cross-cutting (not N-specific): unmatched `/analytics/users/:id/...` returns an **HTML 404**
  (tracked as A-F2 / platform).

## Files

- [`review.md`](./review.md) — findings & verdict detail
- [`test-results/api.md`](./test-results/api.md) — raw evidence
