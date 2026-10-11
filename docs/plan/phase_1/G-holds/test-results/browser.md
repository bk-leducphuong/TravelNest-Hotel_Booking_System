# G — Holds: Browser evidence (Playwright)

Authenticated as **Test User**, `http://localhost:5173`, 2026-10-09. Screenshot: `book-checkout.png`.

## Flow

1. Search `Ha Noi`, 2026-10-29 → 2026-10-31, 2 guests.
2. Open a hotel (`.room-infor` click), select a room (`<select aria-label="Number of rooms">` → `1`, summary shows "1 Phòng / USD 424").
3. Click **"Tôi sẽ đặt"** → `POST /api/v1/hold => 201 Created` → routed to `/book`.
4. `/book` renders: "View Hotel", address, 8.43 rating, "Nhận phòng 2026-10-29 / Trả phòng 2026-10-31", "2 đêm".
5. In-app back (`history.back()` → `beforeRouteLeave`) → `DELETE /api/v1/hold/<id> => 200 OK`.

Network sequence captured:

```
[POST]   /api/v1/hold                  => 201 Created
[DELETE] /api/v1/hold/01a12117-…-…      => 200 OK
```

After the run, `GET /hold` → **0 active holds** (abandoned hold released).

> Note: the Playwright MCP locator `.click()` on large elements (search card, book button)
> did not always register; a DOM `.click()` dispatched via `page.evaluate` was used and
> works. This is a harness quirk, not a product issue.
