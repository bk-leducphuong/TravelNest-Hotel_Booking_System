# C — Hotel Details, Rooms & Policies: Improvements

## Backlog

| # | Finding | Severity | Proposed fix | Effort | Owner | Status |
|---|---------|----------|--------------|--------|-------|--------|
| C-F1 | Room price differs between `/rooms` and `/search` | S2 | Compute room prices from one shared pricing function/service; make `/hotels/:id` rooms use the same source as the search pipeline | L | | ✅ Fixed (M2) |
| C-F2 | `/rooms` `totalPrice` is null | S3 | Compute `totalPrice = pricePerNight × nights` in the rooms response | S | | ✅ Fixed (M2) |
| C-F3 | Broken custom validation messages (empty reason/key) | S3 | Wire `helpers.error` messages correctly (shared fix with B-F3/B-F4) | S | | ✅ Fixed (M1) |
| C-F4 | HTML 404 for non-UUID hotelId | S3 | Add JSON 404 handler for unmatched `/api/*` (shared fix with A-F2) | S | | ✅ Fixed (M1) |
| C-F5 | Response envelope inconsistency | S3 | Shared response helper (shared fix with A-F1) | M | | ✅ Fixed (M6) |
| C-F6 | Free-cancellation flag not derived from policy | S3 | Set `has_free_cancellation` from the hotel's cancellation policy; keep search + details consistent | S | | ✅ Fixed (M2) |
| C-F7 | Empty-src images; tab title | S4 | Provide assets/placeholders; set document title | S | | ✅ Fixed (M4) |
| C-F8 | Client sends `maxPrice=500` → 400 | S3 | Fix B-F2 (schema) so the default filter is valid; also stop sending an unused default | S | | ✅ Done (M2) |
| C-F9 | `flatpickr is not defined` — date picker never initialises | S3 | `import flatpickr from 'flatpickr'` (+ its CSS) in `HotelDetails.vue` | XS | | ✅ Done (M6) |

## Notes

- **C-F1 is the priority**: a guest sees two different prices for the same room. Align with
  **B-F1** (search price index) — both are symptoms of pricing not being computed from a
  single source of truth.
- C-F3/C-F4/C-F5 are shared cross-cutting contract fixes already flagged in A and B; fix
  centrally.
- Re-test after fixes: compare `/hotels/:id/rooms` vs `/search/hotels` for the same
  room+dates, and assert `totalPrice` is populated.
