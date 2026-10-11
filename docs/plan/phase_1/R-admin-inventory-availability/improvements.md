# R — Admin Inventory / Availability: Improvements

## Backlog

| # | Finding | Severity | Proposed fix | Effort | Owner | Status |
|---|---------|----------|--------------|--------|-------|--------|
| R-F1 | Cross-hotel IDOR on `/admin/inventory/rooms/:roomId` (read + write) | S2 | Resolve the room's `hotel_id` and assert it equals the resolved hotel context (X-Hotel-Id / param) before proceeding; apply to GET and PATCH. Audit other `rooms/:roomId` admin routes for the same gap. | M | | Open |
| R-F2 | New date without price silently inherits | S4 | Document the inheritance, or require an explicit price when `entries`/range creates rows | XS | | Open |

## Notes

- **R-F1 is the priority** — a cross-tenant write. The fix belongs in the inventory admin routes
  (or a shared `requireRoomInHotel` guard): load the room, compare `room.hotel_id` to the hotel
  context, `403` on mismatch.
- Consider a shared guard used by every `:roomId` admin route (inventory, media, catalog).
- Re-test: manager `PATCH/GET` a foreign room with own `X-Hotel-Id` → `403`.

## ⚠️ Test-coverage gap (admin UI not exercised)

This feature was reviewed **API-only** (curl) plus reading the `admin-client` service layer — the
admin **UI pages were NOT driven via Playwright** in this pass (the admin client was rendering as
the guest for Q–T). This is a **coverage gap**, not a pass.

**TODO — re-run in the admin client signed in as `owner@travelnest.local`** and verify:
- `/availability` (inventory editor: date range, price, allotment, status, bulk apply)
- that the oversell guard surfaces as a clear error in the UI
- that a staff member (has `room.manage_inventory`) can edit, and a role without it cannot
