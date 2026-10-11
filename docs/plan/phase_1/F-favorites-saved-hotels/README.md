# F — Favorites / Saved Hotels

> Part of [Phase 1 — Feature Test & Production-Readiness Review](../TEST-REVIEW-PLAN.md).
> **Status:** 🟡 Partial · **Owner:** _TBD_ · **Tier:** 2

## Scope

- **Entry points:** `GET/POST /user/favorite-hotels`, `GET/DELETE /user/favorite-hotels/:hotelId`. UI: `SavedHotels`, `SavedHotelIcon` (heart on hotel cards).
- **Risk focus:** FK errors surfacing as 5xx.
- **Environment:** local dev stack (API :3000, client :5173), 2026-10-09. Browser tested authenticated as **Test User**.

## Review axes

- [x] UI/UX
- [x] API/contract
- [x] Security/authz
- [x] Data integrity
- [x] Error/edge
- [ ] Performance _(N/A)_
- [x] Observability
- [ ] Infra dependency

_(Rubric: see [plan §3](../TEST-REVIEW-PLAN.md#3-review-rubric--the-axes-applied-to-every-feature).)_

## Test cases

| # | Case | Type | Expected | Actual | Pass | Evidence |
|---|------|------|----------|--------|------|----------|
| F-API-01 | list favorites (auth) | API | 200 | 200 `{data:[],meta}` | ✅ | [api.md](./test-results/api.md) |
| F-API-02 | add favorite | API | 201 | 201 | ✅ | api.md |
| F-API-03 | check favorite | API | `isFavorite` | 200 true | ✅ | api.md |
| F-API-04 | add duplicate | API | 409 | 409 `HOTEL_ALREADY_FAVORITE` | ✅ | api.md |
| F-API-07 | add invalid uuid | API | 400 | 400 | ✅ | api.md |
| F-API-08 | add missing hotel uuid | API | 404 | 404 `HOTEL_NOT_FOUND` (was 500) | ✅ | api.md |
| F-API-10 | check non-uuid hotelId | API | 400 | 400 | ✅ | api.md |
| F-API-11/12 | remove (non-favorited / favorited) | API | 204 | 204 | ✅ | api.md |
| F-API-13 | check after remove | API | false | 200 false | ✅ | api.md |
| F-API-14 | list no token | Security | 401 | 401 | ✅ | api.md |
| F-API-15/16 | per-user scoping | Security | own only | A vs B independent | ✅ | api.md |
| F-UI-01 | saved-hotels empty state | UI/UX | renders | "No saved hotels" | ✅ | [browser.md](./test-results/browser.md) |
| F-UI-02 | add favorite via heart | UI/UX | POST 201 | 201; appears on saved page | ✅ | browser.md |
| F-UI-03 | remove via close button | UI/UX | DELETE 204 | 204; count → 0 | ✅ | browser.md |
| F-UI-04 | card data correctness | UI/UX | real data | **hardcoded ★★★ / "319 reviews" / "2.8 km" / alt "BlackPink HomeStay"** | ❌ | browser.md |
| F-UI-05 | heart reflects saved state | UI/UX | filled if saved | **never filled (`checkFavoriteHotel` commented out)** | ❌ | browser.md |
| F-UI-06 | header controls | UI/UX | functional | **Share/Create/Show-map have no handlers** | ❌ | browser.md |
| F-UI-07 | favorite button a11y | UI/UX | labelled | 20 buttons, no `aria-label` | ❌ | browser.md |

## Verdict

- **Status:** 🟡 Partial — the favorites API is correct and safe, but the **UI shows
  fabricated card data** (F-F1) and the **heart never reflects saved state** (F-F2), plus
  dead header controls (F-F3) and missing accessible names (F-F4). Not production-ready.
- **Open findings:** S1 _0_ · S2 _0_ · S3 _4_ · S4 _1_
- Detail: [review.md](./review.md) · Remediation: [improvements.md](./improvements.md)

## Files

- [`review.md`](./review.md) — findings & verdict detail
- [`improvements.md`](./improvements.md) — remediation work
- [`test-results/`](./test-results/) — raw evidence (api.md, browser.md, screenshots)
