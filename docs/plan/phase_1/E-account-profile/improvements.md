# E — Account & Profile: Improvements

## Backlog

| # | Finding | Severity | Proposed fix | Effort | Owner | Status |
|---|---------|----------|--------------|--------|-------|--------|
| E-F1 | Stale "Change password" UI calls removed endpoint (410) | S3 | Replace the form with a link/redirect to Keycloak account management (or hide it); remove the `PATCH /user/password` reference | S | | Open |
| E-F2 | Free-text profile fields accept raw HTML | S3 | Sanitise/normalise text fields on write (server-side); keep output escaping | S | | Open |
| E-F3 | Misleading "at least one field" message on unknown-only payload | S4 | Detect stripped/unknown keys and return a clearer error (or `400 UNKNOWN_FIELDS`) | S | | Open |
| E-F4 | Empty field key on empty-body error | S4 | Attach `object.min` message to a named key (shared with B-F4) | XS | | Open |

## Notes

- E-F1 is the only user-visible defect; a small client change resolves it. Consider whether
  the whole "Security settings" section should point to Keycloak.
- E-F2 is defensive hardening (no live XSS today).
- After E-F1, remove `UserService.updatePassword` or repoint it.
