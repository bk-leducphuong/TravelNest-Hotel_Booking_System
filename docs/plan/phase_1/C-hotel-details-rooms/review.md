# C — Hotel Details, Rooms & Policies: Review

Date: 2026-10-09 · Environment: local dev stack (API :3000, client :5173).
Evidence: [`test-results/api.md`](./test-results/api.md), [`test-results/notes.md`](./test-results/notes.md), screenshots.

## Findings

| # | Sev | Axis | Symptom | Root cause | Evidence | Status |
|---|-----|------|---------|-----------|----------|--------|
| C-F1 | **S2** | Data integrity | **Room price differs between endpoints.** Same hotel, same room id, same dates: `/hotels/:id/rooms` → Single 733 **592.7**, Twin 618 **231.99**, Suite 450.97; `/search/hotels` → **272.59 / 141.665 / 214.51**. The hotel page displays the `/rooms` values, so a user sees 592 on the hotel page and 272 in search. | `/hotels/:id` rooms path and the search pipeline compute prices differently (different pricing formula/source). | notes.md | Open |
| C-F2 | S3 | Data/API | `/hotels/:id/rooms` returns `totalPrice: null` even when `checkInDate`/`checkOutDate` are supplied (search returns `total_price`). | Rooms response builder doesn't compute the total. | api.md C-API-03/15, notes.md | Open |
| C-F3 | S3 | API/contract | Custom date validations return `400` with message `"value" failed custom validation because ` (empty) and an empty field key `""` — for details (only one date / checkOut≤checkIn) and rooms (checkOut≤checkIn). | `helpers.error('any.custom', { message })` not wired to `.messages()` (same as B-F3/B-F4). | api.md C-API-05/06/10 | Open |
| C-F4 | S3 | API/contract | Non-UUID `hotelId` → **HTML** 404 (`Cannot GET …`) for `/hotels/:id` and `/hotels/:id/policies`. | Express default 404 (route param regex mismatch), no JSON handler (same as A-F2). | api.md C-API-07/13 | Open |
| C-F5 | S3 | API/contract | Response envelope inconsistent with the search module: catalog returns `{data:…}` with no `success` (same as A-F1). | No shared response helper. | api.md | Open |
| C-F6 | S3 | Data integrity | **Free-cancellation inconsistency:** the hotel has a "Free Cancellation" policy and rooms render "Miễn phí hủy", but `/search/hotels` reports `has_free_cancellation: false` for the same hotel → the `freeCancellation` filter wrongly excludes it. | `has_free_cancellation` not derived from the hotel's cancellation policy. | notes.md, api.md C-API-04 | Open |
| C-F7 | S4 | UI/UX | Empty-src `<img>` elements: 3 in room "name" cells (alt="") and the 5 footer brand logos; page title `Vite App`. | Missing image assets/placeholders. | notes.md | Open |
| C-F8 | S3 | UI/UX | The client itself requests `/search/hotels?...&maxPrice=500` (no `minPrice`) and logs a **400** on the hotel page. | The app's own default filter hits B-F2. | notes.md, console | ✅ Fixed (M2) |
| C-F9 | S3 | UI/UX | `ReferenceError: flatpickr is not defined` on the hotel-details page; the date-range picker never initialised. | `HotelDetails.vue` called the **global** `flatpickr(...)` but the package was never imported (and no CDN script exists). | [I ui.md](../I-payments-guest-webhook/test-results/ui.md), console | ✅ Fixed (M6) |

## Positives

- When dates are supplied, `GET /hotels/:id` returns a rich, useful payload: 3 images, grouped amenities (technology/wellness/…), rating summary + breakdown, 10 reviews, 20 nearby places, 7 policies, rooms, and check-in/out times.
- Rooms and policies endpoints return complete data; missing-hotel UUIDs return a clean JSON `HOTEL_NOT_FOUND`.
- Validation works for missing dates and `numberOfRooms=0`.
- Latency ~6 ms (details and rooms).
- Page renders all sections (Overview, Info & prices, Amenities, Policies, Notes, Guest reviews) with a working room list.

## Verdict

**🟡 Partial (S2 blocker).** Detail pages are information-rich and fast, but the
**room price inconsistency (C-F1)** is a trust-breaking defect — the price a guest sees on
the hotel page does not match the price in search for the identical room and dates. C-F6
(free-cancellation flag) compounds it. Both are data-integrity bugs shared with the
**search/pricing** workstream (B-F1). Not production-ready until prices are computed from a
single source of truth.
