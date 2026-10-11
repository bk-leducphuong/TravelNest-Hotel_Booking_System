# L — Media / Images: Improvements

## Backlog

| # | Finding | Severity | Proposed fix | Effort | Owner | Status |
|---|---------|----------|--------------|--------|-------|--------|
| L-F1 | Non-image upload → 500 | S3 | Wrap the multer fileFilter error as a `400 INVALID_FILE_TYPE` (custom Multer error → 4xx in the error handler) | XS | | Open |
| L-F2 | Envelope `{success,message,data}` differs | S4 | Align with the shared response envelope (A-F1) | S | | Open |
| L-F3 | Invalid entity type → 403 not 400 | S4 | Validate `entityType` before the authz middleware, or map it in authz | XS | | Open |

## Notes

- Authz needs no change — it is comprehensive.
- L-F1 is a one-line error-mapping fix; it also prevents a spurious 500 alert.
- Re-test after fix: upload a `.txt` → expect `400`.
