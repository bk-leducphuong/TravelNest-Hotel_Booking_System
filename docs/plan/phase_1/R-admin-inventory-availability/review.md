# R — Admin Inventory / Availability: Review

Date: 2026-10-09 · Environment: local dev stack, owner/manager/staff seeded.
Evidence: [`test-results/api.md`](./test-results/api.md), [`test-results/notes.md`](./test-results/notes.md).

## Findings

| # | Sev | Axis | Symptom | Root cause | Evidence | Status |
|---|-----|------|---------|-----------|----------|--------|
| R-F1 | **S2** | Security/authz | **Cross-hotel IDOR (read + write).** A manager of hotel A can read **and** modify hotel B's room inventory: `PATCH /admin/inventory/rooms/<foreignRoomId>` (and `GET`) with `X-Hotel-Id: <ownHotel>` → **200**. Verified: manager of `01a105dc-2510-…` patched/read room `01a105dc-2796-…`, which belongs to hotel `01a105dc-24d4-…`. | `requireHotelPermission(ROOM_MANAGE_INVENTORY)` authorizes against the **`X-Hotel-Id` header only**; the route has no `hotelId`, and neither the middleware nor the use-case verifies the **target room belongs to that hotel**. | api.md R-API-13, notes.md | ✅ Fixed (M1) |
| R-F2 | S4 | API/contract | Creating inventory for a **new** date without a price does **not** 400 — it silently inherits the room's latest price (`INVENTORY_PRICE_REQUIRED` only fires when the room has no prior inventory). | `inheritedPrice = change.pricePerNight ?? latest.price_per_night`. | api.md R-API-11, notes.md | ✅ Fixed (M4) |

## Positives

- **Oversell guard works**: setting `totalRooms` below the already-`booked_rooms` on a date → **409 `INVENTORY_BELOW_BOOKED`** (verified on a date with 2 booked).
- `booked_rooms`/`held_rooms` are **not writable** via this endpoint (owned by booking/hold flows).
- Validation: invalid status → `400`; date range > 366 days → `400`; no `startDate`/`entries` → `400`; no token → `401`.
- Hotel-context authz: manager with a **foreign hotel context** → `403`.
- Permission gate: **staff has `room.manage_inventory` → `200`**; owner/manager likewise.
- Reads return per-day rows (totalRooms/bookedRooms/heldRooms/availableRooms/status/price/currency).
- Every update writes an **audit entry** (`inventory.updated`) and publishes `inventory.changed`.

## Notes / limitations

- No-op changes (`status: "open"`) were used to exercise updates without mutating seed data; the one stray row created by R-API-11 (`2027-06-01`) was deleted.
- R-F1 likely also affects any other `rooms/:roomId` admin route that resolves the hotel from a header rather than the room — worth a sweep.

## Verdict

**🟡 Partial (S2).** The inventory **rules** are well-built (oversell guard, immutable booked/held,
audit, events). The blocker is **R-F1**: the room-scoped route trusts the `X-Hotel-Id` header and
never checks that the room belongs to it, enabling cross-tenant inventory tampering. Fix by
resolving the room's hotel and asserting it equals the hotel context.

---

> **Update — 2026-10-11 (M1–M6):** every finding recorded above is now **✅ fixed** (see the Status column) or **by-design**. The verdict above reflects the **original** review; the current index marks this feature **✅ Ready**.
