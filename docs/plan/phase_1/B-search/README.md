# B — Search

> Part of [Phase 1 — Feature Test & Production-Readiness Review](../TEST-REVIEW-PLAN.md).
> **Status:** 🟡 Partial · **Owner:** _TBD_ · **Tier:** 2

## Scope

- **Entry points:** `GET /search/hotels`, `/search/hotels/:hotelId/availability`, `/search/autocomplete`, `/search/destinations/autocomplete`, `POST /search/log`, `/search/recent`, `/search/destinations/trending`. UI: `SearchResults`, `SearchBar` (filters, sort, pagination, shared links).
- **Risk focus:** logged-in vs anonymous (past S1 regression), ES outage.
- **Environment:** local dev stack (API :3000, client :5173), 2026-10-09.

## Review axes

- [x] UI/UX
- [x] API/contract
- [x] Security/authz
- [x] Data integrity
- [x] Error/edge
- [x] Performance
- [x] Observability
- [ ] Infra dependency _(ES degradation not exercised)_

_(Rubric: see [plan §3](../TEST-REVIEW-PLAN.md#3-review-rubric--the-axes-applied-to-every-feature).)_

## Test cases

| # | Case | Type | Expected | Actual | Pass | Evidence |
|---|------|------|----------|--------|------|----------|
| B-API-01 | search by city | API | 200 results | 200, 200 hotels | ✅ | [api.md](./test-results/api.md) |
| B-API-02 | search by country | API | 200 | 200 | ✅ | api.md |
| B-API-03 | search by lat/long | API | 200 | 200 | ✅ | api.md |
| B-API-04 | hotel autocomplete (real substring) | API | suggestions | 10 for "View"/"Boutique" | ✅ | api.md |
| B-API-05 | destination autocomplete | API | suggestions | 10 | ✅ | api.md |
| B-API-09 | sortBy=price_asc | API | sorted | 200 sorted | ✅ | api.md |
| B-API-10 | pagination page=2 limit=5 | API | 200 | 200, 5/page | ✅ | api.md |
| B-API-06 | recent (auth) | API | 200 | 200 user-scoped | ✅ | notes.md |
| B-NEG-01..09 | missing/past/<=dates, no location, >30 nights, bad sort, max<min, limit>max | API | 400 field msg | 400 (see B-F3) | ⚠️ | api.md |
| B-NEG-10/11 | autocomplete query missing/short | API | 400 | 400 | ✅ | api.md |
| B-NEG-12 | no results (city=Nowhere) | API | 200 empty | 200 empty | ✅ | api.md |
| B-NEG-13 | recent without auth | Security | 401 | 401 | ✅ | api.md |
| B-NEG-14 | log anonymous | API | 201 | 201 | ✅ | api.md |
| B-SEC-01/02 | autocomplete regex/XSS queries | Security | no 500 | 200, no crash | ✅ | api.md |
| B-SEC-03 | recent per-user scoping | Security | own only | A:20 / B:0 | ✅ | notes.md |
| **B-FILTER-PRICE** | **price filter (min/max)** | **API+UI** | **subset / all** | **minPrice=90 → 0 hotels; maxPrice alone → 400/0** | **❌** | notes.md |
| B-FILTER-OTHER | minRating / hotelClass / amenities | API | subset | work (200/49/99) | ✅ | notes.md |
| B-UI-01 | shared link (D9 regression) | UI/UX | loads results | 200 hotels, no alert | ✅ | search-results-1440.png |
| B-UI-02 | autocomplete dropdown | UI/UX | suggestions | 7 for "Ha" | ✅ | autocomplete.png |
| B-UI-03 | XSS highlight escaping | Security | escaped | esc. name+query (code) | ✅ | review.md |
| B-PERF-01 | search latency x5 | Performance | fast | ~60 ms | ✅ | api.md |

## Verdict

- **Status:** 🟡 Partial — search works end-to-end (shared links, autocomplete, sort,
  pagination, validations, per-user history), but the **price filter is broken** (B-F1)
  and `maxPrice`-only searches fail (B-F2). Both are S2 and block production-readiness.
- **Open findings:** S1 _0_ · S2 _2_ · S3 _3_ · S4 _3_
- Detail: [review.md](./review.md) · Remediation: [improvements.md](./improvements.md)

## Files

- [`review.md`](./review.md) — findings & verdict detail
- [`improvements.md`](./improvements.md) — remediation work
- [`test-results/`](./test-results/) — raw evidence (api.md, notes.md, screenshots)
