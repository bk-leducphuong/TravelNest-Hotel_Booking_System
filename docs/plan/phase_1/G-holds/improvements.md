# G — Holds: Improvements

## Backlog

| # | Finding | Severity | Proposed fix | Effort | Owner | Status |
|---|---------|----------|--------------|--------|-------|--------|
| G-F1 | Broken custom-validation message (empty reason + empty field key) | S3 | Wire `helpers.error('any.custom', { message })` correctly — shared fix with B-F3/C-F3/E-F4 | S | | Open |

## Notes

- Otherwise production-quality. No backend changes needed for the happy path.
- The shared validation-message fix should be applied once across all schemas using the
  `any.custom` pattern (Booking, Account, Hotel details, Holds).
- Optional: confirm the `hold-expiry` worker actually reclaims expired holds (not observed;
  TTL 15 min). Add an integration test with a short TTL.
