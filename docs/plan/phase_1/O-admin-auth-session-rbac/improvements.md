# O — Admin Auth, Session & RBAC: Improvements

## Backlog

| # | Finding | Severity | Proposed fix | Effort | Owner | Status |
|---|---------|----------|--------------|--------|-------|--------|
| O-F1 | Guest can list the admin catalog (`GET /admin/hotels` → 200) | S3 | Require platform staff or hotel membership for the admin catalog list (don't rely on the broad `hotel.read`), or scope the list to the caller's hotels | S | | ✅ Fixed (M1) |
| O-F2 | Hotel-scoped routes return 400 (not 403) when a caller has no hotel context | S4 | Return `403` (insufficient permissions) when the caller is authenticated but lacks any hotel access; reserve `400` for a missing-but-required id | S | | ✅ Fixed (M4) |
| O-F3 | Soft-deleted rooms still listed | S4 | Filter `status='active'` in the admin rooms list (or show a "deleted" badge) | XS | | ✅ By design (documented) |

## Notes

- RBAC needs no structural change — the scoping and per-permission logic is correct.
- O-F1 is defense-in-depth: the data is already public via `GET /hotels`, but the **admin BFF**
  should not be reachable by ordinary guests. Consider a dedicated permission (e.g.
  `admin.manage_hotels`) for the admin catalog list.
- After O-F1, re-test: guest `GET /admin/hotels` → 403; owner/manager → only their hotels.
