# D — Authentication & Session: Improvements

## Backlog

| # | Finding | Severity | Proposed fix | Effort | Owner | Status |
|---|---------|----------|--------------|--------|-------|--------|
| D-F1 | Malformed-token 401 leaks a raw JSON parse error | S3 | Catch parse errors in `verifyJwt` and return a normalised `Malformed JWT` message | XS | | Open |
| D-F2 | Keycloak `parseCallbackUrl` console errors (×3/load) | S3 | Diagnose the silent-check/postMessage message source (callback URL config vs extension); harden the handler | M | | Open |
| D-F5 | Static PEM, no JWKS/key rotation (R1) | S3 | Fetch Keycloak JWKS and select the key by `kid`; cache with rotation | M | | Open |
| D-F6 | Auth error envelope differs from validation envelope | S4 | Shared error envelope (same as A-F1) | S | | Open |

## Notes

- **D-F5 (JWKS)** is the key production gap (already tracked as R1 in
  `PRODUCTION_READINESS.md`).
- D-F1 is a one-line fix and removes an information leak.
- D-F2 is app-wide (it appears on every feature's console) — track it once here and clear it
  for all features.
- D-F6 is the same cross-cutting envelope issue as A-F1.
