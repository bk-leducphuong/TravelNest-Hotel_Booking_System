# A — Public Discovery & Content

> Part of [Phase 1 — Feature Test & Production-Readiness Review](../TEST-REVIEW-PLAN.md).
> **Status:** 🟡 Partial · **Owner:** _TBD_ · **Tier:** 2

## Scope

- **Entry points:** Home (`HomeView`), trending hotels/destinations, recently-viewed, hotel batch, nearby places. API: `GET /hotels/trending`, `GET /hotels/recently-viewed`, `POST /hotels/batch`, `GET /hotels/:id/nearby-places`, `GET /search/destinations/trending`.
- **Risk focus:** N+1 on lists, unauthenticated data leakage.
- **Environment:** local dev stack (API :3000, client :5173), 2026-10-09.

## Review axes

- [x] UI/UX
- [x] API/contract
- [x] Security/authz
- [x] Data integrity
- [x] Error/edge
- [x] Performance
- [x] Observability
- [ ] Infra dependency _(trending depends on analytics svc + ES; degradation not exercised)_

_(Rubric: see [plan §3](../TEST-REVIEW-PLAN.md#3-review-rubric--the-axes-applied-to-every-feature).)_

## Test cases

| # | Case | Type | Expected | Actual | Pass | Evidence |
|---|------|------|----------|--------|------|----------|
| A-API-01 | trending public limit=3 | API | 200, cards | 200, 3 cards | ✅ | [api.md](./test-results/api.md) |
| A-API-02 | destinations/trending limit=3 | API | 200 | 200 | ✅ | api.md |
| A-API-03 | nearby-places public | API | 200 | 200, 23 items | ✅ | api.md |
| A-API-04 | batch (2 valid ids) | API | 200 | 200 | ✅ | api.md |
| A-API-05 | recently-viewed no token | Security | 401 | 401 `{success:false}` | ✅ | api.md |
| A-API-06 | recently-viewed with token | API | 200 | 200 | ✅ | api.md |
| A-API-07 | recently-viewed bad token | Security | 401 | 401 "Malformed JWT" | ✅ | api.md |
| A-API-08..13 | limit/days bounds (51,0,366,abc) | API | 400 field errors | 400 correct messages | ✅ | api.md |
| A-API-14 | nearby invalid category | API | 400 | 400 "Invalid category" | ✅ | api.md |
| A-API-15 | nearby non-uuid hotelId | API/contract | 400 JSON | **404 HTML page** | ❌ | api.md |
| A-API-16 | nearby missing hotel uuid | API | 404 JSON | 404 `HOTEL_NOT_FOUND` | ✅ | api.md |
| A-API-17..21 | batch empty/missing/non-array/bad-uuid/60 ids | API/contract | 400 on bad type | **200 `{data:[]}`** | ❌ | api.md |
| A-API-22/23 | envelope consistency | API/contract | uniform | **catalog `{data}` vs search `{success,data}`** | ❌ | api.md |
| A-SEC-01 | recently-viewed per-user scoping | Security | own data only | User A 7 / User B 0 | ✅ | api.md |
| A-PERF-01 | trending latency x5 | Performance | fast | ~5 ms | ✅ | api.md |
| A-UI-01 | home renders trend/viewed/popular | UI/UX | sections + cards | all render @1440 | ✅ | [home-desktop.png](./test-results/home-desktop.png) |
| A-UI-02 | responsive (390/1440/2400) | UI/UX | no h-overflow | none observed | ✅ | home-mobile-390.png |
| A-UI-03 | trending card click navigates | UI/UX | /hotels/:id | routed OK | ✅ | session note |
| A-UI-04 | console cleanliness | UI/UX | no errors/warns | **85 Vue warns + 3 Keycloak errors** | ❌ | [console log](./test-results/console-notes.md) |
| A-UI-05 | a11y accessible names | UI/UX | all named | **26 unlabeled controls** | ❌ | console-notes.md |
| A-I18N-01 | en/vi key parity | UI/UX | equal keys | 39/39, none empty | ✅ | console-notes.md |

## Verdict

- **Status:** 🟡 Partial — core behaviour is correct and secure, but response-contract
  inconsistency, a console-error flood from a wrong prop type, and a11y/keyboard gaps
  must be fixed before production-ready.
- **Open findings:** S1 _0_ · S2 _0_ · S3 _7_ · S4 _2_
- Detail: [review.md](./review.md) · Remediation: [improvements.md](./improvements.md)

## Files

- [`review.md`](./review.md) — findings & verdict detail
- [`improvements.md`](./improvements.md) — remediation work
- [`test-results/`](./test-results/) — raw evidence (api.md, console-notes.md, screenshots)
