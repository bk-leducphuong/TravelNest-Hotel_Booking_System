# M — Onboarding / Become a Host: Improvements

## Backlog

| # | Finding | Severity | Proposed fix | Effort | Owner | Status |
|---|---------|----------|--------------|--------|-------|--------|
| M-F1 | Valid join submission → 500 (`check_in_time` TIME) | S2 | Map `checkInFrom`/`checkOutFrom` to single `TIME` values (e.g. `checkInTime = checkInFrom`), or store the range in a text column; add a test | S | | ✅ Fixed (M3) |
| M-F2 | Client posts to legacy `/api/join` (404) | S2 | Point `Form6.vue` at the `/api/v1/join` endpoints (ideally via a `JoinService` in `services/`) | S | | ✅ Fixed (M3) |
| M-F3 | Public onboarding gated behind auth (401) | S3 | Decide: require login before the wizard (redirect), or make `/join` public with abuse controls | M | | ✅ Fixed (M3) |
| M-F4 | Envelope inconsistency | S4 | Shared response envelope (A-F1) | S | | ✅ Fixed (M6) |

## Notes

- **M-F1 and M-F2 together mean no host can onboard.** Fix both and re-test the full wizard
  (submit → hotel + room + inventory created → photos uploaded).
- M-F2 is part of the systemic legacy-endpoint drift (see J improvements) — the same
  `grep -rn "VITE_SERVER_HOST}/api/" client/src` sweep covers Form6.
- If M-F3 is kept as auth-required, the public `/join` page should redirect anonymous users to
  login with a return URL before they invest in the 6-step wizard.
