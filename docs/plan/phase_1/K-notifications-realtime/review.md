# K — Notifications & Realtime: Review

Date: 2026-10-09 · Environment: local dev stack, authenticated as Test User.
Evidence: [`test-results/api.md`](./test-results/api.md), [`test-results/browser.md`](./test-results/browser.md).

## Findings

| # | Sev | Axis | Symptom | Root cause | Evidence | Status |
|---|-----|------|---------|-----------|----------|--------|
| K-F1 | S3 | UI/UX | Every notification shows **"2 hrs ago"** regardless of its real time (items from 2026-10-07 still say "2 hrs ago" on 2026-10-09). | `Notification.vue` template hardcodes `<p class="notification-time">2 hrs ago</p>`; the real `created_at` is never used. | browser.md | ✅ Fixed (M4) |
| K-F2 | S3 | UI/UX | Clicking a notification marks it read **only in local state**; the read state is **not persisted** (reload → unread again). | `viewDetails()` has `// You can add API call here to update backend` and never calls `NotificationService.markAsRead`. | browser.md, code | ✅ Fixed (M4) |
| K-F3 | S4 | UI/UX | The "See all" footer button does nothing. | `handleSeeAll()` only `console.log`s (navigation commented out; no notifications page). | browser.md | ✅ Fixed (M4) |
| K-F4 | S4 | UI/UX | Notification text embeds raw ISO timestamps ("…before 2026-10-07T15:35:44.000Z"). | Server-generated `message` not human-formatted. | browser.md | ✅ Fixed (M6) |
| K-F5 | **S2** | Realtime/API | **Every authenticated WebSocket namespace** (`/user`, `/property`, `/support`, `/admin`) rejected the connection with *"Bearer token is missing the subject claim"* — realtime notifications and hold-expiry events dead. | M4 made `verifyJwt` **async** (JWKS support), but `platform/realtime/auth.js` still called `verifyJwt(token)` **without `await`**; `resolveAuthenticatedUser` received a pending Promise (`subject` undefined). | [I ui.md](../I-payments-guest-webhook/test-results/ui.md), server logs (`Socket authentication error`) | ✅ Fixed (M6) |

## Positives

- **API is correct and safe**: list, `unreadOnly`, `unread-count`, mark-one, mark-all,
  pagination all `200`; unread count transitions **45 → 44 → 0**; invalid uuid `400`;
  unknown notification `404 NOTIFICATION_NOT_FOUND`; no token `401`.
- **IDOR blocked**: User B marking User A's notification read → **`403 FORBIDDEN`**.
- Notifications are rich (type, category, priority, title, message, metadata).
- **Realtime works**: the client connects to the Socket.IO **`/user` namespace** with the
  Keycloak token (`[userSocket] connected { namespace: /user }`) and receives the handshake
  (`Connected to user namespace`, features list). _(M4 briefly broke this — see **K-F5** — fixed
  in M6.)_
- Popover renders notifications; the unread badge and "Mark all as read" are shown only when
  unread > 0 (verified conditional in code + API count).
- `notification:new` prepends to the list and auto-opens the popover.

## Verdict

**🟡 Partial.** The notification **backend and realtime transport are production-quality** —
scoped, IDOR-safe, correct counts, and a working authenticated socket. The client popover has
three concrete defects (fake timestamp, non-persisted read on click, dead "See all"). **K-F5**
(S2 — an M4 regression that broke every authenticated socket) was found during the feature-I UI run
and **fixed in M6**.

---

> **Update — 2026-10-11 (M1–M6):** every finding recorded above is now **✅ fixed** (see the Status column) or **by-design**. The verdict above reflects the **original** review; the current index marks this feature **✅ Ready**.
