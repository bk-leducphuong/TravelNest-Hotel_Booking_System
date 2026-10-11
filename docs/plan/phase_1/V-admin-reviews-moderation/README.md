# V — Admin Reviews & Moderation

> Part of [Phase 1 — Feature Test & Production-Readiness Review](../TEST-REVIEW-PLAN.md).
> **Status:** 🟡 Partial · **Owner:** _TBD_ · **Tier:** 3

## Scope

- **Entry points:** `GET /admin/reviews`, `/summary`, `GET /admin/reviews/:reviewId`, `PATCH /:reviewId/status`, `POST/PATCH/DELETE /:reviewId/reply`. UI: `reviews/index`, `reviews/[reviewId]`.
- **Risk focus:** moderating other hotels' reviews.
- **Environment:** local dev stack, owner/support seeded, 2026-10-09.

## Review axes

- [ ] UI/UX _(⚠️ admin UI not exercised — see improvements.md)_
- [x] API/contract
- [x] Security/authz
- [x] Data integrity
- [x] Error/edge
- [ ] Performance _(N/A)_
- [x] Observability _(audit + `review.status_changed` event)_
- [ ] Infra dependency

_(Rubric: see [plan §3](../TEST-REVIEW-PLAN.md#3-review-rubric--the-axes-applied-to-every-feature).)_

## Test cases

| # | Case | Type | Expected | Actual | Pass | Evidence |
|---|------|------|----------|--------|------|----------|
| V-API-01 | list reviews (own hotel) | API | 200 | 200 | ✅ | [api.md](./test-results/api.md) |
| V-API-02 | review summary | API | 200 | 200 | ✅ | api.md |
| V-API-03 | get review | API | 200 | 200 | ✅ | api.md |
| V-API-04 | owner moderate | Security | 403 (no `review.moderate`) | **200** (owner override) | ⚠️ | api.md |
| V-API-05 | support moderate (`review.moderate`) | API | 200 | 200 | ✅ | api.md |
| V-API-06/07/08 | reply create/update/delete | API | 201/200/200 | 201/200/200 | ✅ | api.md |
| V-API-09 | no token | Security | 401 | 401 | ✅ | api.md |
| V-API-10 | foreign hotel summary | Security | 403 | 403 | ✅ | api.md |
| **V-IDOR-READ** | owner GET **foreign** review w/ own `X-Hotel-Id` | **Security** | deny | **200** | ❌ | api.md |
| **V-IDOR-REPLY** | owner **reply to foreign** review | **Security** | deny | **201** | ❌ | api.md |

## Verdict

- **Status:** 🟡 Partial (S2) — the reply lifecycle and role gating are correct, but
  `/admin/reviews/:reviewId` shares the **cross-hotel IDOR** (V-F1): an owner can read and reply
  to another hotel's reviews. Not production-ready.
- **Open findings:** S1 _0_ · S2 _1_ · S3 _0_ · S4 _1_
- Detail: [review.md](./review.md) · Remediation: [improvements.md](./improvements.md)

## Files

- [`review.md`](./review.md) — findings & verdict detail
- [`improvements.md`](./improvements.md) — remediation work + **UI coverage gap**
- [`test-results/`](./test-results/) — raw evidence (api.md, notes.md)
