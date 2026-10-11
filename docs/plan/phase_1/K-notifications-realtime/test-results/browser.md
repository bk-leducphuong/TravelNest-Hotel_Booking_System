# K — Notifications & Realtime: Browser evidence (Playwright)

Authenticated as **Test User**, `http://localhost:5173`, 2026-10-09.

## Realtime (K-RT-01) ✅

```
[LOG] [userSocket] connected {id: qaNy-q5xbp1wTDqDAAAH, namespace: /user}
[LOG] [userSocket] namespace handshake received
      {message: "Connected to user namespace", user: Object, features: Array(4)}
```

So the `/user` namespace authenticates with the Keycloak token and completes the handshake.

## Popover (K-UI-01) ✅

Clicking the header bell opens the popover with **20 notification items**, each showing its
message. Badge / "Mark all as read" are hidden while unread = 0 (after the API read-all).

## K-F1 — hardcoded timestamp

All items show the same literal:

```
times: ["2 hrs ago","2 hrs ago","2 hrs ago","2 hrs ago","2 hrs ago"]
```

Template: `<p class="notification-time">2 hrs ago</p>` (no binding to `created_at`).

## K-F2 — read state not persisted on click

`Notification.vue` `viewDetails()`:

```js
if (!notification.is_read) {
  notification.is_read = true;        // local only
  this.calculateNumerOfNewNotifications();
  // You can add API call here to update backend
}
```

`NotificationService.markAsRead(id)` exists and the endpoint works (`200`), but is never called
here — so a click does not persist and the item is unread again after reload.

## K-F3 — dead "See all"

```js
handleSeeAll() {
  this.isNotificationPopupVisible = false;
  // this.$router.push('/notifications');
  console.log('Navigate to all notifications');
}
```
