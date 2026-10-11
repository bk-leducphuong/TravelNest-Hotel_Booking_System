# Q — Admin Properties / Catalog: Review

Date: 2026-10-09 · Environment: local dev stack, owner/manager/staff seeded.
Evidence: [`test-results/api.md`](./test-results/api.md), [`test-results/notes.md`](./test-results/notes.md).

## Findings

| # | Sev | Axis | Symptom | Root cause | Evidence | Status |
|---|-----|------|---------|-----------|----------|--------|
| Q-F1 | S3 | Error/edge | `PATCH /admin/hotels/:id` with an **unlisted timezone** returns `500 INTERNAL_ERROR`. Server log: `SequelizeValidationError: Validation isIn on timezone failed`. | The Joi schema allows any string ≤64 for `timezone`, but the model validates against `IANA_TIMEZONES`; the mismatch surfaces as an unhandled Sequelize error instead of a `400`. | api.md Q-API-03/04, notes.md | Open |
| Q-F2 | S3 | Data integrity | The timezone allowlist (`constants/hotels.js` `IANA_TIMEZONES`, ~12 zones: America/New_York, Europe/London, Asia/Tokyo, …) **omits `Asia/Ho_Chi_Minh`** and most IANA zones, despite the product being Vietnam-focused. A hotel cannot be set to the local timezone (it 500s). | Hardcoded, incomplete allowlist. | notes.md | Open |

## Positives

- **Rooms CRUD works**: list `200`, create `201`, update `200`, delete `200`, missing `roomName` → `400`.
- **Policies CRUD works**: list `200`, create `201`, update `200`, delete `200`, invalid `policyType` → `400` (with the valid list).
- **Authz is correct**: get/patch foreign hotel → `403`; owner foreign rooms → `403`; staff `PATCH` hotel (no `hotel.update`) → `403`; staff create room (no `room.create`) → `403`; no token → `401`.
- Validation for `hotelClass`, `roomName`, `policyType` returns proper `400`s.
- `PATCH` hotel with a **listed** timezone (`Asia/Bangkok`) → `200` (happy path works).

## Notes / limitations

- The earlier policy update/delete `404`s in `api.md` were a **test-script id-extraction bug** (the create response nests the id under `data.policy.id`); re-run correctly → `200` (see `notes.md`).
- Rooms/policies created for the tests were cleaned up (rooms soft-deleted, then hard-removed; policies deleted).
- Cross-ref **O-F1**: the admin catalog **list** (`GET /admin/hotels`) is reachable by any guest (`hotel.read` on the base role).

## Verdict

**🟡 Partial.** CRUD, scoping and permission gating are solid. The problem is the hotel **timezone**
handling: an unlisted value 500s (Q-F1) and the list omits Vietnam's zone (Q-F2). Both are small
fixes (validate the timezone in Joi against the same list → `400`; expand the list to the full IANA
set).
