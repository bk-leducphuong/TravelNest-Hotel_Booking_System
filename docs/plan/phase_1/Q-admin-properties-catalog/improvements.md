# Q — Admin Properties / Catalog: Improvements

## Backlog

| # | Finding | Severity | Proposed fix | Effort | Owner | Status |
|---|---------|----------|--------------|--------|-------|--------|
| Q-F1 | Unlisted timezone → 500 | S3 | Validate `timezone` in the Joi schema against the same allowlist → `400` with valid values; map `SequelizeValidationError` to `400` centrally | S | | ✅ Fixed (M1) |
| Q-F2 | Allowlist omits `Asia/Ho_Chi_Minh` (and most zones) | S3 | Expand `IANA_TIMEZONES` to the full IANA set (or drop the strict allowlist and validate format) | S | | ✅ Fixed (M4) |

## Notes

- Rooms/policies CRUD need no change.
- Also address **O-F1** (guest-accessible admin catalog list) — same feature area.
- Re-test: `PATCH` hotel with `Asia/Ho_Chi_Minh` → `200`; with a garbage value → `400`.

## ✅ Admin-UI coverage (gap filled in M5)

This feature was reviewed **API-only** in the first pass; the admin **UI pages were then driven via Playwright in M5** (signed in as `owner@travelnest.local`) — see [`ADMIN-UI-VERIFICATION.md`](../ADMIN-UI-VERIFICATION.md).

**Pages exercised:**
- `/properties` (hotel list — also confirm the **O-F1** guest-access gap in the UI)
- `/properties/[hotelId]` (hotel edit form, rooms CRUD, policies CRUD, photos)
- that a manager can edit (has `hotel.update`) while a **staff** member sees read-only / no edit
  controls (`Can.vue`)
