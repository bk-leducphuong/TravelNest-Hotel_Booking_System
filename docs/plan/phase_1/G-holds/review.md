# G — Holds: Review

Date: 2026-10-09 · Environment: local dev stack (API :3000, client :5173), authenticated as Test User.
Evidence: [`test-results/api.md`](./test-results/api.md), [`test-results/browser.md`](./test-results/browser.md), screenshot.

## Findings

| # | Sev | Axis | Symptom | Root cause | Evidence | Status |
|---|-----|------|---------|-----------|----------|--------|
| G-F1 | S3 | API/contract | `POST /hold` with `checkOutDate <= checkInDate` returns 400 with `"value" failed custom validation because ` (empty reason) and an empty field key `""`. | `helpers.error('any.custom', { message })` not wired to `.messages()` — **same class as B-F3 / C-F3 / E-F4** (systemic). | api.md G-API-07 | ✅ Fixed (M1) |

## Positives

- **Lifecycle correct**: create `201` returns `{holdId, totalPrice, priceBreakdown, cancellationPolicy, status:"active", expiresAt}`; list `200`; get-by-id `200`; release `200 {status:"released"}`; released holds are excluded from the active list and expose `status:"released"`.
- **TTL**: `expiresAt` = now + 15 min (`HOLD_DURATION_MINUTES = 15`); a BullMQ `hold-expiry` scanner exists.
- **Security**: create requires auth (`401`); a different user reading another's hold → **`403 FORBIDDEN`** (IDOR blocked).
- **Oversell guard**: requesting `quantity: 999` → **`409 ROOMS_NOT_AVAILABLE`**; unknown hold → `404 HOLD_NOT_FOUND`.
- **Concurrency**: 6 parallel holds on the same room returned `201` (inventory sufficed) with no 5xx.
- **UI lifecycle (browser-verified)**: selecting a room and clicking "Tôi sẽ đặt" fires `POST /hold → 201` and routes to `/book`; navigating away in-app (`beforeRouteLeave`) fires `DELETE /hold/:id → 200`, releasing the abandoned hold. `/book` renders the hotel, dates and total.

## Notes

- Expiry worker firing was not directly observed (TTL is 15 min); the scanner config exists (`holdExpiry.queue.js`).
- A hard page reload / tab close does not release the hold (only `beforeRouteLeave`) — by design it then expires via TTL.

## Verdict

**🟡 Partial.** This is one of the strongest features: correct lifecycle, authz, oversell
protection, and a working UI create/abandon flow. The only defect is the shared
**custom-validation message** bug (G-F1). No S1/S2.

---

> **Update — 2026-10-11 (M1–M6):** every finding recorded above is now **✅ fixed** (see the Status column) or **by-design**. The verdict above reflects the **original** review; the current index marks this feature **✅ Ready**.
