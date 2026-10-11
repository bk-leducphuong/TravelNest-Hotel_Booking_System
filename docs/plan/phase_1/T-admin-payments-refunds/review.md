# T — Admin Payments & Refunds: Review

Date: 2026-10-09 · Environment: local dev stack, owner/manager/staff seeded.
Evidence: [`test-results/api.md`](./test-results/api.md), [`test-results/notes.md`](./test-results/notes.md).

## Findings

| # | Sev | Axis | Symptom | Root cause | Evidence | Status |
|---|-----|------|---------|-----------|----------|--------|
| T-F1 | **S2** | Security/authz | **Cross-hotel IDOR on transaction/refund routes.** A hotel user (owner, who has `payment.refund`) can (a) `GET /admin/payments/transactions/<foreignId>` → **200**, and (b) `POST /admin/payments/transactions/<foreignId>/refunds` — which **passes the authz gate** and reaches the refund logic (a valid amount would create a refund on a foreign transaction; the probe returned `400 REFUND_EXCEEDS_REMAINING` only because an over-amount was sent). | The routes have no `hotelId`; `requireHotelPermission(PAYMENT_READ/REFUND)` resolves the hotel from the **`X-Hotel-Id` header only**, and the use-cases (`getTransaction`, `initiateRefund`) take only the transaction id — no check that the transaction's `hotel_id` matches. | api.md T-IDOR-READ-TXN, notes.md | ✅ Fixed (M1) |
| T-F2 | S3 | Data integrity | Payments summary reports `byStatus.refunded: 2` but `refundedAmount: 0` and `netAmount == grossAmount` (refunds don't reduce net). | `refundedAmount = sumSucceededForHotel` = 0 while `grossAmount` includes statuses `refunded`. Shared with **P-F1**. | api.md T-API-01 | ✅ Fixed (M2) |

## Positives

- **Refund rules are strong**: over-refund → `400 REFUND_EXCEEDS_REMAINING`; invalid reason → `400`
  (with the valid list); only `payment` transactions with refundable status + `stripe_charge_id` +
  `booking_id` are refundable; `booked_rooms`-style protections N/A.
- Own-hotel reads work: summary `200`, transactions `200`, refunds `200`.
- **Foreign hotel `summary` → `403`** (path param is the hotel context, so it's checked).
- No token → `401`.

## Notes / limitations

- The manager's `POST …/refunds` returned `403`, but that was **missing `payment.refund`**, not the
  hotel check — re-tested with the **owner** (has `payment.refund`): the request **passed authz**.
- Refund **read/retry** IDOR could not be tested — the `refunds` table is empty (no rows), and a
  real refund was deliberately not created (Stripe side effect).
- **UI not tested** — see `improvements.md`.

## Verdict

**🟡 Partial (S2).** The refund **domain rules** are well-built (this is the strongest part), but
transaction/refund routes repeat the cross-tenant IDOR (T-F1, same root as R-F1/S-F1). Fix by
resolving the transaction's `hotel_id` and asserting it equals the hotel context (shared guard).

---

> **Update — 2026-10-11 (M1–M6):** every finding recorded above is now **✅ fixed** (see the Status column) or **by-design**. The verdict above reflects the **original** review; the current index marks this feature **✅ Ready**.
