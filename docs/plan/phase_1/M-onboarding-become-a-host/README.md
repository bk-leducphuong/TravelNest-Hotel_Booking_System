# M — Onboarding / Become a Host

> Part of [Phase 1 — Feature Test & Production-Readiness Review](../TEST-REVIEW-PLAN.md).
> **Status:** 🟡 Partial · **Owner:** _TBD_ · **Tier:** 4

## Scope

- **Entry points:** `POST /join` (submit partner form), `POST /join/photos` (upload photos, max 30). UI: `JoinHome`, `JoinForms` (6-step wizard), `Form6`.
- **Risk focus:** unauthenticated upload abuse.
- **Environment:** local dev stack (API :3000, client :5173), authenticated as Test User, 2026-10-09.

## Review axes

- [x] UI/UX
- [x] API/contract
- [x] Security/authz
- [ ] Data integrity _(happy path 500s — see M-F1)_
- [x] Error/edge
- [ ] Performance _(N/A)_
- [x] Observability
- [ ] Infra dependency

_(Rubric: see [plan §3](../TEST-REVIEW-PLAN.md#3-review-rubric--the-axes-applied-to-every-feature).)_

## Test cases

| # | Case | Type | Expected | Actual | Pass | Evidence |
|---|------|------|----------|--------|------|----------|
| M-API-01 | submit join no token | Security | 401 | 401 | ✅ | [api.md](./test-results/api.md) |
| M-API-02 | upload photos no token | Security | 401 | 401 | ✅ | api.md |
| M-API-03 | submit invalid body | API | 400 | 400 (detailed field errors) | ✅ | api.md |
| M-API-04 | photos missing ids | API | 400 | 400 | ✅ | api.md |
| M-API-05 | photos no files | API | 400 | 400 `NO_FILES_UPLOADED` | ✅ | api.md |
| **M-API-06** | **submit valid join** | API | 201 (hotel+room) | **500 `INTERNAL_ERROR`** | ❌ | api.md |
| M-UI-01 | `/join` landing renders | UI/UX | renders | renders (VI) | ✅ | [browser.md](./test-results/browser.md) |
| M-UI-02 | `/join/become-a-host` wizard renders | UI/UX | renders | 6 steps render | ✅ | browser.md |
| **M-UI-03** | final submit endpoint | UI/UX | POST /api/v1/join | **POST `/api/join` → 404** | ❌ | browser.md |

## Verdict

- **Status:** 🟡 Partial — validation/auth are fine and the wizard renders, but the **happy path
  is broken twice over**: the client posts to a dead `/api/join` (M-F2) and the backend 500s on a
  valid submission (M-F1). A prospective host **cannot complete onboarding**. Not production-ready.
- **Open findings:** S1 _0_ · S2 _2_ · S3 _1_ · S4 _1_
- Detail: [review.md](./review.md) · Remediation: [improvements.md](./improvements.md)

## Files

- [`review.md`](./review.md) — findings & verdict detail
- [`improvements.md`](./improvements.md) — remediation work
- [`test-results/`](./test-results/) — raw evidence (api.md, browser.md)
