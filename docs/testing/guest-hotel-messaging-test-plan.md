# Guest ↔ hotel messaging: test plan

Feature: booking-scoped chat between a guest and the hotel they booked.
Implementation: PR [#191](https://github.com/bk-leducphuong/TravelNest-Hotel_Booking_System/pull/191) — `server/modules/messaging`, `client/src/views/Messages.vue`, `admin-client/pages/messages/index.vue`.

**Status: not executed as part of writing this plan.** Record fresh results below. The automated suites prove the logic in isolation; they do not prove the HTTP/auth/DB/socket wiring or the two UIs.

Six invariants drive every case:

1. **Durability before visibility.** A message is committed to MySQL before any socket emit. Killing the API after send must not lose it.
2. **No participant, no thread.** A user can only reach a conversation they are a party to (guest = `guest_user_id`, hotel = any member of `hotel_id`). Foreign ids return 404, not 403.
3. **`seq` is per-thread, unique, gap-free and ascending** — under concurrency, not just in happy path.
4. **Unread = messages from the other side with `seq > last_read_seq`**, and cursors never move backwards.
5. **A retried send never creates a second message.**
6. **Guest writes stop after the send window; reads never do.**

## 1. Test levels and what each proves

| Level                                 | Proves                                                                                   | Does not prove                               |
| ------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------- |
| Unit (Jest/Vitest)                    | Seq allocation, idempotency, window, authz branching, flagging, DTO shape                | HTTP envelope, middleware, real SQL, sockets |
| API integration (local stack + MySQL) | Routes, Joi, `authenticate`/`requirePermission`, `requireEntityInHotel`, migrations, SQL | Socket delivery, UI                          |
| Realtime                              | Room joins, access check on join, fanout, typing                                         | Cross-pod fanout (single replica only)       |
| UI (manual, two browsers)             | Inbox, thread, compose, badges, mobile switch, i18n                                      | Load/concurrency                             |
| Non-functional                        | Rate limits, body caps, XSS/SQLi, PII, a11y                                              | —                                            |

Suggested order: A setup → B smoke → C API contract → D authz → E concurrency/idempotency → F realtime → G guest UI → H admin UI → I non-functional → J regression.

## 2. Prerequisites and fixtures

Local stack per `docs/testing/cancellation-refunds-local-test-plan.md` (MySQL, Redis, Keycloak, NATS). Use `make infra-*` helpers and `server/.env.development`; never paste secrets or tokens into evidence.

```bash
yarn workspace @travelnest/server migrate:status
yarn workspace @travelnest/server migrate
yarn workspace @travelnest/server test:unit
```

Required fixtures (create through the admin API/seeds, not raw inserts where possible):

| Fixture                                                                 | Why                               |
| ----------------------------------------------------------------------- | --------------------------------- |
| Hotel A with `ownerA`, `staffA`                                         | Happy path, hotel-side read/reply |
| Hotel B with `ownerB`                                                   | Cross-hotel IDOR                  |
| `guest1` with a `confirmed` booking on Hotel A, check-out in the future | Main thread                       |
| `guest2` with a booking on Hotel A                                      | Sees only their own thread        |
| Booking `expired` on Hotel A                                            | `POST /conversations` → 409       |
| Booking on Hotel A with check-out 31+ days ago                          | Guest read OK, send 409           |
| Cancelled booking on Hotel A                                            | Thread allowed + system line      |

Tokens: sign in through the guest/admin apps and copy the bearer from DevTools, or use the local Keycloak token endpoint. Save as `$GUEST1`, `$GUEST2`, `$OWNER_A`, `$OWNER_B`, `$STAFF_A`. Admin requests need the active hotel:

```bash
-H "Authorization: Bearer $OWNER_A" -H "X-Hotel-Id: $HOTEL_A"
```

Set `RATE_LIMIT_ENABLED=false` for the bulk cases in section E; leave it **on** for section I.

## 3. Stage A — schema and migration checks

| ID  | Check                                                                                                        | Expected                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| A01 | `migrate:status`                                                                                             | both `20261111000000-*` and `20261111000100-*` applied                       |
| A02 | `SHOW TABLES LIKE 'conversation%'` / `'messages'`                                                            | 3 tables exist                                                               |
| A03 | `SHOW INDEX FROM messages`                                                                                   | `messages_conversation_seq_unique`, `messages_conversation_client_id_unique` |
| A04 | `SHOW INDEX FROM conversations`                                                                              | `conversations_booking_unique` is unique; two inbox indexes exist            |
| A05 | `SELECT name FROM permissions WHERE name LIKE 'chat.%'`                                                      | `chat.read`, `chat.respond`                                                  |
| A06 | `SELECT r.name, p.name FROM role_permissions … WHERE p.name LIKE 'chat.%'`                                   | granted to `owner`, `manager`, `staff` only                                  |
| A07 | `migrate:undo --name 20261111000100-add-chat-permissions.js`, then undo the tables migration, then `migrate` | drops/recreates cleanly                                                      |
| A08 | Schema drift CI job                                                                                          | pass (already green on PR)                                                   |

```bash
make infra-mysql ARGS="-e \"SHOW INDEX FROM messages;\""
```

## 4. Stage B — smoke (≈10 minutes)

Two browsers: guest at `/messages`, owner at `/messages`. One booking.

| ID  | Steps                                 | Expected                                                                                               |
| --- | ------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| B01 | Guest opens booking → "Message hotel" | Thread exists once; `GET /conversations` returns one row                                               |
| B02 | Guest sends "Hello" on a fresh thread | Bubble appears immediately; DB has 1 row, `seq=1`, `sender_side='guest'`                               |
| B03 | Owner opens inbox (≤20s poll)         | Guest name, booking code, preview "Hello", unread badge 1                                              |
| B04 | Owner opens thread                    | Badge clears; `conversation_reads.last_read_seq=1`                                                     |
| B05 | Owner replies                         | Appears in guest thread within ~1s without reload                                                      |
| B06 | Guest reloads                         | Both messages persist in ascending order                                                               |
| B07 | Header chat bell                      | Shows unread count when a hotel message arrives while on another page; clears after opening the thread |

## 5. Stage C — API contract

Guest base: `/api/v1/conversations`. Admin base: `/api/v1/admin/conversations`.

| ID  | Request                                                   | Expected                                                                              |
| --- | --------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| C01 | `GET /` (guest1)                                          | `200 {data:[…], meta:{page,limit,total}}`; only own threads; no `guest` field in rows |
| C02 | `GET /?unreadOnly=true`                                   | Only threads with `last_message_seq > last_read_seq`                                  |
| C03 | `GET /?limit=101`                                         | `400 VALIDATION_ERROR`                                                                |
| C04 | `POST /` `{bookingId}` (own booking)                      | `200`, idempotent: repeat returns same `id`                                           |
| C05 | `POST /` `{bookingId}` (guest2's booking)                 | `404 CONVERSATION_NOT_FOUND`; no row created                                          |
| C06 | `POST /` `{bookingId}` (expired booking)                  | `409 CONVERSATION_NOT_ALLOWED`                                                        |
| C07 | `POST /` `{}`                                             | `400 VALIDATION_ERROR`                                                                |
| C08 | `GET /:id/messages?limit=30`                              | ≤30 rows, ascending `seq`, `meta.hasMore`, `meta.latestSeq`                           |
| C09 | `GET /:id/messages?beforeSeq=<firstSeq>`                  | Strictly older rows; no overlap with page 1                                           |
| C10 | `GET /:id/messages?limit=100`                             | 100 rows max (schema cap)                                                             |
| C11 | `GET /unread-count`                                       | `{data:{unread:N}}`; own messages excluded                                            |
| C12 | `POST /:id/messages` `{body:"Hi"}`                        | `201`; response matches later fetch; `seq` increased by 1                             |
| C13 | `POST /:id/messages` `{body:"   "}`                       | `400 MESSAGE_EMPTY`                                                                   |
| C14 | Body of 4001 chars                                        | `400 MESSAGE_TOO_LONG`                                                                |
| C15 | Body with `<img src=x onerror=alert(1)>`                  | Stored verbatim; rendered as text in both UIs (no alert)                              |
| C16 | `POST /:id/read` `{lastSeq:9999}`                         | `{lastReadSeq: latestSeq}` (clamped, not 9999)                                        |
| C17 | `POST /:id/read` `{lastSeq:0}` after reading              | Cursor does not move backwards                                                        |
| C18 | Admin `GET /` with `X-Hotel-Id`                           | Only Hotel A threads, `guest` object present                                          |
| C19 | Admin `GET /` without `X-Hotel-Id`                        | `403 HOTEL_CONTEXT_REQUIRED`                                                          |
| C20 | Admin `GET /unread-count` as platform admin without hotel | `400 HOTEL_CONTEXT_REQUIRED`                                                          |
| C21 | Guest `GET /` using `$OWNER_A` token                      | `200` but empty (owner is not a guest in any thread)                                  |

## 6. Stage D — authorization matrix (highest-value section)

| ID  | Actor → target                                         | Expected                                                                            |
| --- | ------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| D01 | guest2 reads guest1's thread                           | `404 CONVERSATION_NOT_FOUND`                                                        |
| D02 | guest2 sends into guest1's thread                      | `404`; `SELECT COUNT(*) FROM messages` unchanged                                    |
| D03 | guest2 marks guest1's thread read                      | `404`                                                                               |
| D04 | ownerB reads Hotel A thread (`X-Hotel-Id: $HOTEL_B`)   | `403 RESOURCE_ACCESS_DENIED`                                                        |
| D05 | ownerB sends to Hotel A thread                         | `403`; no row                                                                       |
| D06 | ownerA with **no** `X-Hotel-Id`                        | `403 HOTEL_CONTEXT_REQUIRED`                                                        |
| D07 | `staffA` (has `chat.read`/`chat.respond`)              | Can list, read and reply                                                            |
| D08 | Guest user with no hotel role hits admin route         | `403 HOTEL_CONTEXT_REQUIRED` (no header) or `403 HOTEL_ACCESS_DENIED` (with header) |
| D09 | `POST` guest message with no bearer                    | `401 AUTHENTICATION_REQUIRED`                                                       |
| D10 | Socket `chat:join` for guest2's thread as guest1       | ack `{success:false, message:"Conversation not found"}`; no room membership         |
| D11 | Socket `chat:join` for Hotel A thread as ownerB        | ack `{success:false}`                                                               |
| D12 | Admin thread DTO                                       | Contains guest name/avatar only — **no** email or phone                             |
| D13 | Revoke `chat.respond` from `staff` role in DB, restart | Staff can read, `POST` → `403 INSUFFICIENT_PERMISSIONS`; restore after test         |

## 7. Stage E — ordering, idempotency, concurrency

Use `RATE_LIMIT_ENABLED=false` here and restore it afterwards.

| ID  | Steps                                                      | Expected                                                             |
| --- | ---------------------------------------------------------- | -------------------------------------------------------------------- |
| E01 | Send 20 messages sequentially                              | `seq` increments by exactly 1 from the thread's current max; no gaps |
| E02 | Send 20 in parallel (`xargs -P 20`)                        | 20 distinct `seq` values, no duplicates, no gaps                     |
| E03 | Same `clientMessageId` twice, sequential                   | Second response has the **same message `id`**; row count +1 only     |
| E04 | Same `clientMessageId` twice, parallel                     | One row; both responses resolve the same `id`                        |
| E05 | 65 messages, then page through with `beforeSeq`            | 30 + 30 + 5; `hasMore` true,true,false; no duplicates                |
| E06 | Send, then immediately kill the API before the socket emit | Message persists; UI recovers it on next load                        |
| E07 | Guest sends after `check_out_date + 30d`                   | `409 CONVERSATION_SEND_WINDOW_CLOSED`                                |
| E08 | Hotel replies in that same old thread                      | `201` (hotel is never windowed)                                      |
| E09 | Set `status='archived'` via SQL, then send                 | `409 CONVERSATION_CLOSED`                                            |
| E10 | Two staff read independently                               | Each has its own `conversation_reads` row and unread count           |

```bash
seq 1 20 | xargs -P 20 -I{} curl -s -o /dev/null -w "%{http_code}\n" \
  -X POST "$API/api/v1/conversations/$CONV/messages" \
  -H "Authorization: Bearer $GUEST1" -H 'Content-Type: application/json' \
  -d '{"body":"parallel {}"}'

make infra-mysql ARGS="-e \"SELECT seq, COUNT(*) c FROM messages WHERE conversation_id='$CONV' GROUP BY seq HAVING c > 1;\""
```

## 8. Stage F — realtime

Guest uses the `/user` socket; the admin app **polls** (8s thread, 20s inbox) — do not expect sub-second owner delivery.

| ID  | Steps                                              | Expected                                                            |
| --- | -------------------------------------------------- | ------------------------------------------------------------------- |
| F01 | Owner sends while guest has the thread open        | Guest sees it in ~1s with no reload                                 |
| F02 | Guest on a different page receives a hotel message | Header bell increments; `chat:activity` fired                       |
| F03 | Guest opens the thread                             | Badge clears; socket `chat:read` reaches the room                   |
| F04 | Guest types, owner watches                         | `chat:typing` shows for ~3.5s then clears                           |
| F05 | Owner replies, guest watches                       | Guest's own typing indicator not echoed back to them                |
| F06 | Guest `chat:join` twice                            | Idempotent; ack carries `latestSeq`                                 |
| F07 | Disconnect guest socket, owner sends, reconnect    | Message appears on reload/fetch (socket is not the source of truth) |
| F08 | Guest sends while socket is down                   | REST `201`; message appears after reconnect                         |

## 9. Stage G — guest UI

| ID  | Check                       | Expected                                                                      |
| --- | --------------------------- | ----------------------------------------------------------------------------- |
| G01 | Empty state when no threads | "No conversations yet" + guidance                                             |
| G02 | Inbox list                  | Hotel name, booking code, preview, time, unread badge                         |
| G03 | Thread header               | Hotel name + booking code                                                     |
| G04 | "Load earlier"              | Prepends older messages, scroll position stays stable                         |
| G05 | Composer                    | Enter sends, Shift+Enter newline, empty body disables Send                    |
| G06 | System message              | Rendered as a centered pill ("Booking confirmed"), distinct from user bubbles |
| G07 | Flagged message             | Amber border (see gap N04)                                                    |
| G08 | Mobile ≤768px               | List ↔ thread switch; back button returns                                     |
| G09 | Deep link `?bookingId=`     | Opens/creates that thread                                                     |
| G10 | Archived thread             | Composer replaced by "This conversation is closed."                           |
| G11 | Locale switch en/vi         | All new strings translated, no raw keys                                       |
| G12 | Network failure on load     | `ErrorState` + working retry                                                  |

## 10. Stage H — admin UI

| ID  | Check                                 | Expected                                                       |
| --- | ------------------------------------- | -------------------------------------------------------------- |
| H01 | Nav item                              | Visible only with `chat.read`; hidden for a role without it    |
| H02 | No active hotel                       | "Select a hotel" empty state                                   |
| H03 | Inbox                                 | Guest name, booking code, preview, unread badge                |
| H04 | Search by guest name and booking code | Filters client-side                                            |
| H05 | "Unread only"                         | Server-filtered list                                           |
| H06 | Open thread                           | Messages load; badge clears; read cursor persists after reload |
| H07 | Reply                                 | Appears immediately; guest receives it (F01)                   |
| H08 | Polling                               | Guest message appears within ≤8s without interaction           |
| H09 | "Load earlier"                        | Older page prepends, no duplicates                             |
| H10 | Flagged message                       | "Contact shared" tag                                           |
| H11 | Another hotel selected in the header  | Inbox swaps; no cross-hotel rows                               |
| H12 | Mobile/narrow layout                  | List → thread → back works                                     |

## 11. Stage I — non-functional

| ID  | Check                                                        | Expected                                                                    |
| --- | ------------------------------------------------------------ | --------------------------------------------------------------------------- |
| I01 | 61 writes in 15 min for one user (`RATE_LIMIT_ENABLED=true`) | `429` on the excess; reads unaffected                                       |
| I02 | `EXPLAIN` the message page query                             | Uses `messages_conversation_seq_unique`; no full scan                       |
| I03 | 30-message page latency (local)                              | < 200 ms; no N+1 (one query per page + one unread aggregate)                |
| I04 | SQLi body `'; DROP TABLE messages;--`                        | Stored and rendered as text; table intact                                   |
| I05 | XSS body (C15)                                               | No script execution; no `v-html` anywhere in the chat views                 |
| I06 | PII in responses                                             | No email/phone in guest or admin conversation payloads                      |
| I07 | Keyboard only                                                | Tab reaches list items and composer; Enter sends; visible focus             |
| I08 | Screen reader labels                                         | `aria-label` on chat bell, back, composer; unread badge announced           |
| I09 | `RATE_LIMIT_ENABLED=false` still works                       | No limiter regression for other routes                                      |
| I10 | GDPR/account deletion                                        | Deleting the guest user cascades threads and messages (`ON DELETE CASCADE`) |

## 12. Stage J — regression

| ID  | Check                                           | Expected                                                 |
| --- | ----------------------------------------------- | -------------------------------------------------------- |
| J01 | Booking create/confirm still works              | No change to booking flow; thread appears lazily         |
| J02 | Admin confirm booking                           | System line "Booking confirmed" posted once              |
| J03 | Repeat the status event                         | No duplicate system line                                 |
| J04 | Cancel booking                                  | "Booking cancelled" system line; thread remains readable |
| J05 | `/api/v1/notifications`, `/support` socket stub | Unchanged                                                |
| J06 | Other admin pages                               | Nav, reviews, bookings unaffected                        |

## 13. Automated coverage map

| File                                                                      | Cases                                                                                           |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `server/__tests__/unit/modules/messaging/application/sendMessage.test.js` | Authorization per side, empty/long body, send window, idempotent retry, flagging, closed thread |
| `.../application/ensureConversationForBooking.test.js`                    | Existing thread, creation, unknown booking, expired booking, unique-race, ownership             |
| `.../application/getMessages.test.js`                                     | Guest/hotel ownership, pagination passthrough, DTO mapping                                      |
| `.../application/listConversations.test.js`                               | Inbox DTO, unread map, guest hidden on guest side                                               |
| `.../application/markConversationRead.test.js`                            | Clamping, no backwards cursor, ownership                                                        |
| `.../domain/content-flags.test.js`                                        | URL/e-mail/phone detection, false positives (prices, dates, codes)                              |
| `client/tests/**`, `admin-client/tests/**`                                | Existing suites plus en/vi key parity                                                           |

Run:

```bash
yarn workspace @travelnest/server test:unit
yarn workspace @travelnest/client test:unit
yarn workspace @travelnest/admin-client typecheck && yarn workspace @travelnest/admin-client test:unit
```

Not automated and worth adding next: HTTP-level integration for the authorization matrix (D01–D13), a socket integration test for join/deny and fanout, and one Playwright happy-path per app.

## 14. Exit criteria

- All A, B, C, D cases pass. E01–E04 must pass — they guard the core invariant.
- No open Sev-1/Sev-2 defects.
- Migrations apply **and** roll back on a clean database.
- CI green: backend unit/lint, frontend build, admin typecheck/build, schema drift.
- Known gaps below are accepted and recorded, not silently ignored.

## 15. Known gaps and risks (as implemented)

| #   | Gap                                                                     | Impact / next step                                                                                                       |
| --- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| N01 | No per-conversation throttle; only the shared 60 writes/15 min per user | A single user can flood a thread. Add a per-conversation limit before launch at scale.                                   |
| N02 | Admin has no Socket.IO client; polling 8s/20s                           | Up to ~8s reply latency for owners. Add `socket.io-client` to the admin app later.                                       |
| N03 | Single API replica; no `@socket.io/redis-adapter`                       | Enabling `replicas > 1` breaks socket fanout. Persistence keeps data safe; delivery needs the adapter + sticky sessions. |
| N04 | Guest flagged message is signalled by border colour only                | Colour-only signal fails WCAG 1.4.1. Add an icon/label.                                                                  |
| N05 | No attachments, no offline e-mail notification, no moderation console   | Deliberate v1 scope. `conversation_reads.last_notified_seq` is reserved but unused.                                      |
| N06 | No `?aroundSeq` anchor                                                  | Every thread opens at the newest message; permalinks to an old message are not possible yet.                             |
| N07 | Admin timestamps use browser locale, not the admin UI locale            | Minor i18n inconsistency in `formatDateTime`.                                                                            |
| N08 | No backfill for existing bookings                                       | Threads only exist after first access or a `BOOKING_CREATED` event.                                                      |
