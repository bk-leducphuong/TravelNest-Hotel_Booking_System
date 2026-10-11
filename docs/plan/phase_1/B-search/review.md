# B — Search: Review

Date: 2026-10-09 · Environment: local dev stack (API :3000, client :5173, ES :9200).
Evidence: [`test-results/api.md`](./test-results/api.md), [`test-results/notes.md`](./test-results/notes.md), screenshots.

## Findings

| # | Sev | Axis | Symptom | Root cause | Evidence | Status |
|---|-----|------|---------|-----------|----------|--------|
| B-F1 | **S2** | Data/API | **Price filter is broken.** `minPrice=90` → **0 hotels**; `minPrice=10`/`50` → all 200 hotels; UI shows the same wrong counts. | ES `min_price` is a **near-constant** across the whole index: 12,600 docs all between 80.0 and 88.14 (avg 80.6). The indexer writes a constant/invalid base price, not the hotel's real per-night price (displayed prices are 90–394). Range query then matches ~everything or nothing. | notes.md (ES stats), api.md B-API-07/08 | Open |
| B-F2 | **S2** | API/contract | `GET /search/hotels?...&maxPrice=500` (**no minPrice**) → **400** `"maxPrice" limit references "ref:minPrice" which must be a number`. UI silently shows **0 hotels**. | Schema `maxPrice: Joi.number().greater(Joi.ref('minPrice'))` — the `ref` fails when `minPrice` is absent. | api.md B-NEG (maxPrice), notes.md | Open |
| B-F3 | S3 | API/contract | `>30 nights` returns 400 with message `"value" failed custom validation because ` (empty reason). | Custom validator uses `helpers.error('any.custom', { message })`; the `message` isn't wired to the schema `.messages()`. | api.md B-NEG-06 | Open |
| B-F4 | S3 | API/contract | No-location error uses an **empty field key** `"": "At least one location ..."`. | `object.missing` message attached to the object, not a named field. | api.md B-NEG-04 | Open |
| B-F5 | S4 | Security/data | User-supplied `city` stored **verbatim** in recent searches; a prior SQLi probe (`Ha Noi' UNION SELECT 1,2,3 --`) is echoed by `GET /search/recent`. Rendering is escaped (safe), but there is no sanitisation/length normalisation. | No input normalisation before persisting recent search. | notes.md, api.md B-API-06 | Open |
| B-F6 | S3 | UI/UX | 3× `keycloak-js` `parseCallbackUrl` "Invalid URL" errors on the search page. | Same as A-F9 (cross-ref feature D). | console | Open |
| B-F7 | S4 | UI/UX | Tab title remains `Vite App`. | Same as A-F6. | search-results screenshot | Open |
| B-F8 | S3 | UI/UX | A filter validation error (400) is **swallowed** — the UI shows "0 hotels" with no message, misleading users into thinking there are no matches. | The search page treats a failed request as an empty result set. | notes.md (maxPrice=500 → 0 hotels, no alert) | Open |

## Positives

- Core search works: city, country, and lat/long queries; sort (`price_asc` etc.); pagination; `{success,data}` envelope **consistent** (better than feature A's catalog endpoints).
- Validations are solid for the common cases (missing/invalid/past dates, `checkOut<=checkIn`, missing `adults`, no location, invalid `sortBy`, `limit` bounds) — 400 with field messages.
- `minRating`, `hotelClass`, `amenities` filters work; `freeCancellation=true` → 0 is **consistent with seed data** (no hotel has free cancellation), not a bug.
- **Autocomplete** works for hotel names and destinations; regex/XSS queries (`(((` , `a(<.*`) return 200, no crash.
- **`highlightMatch` escapes both hotel name and query** before `v-html` + regex-escapes the query → XSS-safe (R11 fix verified in code).
- **Recent searches are per-user scoped** (User A 20, User B 0) and require auth (401 without).
- Shared-link validity (past D9 `numberOfDays` bug) is fixed — a link with city + dates + guests loads 200 hotels, no alert.
- Latency ~60 ms (ES + DB hybrid).

## Verdict

**🟡 Partial (S2 blockers).** The search journey is largely production-quality, but the
**price filter is non-functional** (B-F1: index field is a constant) and **maxPrice-only
searches 400** (B-F2) — both core, user-facing. B-F1 also implicates the **X
(search infrastructure / seeders)** feature. Not production-ready until B-F1/B-F2 are fixed
and B-F8 stops hiding filter failures.
