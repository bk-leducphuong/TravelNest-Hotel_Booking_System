# P — Admin Dashboard: Review

Date: 2026-10-09 · Environment: local dev stack, signed in as **owner@travelnest.local** (hotel "The Poplar Road Inn").
Evidence: [`test-results/api.md`](./test-results/api.md), [`test-results/browser.md`](./test-results/browser.md).

## Findings

| # | Sev | Axis | Symptom | Root cause | Evidence | Status |
|---|-----|------|---------|-----------|----------|--------|
| P-F1 | S3 | Data integrity | The dashboard's **"Refunded" bar is $0 and "Net revenue" equals "Gross"** even though the payments summary reports `byStatus.refunded: 2`. A refunded booking doesn't reduce net revenue on the dashboard. | `getHotelPaymentSummary` computes `grossAmount` over statuses incl. `refunded`, but `refundedAmount = refundRepository.sumSucceededForHotel` returns 0 (no succeeded refund records), so `net = gross`. Shared with **feature T**. | api.md P-API-03, browser.md | Open |

## Positives

- **All dashboard sources return correct, internally consistent data** for the hotel:
  - bookings stats `total: 41` and `byStatus` (completed 20, confirmed 15, cancelled 4, no_show 1, checked_in 1) **sum to 41**.
  - bookings trend: 14 daily points (matches the chart "peak 2 / total 2").
  - occupancy `2.42% = 24 / 992` (booked room-nights / capacity room-nights) — the aggregation is correct.
  - reviews summary: 23 published, average 7.74.
- **UI renders fully as owner**: 6 KPI cards (Gross/Net revenue, Occupancy, Bookings, Average rating, Pending payouts) + 3 charts (Trend, Donut, Bar) + "Bookings by status" bars.
- **Per-card permission gating** (`can("payment.read")`, `can("booking.read")`, …) and the `activeHotel` requirement are correct: the guest session showed the empty state ("No hotel is assigned…"), and each API is hotel-scoped (X-Hotel-Id).
- Empty states for no data ("No bookings in this period", "No occupancy data", "No payment data").

## Notes / limitations

- Screenshots for this page timed out in the harness ("waiting for fonts"); evidence is DOM-based.
- The admin client required a **full logout + Keycloak login as owner** to render positively (the shared SSO had been the guest); once done, the dashboard rendered with the active hotel.

## Verdict

**🟡 Partial.** The dashboard is a well-built composition: correct, scoped, gated, and fast. The
single issue is **P-F1** — refunds are not reflected in the revenue figures (a payments-summary
data gap, tracked with feature T). No S1/S2.
