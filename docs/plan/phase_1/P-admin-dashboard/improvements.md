# P — Admin Dashboard: Improvements

## Backlog

| # | Finding | Severity | Proposed fix | Effort | Owner | Status |
|---|---------|----------|--------------|--------|-------|--------|
| P-F1 | Refunded/Net revenue understate refunds | S3 | Ensure refunded transactions contribute to `refundedAmount` (or exclude them from `grossAmount`); re-verify net = gross − refunded. Shared with feature T. | S | | Open |

## Notes

- No dashboard-specific code issue — P-F1 originates in the payments summary.
- Optional polish: label the revenue bar values in the legend; the occupancy donut could show the
  absolute room-nights too.
- Re-test after the T fix: dashboard "Refunded" bar and "Net revenue" should reflect refunds.
