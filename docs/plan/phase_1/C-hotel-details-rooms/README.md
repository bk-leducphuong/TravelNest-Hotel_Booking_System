# C — Hotel Details, Rooms & Policies

> Part of [Phase 1 — Feature Test & Production-Readiness Review](../TEST-REVIEW-PLAN.md).
> **Status:** 🟡 Partial · **Owner:** _TBD_ · **Tier:** 2

## Scope

- **Entry points:** `GET /hotels/:hotelId` (details, optional dates/guests), `GET /hotels/:hotelId/rooms`, `GET /hotels/:hotelId/policies`, `GET /hotels/:hotelId/nearby-places` (see A). UI: `HotelDetails` (gallery, amenities, map, room select).
- **Risk focus:** room/price mismatch, missing-image handling.
- **Environment:** local dev stack (API :3000, client :5173), 2026-10-09.

## Review axes

- [x] UI/UX
- [x] API/contract
- [x] Security/authz
- [x] Data integrity
- [x] Error/edge
- [x] Performance
- [x] Observability
- [ ] Infra dependency

_(Rubric: see [plan §3](../TEST-REVIEW-PLAN.md#3-review-rubric--the-axes-applied-to-every-feature).)_

## Test cases

| # | Case | Type | Expected | Actual | Pass | Evidence |
|---|------|------|----------|--------|------|----------|
| C-API-01 | details (no query) | API | 200 | 200 | ✅ | [api.md](./test-results/api.md) |
| C-API-02 | details with dates+guests | API | full sections | 200 (images, amenities, rooms, reviews) | ✅ | api.md |
| C-API-03 | rooms | API | 200 | 200, 4 rooms | ✅ | api.md |
| C-API-04 | policies | API | 200 | 200, 7 policies | ✅ | api.md |
| C-API-05 | details: only checkInDate | API | 400 clear msg | 400 **empty msg** | ❌ | api.md |
| C-API-06 | details: checkOut<=checkIn | API | 400 clear msg | 400 **empty msg** | ❌ | api.md |
| C-API-07 | details: non-uuid hotelId | API | 400 JSON | **404 HTML** | ❌ | api.md |
| C-API-08 | details: missing hotel uuid | API | 404 JSON | 404 `HOTEL_NOT_FOUND` | ✅ | api.md |
| C-API-09 | rooms: missing dates | API | 400 | 400 field msgs | ✅ | api.md |
| C-API-10 | rooms: checkOut<=checkIn | API | 400 clear msg | 400 **empty msg** | ❌ | api.md |
| C-API-11 | rooms: numberOfRooms=0 | API | 400 | 400 | ✅ | api.md |
| C-API-12 | rooms: missing hotel uuid | API | 404 JSON | 404 | ✅ | api.md |
| C-API-13 | policies: non-uuid hotelId | API | 400 JSON | **404 HTML** | ❌ | api.md |
| C-API-15 | rooms: pagination | API | 200 | 200 | ✅ | api.md |
| **C-PRICE** | **room price: `/rooms` vs `/search`** | **Data** | **equal** | **592.7 vs 272.59 (same room+dates)** | **❌** | notes.md |
| C-FC | free-cancellation flag vs policy | Data | consistent | policy yes, search flag **false** | ❌ | notes.md |
| C-UI-01 | hotel page renders (gallery/amenities/policies/rooms) | UI/UX | all | all render | ✅ | hotel-details-1440.png |
| C-UI-02 | room prices on page | UI/UX | match search | shows inflated `/rooms` prices | ❌ | notes.md |
| C-UI-03 | console cleanliness | UI/UX | clean | **400 on `maxPrice=500`** + empty imgs | ❌ | notes.md |
| C-PERF-01 | details/rooms latency x5 | Performance | fast | ~6 ms | ✅ | api.md |

## Verdict

- **Status:** 🟡 Partial — details/rooms/policies are rich and mostly correct, but the
  **room price shown on the hotel page disagrees with search** (C-F1, S2), the
  free-cancellation flag is inconsistent (C-F6), and custom validation messages are
  broken (C-F3). Not production-ready.
- **Open findings:** S1 _0_ · S2 _1_ · S3 _6_ · S4 _1_ (some cross-ref A/B)
- Detail: [review.md](./review.md) · Remediation: [improvements.md](./improvements.md)

## Files

- [`review.md`](./review.md) — findings & verdict detail
- [`improvements.md`](./improvements.md) — remediation work
- [`test-results/`](./test-results/) — raw evidence (api.md, notes.md, screenshots)
