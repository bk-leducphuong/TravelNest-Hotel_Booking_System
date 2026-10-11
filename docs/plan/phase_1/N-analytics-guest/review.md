# N — Analytics (Guest): Review

Date: 2026-10-09 · Environment: local dev stack (API :3000, analytics :8081).
Evidence: [`test-results/api.md`](./test-results/api.md).

## Findings

_None feature-specific._

| # | Sev | Axis | Symptom | Root cause | Evidence | Status |
|---|-----|------|---------|-----------|----------|--------|
| — | S4 | API/contract | Unmatched `/analytics/users/<other>/search-summary` returns an HTML 404. | Express default 404 (no route). **Platform-wide** — tracked under A-F2, not N. | api.md N-API-09 | Open (platform) |

## Positives

- **No cross-user exposure**: the `me` endpoints derive the user from `req.user.id`; User B's
  summary is their own (`totalSearches: 0`), not User A's (`259`). There is no path parameter
  that accepts a foreign user id (the arbitrary-id path 404s).
- Public search demand is aggregated (per check-in date / destination) and requires no auth.
- Validation works (`limit ≤ 500`).
- Response envelope `{success, data}` consistent within the module.
- Graceful degradation: the client maps an analytics-service failure to `502 ANALYTICS_SERVICE_UNAVAILABLE` (not exercised).

## Verdict

**✅ Ready.** This is the cleanest feature in the guest tier — correct scoping, no IDOR surface,
working validation, and no UI surface to break. The only note is the platform-wide HTML 404 for
unmatched routes (A-F2).
