# K — Notifications & Realtime: Improvements

## Backlog

| # | Finding | Severity | Proposed fix | Effort | Owner | Status |
|---|---------|----------|--------------|--------|-------|--------|
| K-F1 | Hardcoded "2 hrs ago" timestamp | S3 | Bind to `notification.created_at` and format as relative time (i18n) | XS | | Open |
| K-F2 | Read state not persisted on click | S3 | Call `NotificationService.markAsRead(notification.id)` in `viewDetails()` | XS | | Open |
| K-F3 | Dead "See all" button | S4 | Implement a notifications page + navigate, or remove the button | S | | Open |
| K-F4 | Raw ISO timestamps in message | S4 | Format times in the server `message` (or render metadata separately) | S | | ✅ Done (M6) |
| K-F5 | Authenticated sockets rejected (*"missing the subject claim"*) | **S2** | `await verifyJwt(token)` in `platform/realtime/auth.js` (M4 made it async); regression test added | XS | | ✅ Done (M6) |

## Notes

- Backend and realtime need no change beyond **K-F5** (the `await` fix).
- K-F1/K-F2 are one-line client fixes and high-visibility.
- Consider uncommenting/implementing the socket-side `notifications:*` handlers in
  `platform/realtime/namespaces/user.js` if real-time mark-read sync is desired.
