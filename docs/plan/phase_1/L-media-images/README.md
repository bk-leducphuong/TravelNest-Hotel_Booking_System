# L — Media / Images

> Part of [Phase 1 — Feature Test & Production-Readiness Review](../TEST-REVIEW-PLAN.md).
> **Status:** 🟡 Partial · **Owner:** _TBD_ · **Tier:** 4

## Scope

- **Entry points:** `GET /images/:entityType/:entityId` (public), `POST` (auth + `authorizeImageEntityWrite`), `PUT .../primary/:imageId`, `DELETE /images/:id` (auth + `authorizeImageDelete`). Backed by the Go **media** service (image processing, MinIO/S3).
- **Risk focus:** upload authz bypass, SSRF/storage abuse.
- **Environment:** local dev stack (API :3000, media :8082), authenticated as Test User, 2026-10-09.

## Review axes

- [x] UI/UX
- [x] API/contract
- [x] Security/authz
- [x] Data integrity
- [x] Error/edge
- [ ] Performance _(N/A)_
- [x] Observability
- [x] Infra dependency _(media service + MinIO)_

_(Rubric: see [plan §3](../TEST-REVIEW-PLAN.md#3-review-rubric--the-axes-applied-to-every-feature).)_

## Test cases

| # | Case | Type | Expected | Actual | Pass | Evidence |
|---|------|------|----------|--------|------|----------|
| L-API-01 | get hotel images (public) | API | 200 | 200 (urls + variants) | ✅ | [api.md](./test-results/api.md) |
| L-API-02 | get unknown entity images | API | 200 empty | 200 `count:0` | ✅ | api.md |
| L-API-03 | upload no auth | Security | 401 | 401 | ✅ | api.md |
| L-API-04 | upload to hotel as guest | Security | 403 | 403 | ✅ | api.md |
| L-API-05 | upload self avatar | API | 201 | 201 (`processing`) | ✅ | api.md |
| L-API-06 | upload another user's avatar | Security | 403 | 403 | ✅ | api.md |
| L-API-07 | upload non-image | API | 400 | **500 `INTERNAL_ERROR`** | ❌ | api.md |
| L-API-08 | upload invalid entity type | API | 400 | **403** (authz first) | ⚠️ | api.md |
| L-API-09 | upload no file | API | 400 | 400 `NO_FILE_PROVIDED` | ✅ | api.md |
| L-API-10 | set primary no auth | Security | 401 | 401 | ✅ | api.md |
| L-API-11 | set primary hotel as guest | Security | 403 | 403 | ✅ | api.md |
| L-API-12 | delete no auth | Security | 401 | 401 | ✅ | api.md |
| L-API-13 | delete unknown image | API | 404 | 404 (no leak) | ✅ | api.md |
| L-API-14 | delete own avatar | API | 200 | 200 | ✅ | api.md |
| L-UI-01 | hotel images render | UI/UX | images | ✅ (feature C) | ✅ | — |
| L-UI-02 | avatar upload modal | UI/UX | opens w/ file input | opens ✅; **file-select not drivable in harness** | ⚠️ | [browser.md](./test-results/browser.md) |

## Verdict

- **Status:** 🟡 Partial — authz is strong and complete (the historical unauth-upload bug is
  fixed), but a non-image upload returns **500** (L-F1) and the envelope differs (L-F2). No S1/S2.
- **Open findings:** S1 _0_ · S2 _0_ · S3 _1_ · S4 _2_
- Detail: [review.md](./review.md) · Remediation: [improvements.md](./improvements.md)

## Files

- [`review.md`](./review.md) — findings & verdict detail
- [`improvements.md`](./improvements.md) — remediation work
- [`test-results/`](./test-results/) — raw evidence (api.md, browser.md)
