# Q — Admin Properties / Catalog: Improvements

## Backlog

| # | Finding | Severity | Proposed fix | Effort | Owner | Status |
|---|---------|----------|--------------|--------|-------|--------|
| Q-F1 | Unlisted timezone → 500 | S3 | Validate `timezone` in the Joi schema against the same allowlist → `400` with valid values; map `SequelizeValidationError` to `400` centrally | S | | Open |
| Q-F2 | Allowlist omits `Asia/Ho_Chi_Minh` (and most zones) | S3 | Expand `IANA_TIMEZONES` to the full IANA set (or drop the strict allowlist and validate format) | S | | Open |

## Notes

- Rooms/policies CRUD need no change.
- Also address **O-F1** (guest-accessible admin catalog list) — same feature area.
- Re-test: `PATCH` hotel with `Asia/Ho_Chi_Minh` → `200`; with a garbage value → `400`.

## ⚠️ Test-coverage gap (admin UI not exercised)

This feature was reviewed **API-only** (curl) plus reading the `admin-client` service layer — the
admin **UI pages were NOT driven via Playwright** in this pass (the admin client was rendering as
the guest for Q–T). This is a **coverage gap**, not a pass.

**TODO — re-run in the admin client signed in as `owner@travelnest.local`** and verify:
- `/properties` (hotel list — also confirm the **O-F1** guest-access gap in the UI)
- `/properties/[hotelId]` (hotel edit form, rooms CRUD, policies CRUD, photos)
- that a manager can edit (has `hotel.update`) while a **staff** member sees read-only / no edit
  controls (`Can.vue`)
