# M — Onboarding / Become a Host: Improvements

## Backlog

| #    | Finding                                            | Severity | Proposed fix                                                                                                                                 | Effort | Owner | Status        |
| ---- | -------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----- | ------------- |
| M-F1 | Valid join submission → 500 (`check_in_time` TIME) | S2       | Map `checkInFrom`/`checkOutFrom` to single `TIME` values (e.g. `checkInTime = checkInFrom`), or store the range in a text column; add a test | S      |       | ✅ Fixed (M3) |
| M-F2 | Client posts to legacy `/api/join` (404)           | S2       | Point `Form6.vue` at the `/api/v1/join` endpoints (ideally via a `JoinService` in `services/`)                                               | S      |       | ✅ Fixed (M3) |
| M-F3 | Public onboarding gated behind auth (401)          | S3       | Decide: require login before the wizard (redirect), or make `/join` public with abuse controls                                               | M      |       | ✅ Fixed (M3) |
| M-F4 | Envelope inconsistency                             | S4       | Shared response envelope (A-F1)                                                                                                              | S      |       | ✅ Fixed (M6) |

## Notes

- **M-F1 and M-F2 together mean no host can onboard.** Fix both and re-test the full wizard
  (submit → hotel + room + inventory created → photos uploaded).
- M-F2 is part of the systemic legacy-endpoint drift (see J improvements) — the same
  `grep -rn "VITE_SERVER_HOST}/api/" client/src` sweep covers Form6.
- If M-F3 is kept as auth-required, the public `/join` page should redirect anonymous users to
  login with a return URL before they invest in the 6-step wizard.

## Follow-up fixes (post-M6)

A deeper pass found data-integrity and authz gaps that the M1–M6 review did not cover:

| #     | Finding                                                                                                                                                     | Severity | Fix                                                                                                             |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------- |
| M-F5  | Star `rating` and hotel `city` were written to non-existent columns (`overall_rating`, `city`) and silently dropped; `owner_id`/`hotel_amenities` likewise. | S2       | Map rating → `hotel_class`, resolve city → `city_id`; drop the dead columns.                                    |
| M-F6  | `upsertHotel` always INSERTed (PK conflict on an auto-generated id), so re-submitting created duplicate hotels + rooms.                                     | S2       | Onboarding is idempotent per owner: update the primary-owned hotel and its same-named room; inventory upserted. |
| M-F7  | Hotel/room/inventory/ownership writes were not transactional (partial state on failure).                                                                    | S2       | All writes run in one `sequelize.transaction`.                                                                  |
| M-F8  | `rooms.quantity` was never set from `numberOfRooms` (defaulted to 1 while inventory said N).                                                                | S3       | Pass `quantity` through to the room create/update.                                                              |
| M-F9  | `POST /join/photos` trusted `hotel_id`/`room_id` from the body — any authed user could attach photos to any hotel (IDOR).                                   | S2       | Require hotel membership and verify the room belongs to the hotel.                                              |
| M-F10 | Multer capped uploads at 5MB while the UI promised 47MB; upload failures were swallowed.                                                                    | S3       | Align the limit (10MB) and surface upload errors instead of navigating away.                                    |
| M-F11 | The wizard collected fields the API discards (`zipCode`, `services`, `roomArea`, `allowSmoke`, `haveChildren`, `havePet`).                                  | S4       | Removed the amenities step + those fields; the client sends a curated payload.                                  |
| M-F12 | `/join` CTAs pointed at the admin console, which has no registration UI.                                                                                    | S3       | Point the CTA at the guest wizard (`/join/become-a-host`).                                                      |
