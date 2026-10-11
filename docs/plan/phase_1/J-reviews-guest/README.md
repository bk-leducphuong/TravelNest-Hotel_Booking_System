# J — Reviews (Guest)

> Part of [Phase 1 — Feature Test & Production-Readiness Review](../TEST-REVIEW-PLAN.md).
> **Status:** 🟡 Partial · **Owner:** _TBD_ · **Tier:** 2

## Scope

- **Entry points:** `GET /reviews/hotels/:hotelId` (public), `GET /reviews` (mine), `GET /reviews/validate`, `GET /reviews/check`, `POST /reviews`. UI: `Reviews`, `ReviewDetails`, `ReviewForm`, `ReviewValidation`.
- **Risk focus:** review without a completed booking.
- **Environment:** local dev stack (API :3000, client :5173), authenticated as Test User, 2026-10-09. A test booking was temporarily set to `completed` to exercise the happy path, then reverted.

## Review axes

- [x] UI/UX
- [x] API/contract
- [x] Security/authz
- [x] Data integrity
- [x] Error/edge
- [ ] Performance _(N/A)_
- [x] Observability _(review.created → rating summary)_
- [ ] Infra dependency

_(Rubric: see [plan §3](../TEST-REVIEW-PLAN.md#3-review-rubric--the-axes-applied-to-every-feature).)_

## Test cases

| # | Case | Type | Expected | Actual | Pass | Evidence |
|---|------|------|----------|--------|------|----------|
| J-API-01 | hotel reviews (public) | API | 200 | 200, published, with user | ✅ | [api.md](./test-results/api.md) |
| J-API-02 | my reviews (auth) | API | 200 | 200 `{data,meta}` | ✅ | api.md |
| J-API-03 | no token | Security | 401 | 401 | ✅ | api.md |
| J-API-04 | validate eligible (completed booking) | API | `isValid:true` | 200 true | ✅ | api.md |
| J-API-05 | check already reviewed | API | `exists:false` | 200 false | ✅ | api.md |
| J-API-06 | post review | API | 201 | 201 `published` | ✅ | api.md |
| J-API-07 | check again | API | `exists:true` | 200 true | ✅ | api.md |
| J-API-08 | duplicate review same booking | API | 409 | 409 `REVIEW_ALREADY_EXISTS` | ✅ | api.md |
| J-API-09/10 | my reviews / hotel reviews show it | API | 200 | 200 | ✅ | api.md |
| J-API-11 | review a non-completed booking | Security | deny | 404 `BOOKING_NOT_FOUND` | ✅ | api.md |
| J-API-12 | review another user's completed booking | Security | deny | 404 | ✅ | api.md |
| J-API-13 | validate non-completed | API | not eligible | 404 | ✅ | api.md |
| J-API-14/15 | missing comment / rating 11 | API | 400 | 400 | ✅ | api.md |
| J-API-16 | post no token | Security | 401 | 401 | ✅ | api.md |
| J-API-17 | user B validate A's booking | Security | deny | 404 | ✅ | api.md |
| **J-UI-01** | `/reviews` displays my reviews | UI/UX | renders | **TypeError → 0 reviews shown** | ❌ | [browser.md](./test-results/browser.md) |
| **J-UI-02** | review form submit | UI/UX | POST /reviews | **calls `/api/review/post-review` → 404** | ❌ | browser.md |
| J-UI-03 | `/reviews/review-details` reachable | UI/UX | form | **redirects to /reviews** | ❌ | browser.md |

## Verdict

- **Status:** 🟡 Partial — the review **API is production-quality** (eligibility enforcement,
  duplicate handling, validation, public listing all correct), but the **entire guest review
  UI is broken**: the My-reviews page throws on the API response shape (J-F1) and the
  submission form calls dead legacy endpoints (J-F2). Not production-ready.
- **Open findings:** S1 _0_ · S2 _2_ · S3 _2_ · S4 _0_
- Detail: [review.md](./review.md) · Remediation: [improvements.md](./improvements.md)

## Files

- [`review.md`](./review.md) — findings & verdict detail
- [`improvements.md`](./improvements.md) — remediation work
- [`test-results/`](./test-results/) — raw evidence (api.md, browser.md)
