# U — Admin Payouts & Stripe Connect: Review

Date: 2026-10-09 · Environment: local dev stack, owner/admin seeded, Stripe test mode.
Evidence: [`test-results/api.md`](./test-results/api.md), [`test-results/notes.md`](./test-results/notes.md).

## Findings

| # | Sev | Axis | Symptom | Root cause | Evidence | Status |
|---|-----|------|---------|-----------|----------|--------|
| U-F1 | **S2** | Security/authz | **Cross-hotel IDOR on payout/account routes.** An owner of hotel A (own `X-Hotel-Id`) can: (a) `GET /admin/payouts/<foreignId>` → **200**, (b) `PATCH /admin/payouts/<foreignId>/status` → **200**, (c) `POST …/process` → **409** and `POST /connected-accounts/<foreignId>/link` → **400** — i.e. both **passed the authz gate** into business logic. | Routes have no `hotelId`; `requireHotelPermission(PAYMENT_*)` resolves the hotel from `X-Hotel-Id` only; use-cases (`getPayout`, `processPayout`, `setPayoutStatus`, `createAccountLink`, `syncConnectedAccount`) take only the entity id — no check that the payout/account's `hotel_id`/`owner_id` matches. | api.md U-IDOR-READ/STATUS/PROCESS/LINK | ✅ Fixed (M1) |
| U-F2 | S3 | Error/edge | `POST /admin/payouts/eligible` with **no payout-ready connected account** → `500 INTERNAL_ERROR` (`Error: No payout-ready connected payment account found`). With a (fake) ready account present it **hung (>30 s, no response)**. | `payout.service.createManualPayout` throws a plain `Error` (not an `ApiError`) → mapped to 500; no graceful "nothing to pay out" path. | notes.md | ✅ Fixed (M6) |

## Positives

- **Payout state machine enforced**: `processing → cancelled` (invalid) → **409 `INVALID_PAYOUT_STATUS_TRANSITION`**; unknown status → **400** (with the valid list). Terminal `paid`/`cancelled` are locked.
- Reads work: payouts list `200`, hotel summary `200`, connected-accounts list `200`, check `200`.
- `check` returns a useful readiness shape (`{configured, hasAccount, payoutReady, account}`).
- **Foreign hotel `summary` → `403`** (path param is the hotel context → checked).
- No token → `401`.

## Notes / limitations

- The DB had **no payouts / connected accounts**; a minimal payout + connected-account row was inserted (foreign hotel) to prove the IDOR, then **removed**. Stripe side effects were avoided (process/link used a fake account, which errored).
- The `generate eligible` **hang** occurred only after inserting a fake payout-ready account (Stripe call with a bogus account) — the clean `500` (no account) is the primary U-F2 evidence.
- **UI not tested** — see `improvements.md`.

## Verdict

**🟡 Partial (S2).** The payout lifecycle and validation are solid, but the payout/account routes
repeat the cross-tenant IDOR (U-F1, same root as R-F1/S-F1/T-F1) and `generate eligible` fails
uncleanly (U-F2). Fix with the shared hotel-ownership guard and an `ApiError` for the
no-ready-account case.

---

> **Update — 2026-10-11 (M1–M6):** every finding recorded above is now **✅ fixed** (see the Status column) or **by-design**. The verdict above reflects the **original** review; the current index marks this feature **✅ Ready**.
