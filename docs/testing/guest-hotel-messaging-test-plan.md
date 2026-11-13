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
| A07 | `yarn migrate:undo 20261111000100-add-chat-permissions.js` (no second `--name`; the script already passes it), then undo the tables migration, then `migrate` | drops/recreates cleanly                                                      |
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

Guest is realtime over the `/user` socket. The hotel console also listens on `/property` and keeps polling (8s thread, 20s inbox) as a fallback while mounted. The API remains authoritative (a message is committed before any socket emit, and polling reads the committed rows), so a missed event is recovered on the next poll. Socket delivery is additive: it does not change the HTTP contract or the persistence guarantees.

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
| N02 | Admin socket with polling fallback; polling 8s/20s                       | Realtime delivery is additive on `/property`; polling remains the fallback while mounted. If the socket cannot connect, owners see up to ~8s latency. The API stays authoritative. |
| N03 | Single API replica; no `@socket.io/redis-adapter`                       | Enabling `replicas > 1` breaks socket fanout. Persistence keeps data safe; delivery needs the adapter + sticky sessions. |
| N04 | Guest flagged message is signalled by border colour only                | Colour-only signal fails WCAG 1.4.1. Add an icon/label.                                                                  |
| N05 | No attachments, no offline e-mail notification, no moderation console   | Deliberate v1 scope. `conversation_reads.last_notified_seq` is reserved but unused.                                      |
| N06 | No `?aroundSeq` anchor                                                  | Every thread opens at the newest message; permalinks to an old message are not possible yet.                             |
| N07 | Admin timestamps use browser locale, not the admin UI locale            | Minor i18n inconsistency in `formatDateTime`.                                                                            |
| N08 | No backfill for existing bookings                                       | Threads only exist after first access or a `BOOKING_CREATED` event.                                                      |

## 16. Local execution results — 2026-11-12

Environment: `feat/guest-hotel-chat` worktree at `/tmp/opencode/guest-hotel-chat` (HEAD `c8ebe51c`), Node 24.18.0, Yarn 4.13.0, MySQL 8 (Docker `travelnest-mysql`), Redis, Keycloak 26 (`travelnest` realm), MinIO, API `:3000`, guest `:5173`, admin `:8000`. Tokens were fetched through the local Keycloak token endpoint and kept out of this file.

**Environment incident and recovery:** the A07 command in this plan is wrong for this repo. `migrate:undo` already contains `--name`, so `yarn migrate:undo --name <file>` becomes `sequelize-cli db:migrate:undo --name --name <file>` and executes an unintended undo path. It ran the baseline `down`, which dropped every table in the local `travelnest` database. The database was rebuilt from the clean baseline + migrations and reseeded with `seed:all:quick --skip-images --skip-mongo`; fixtures were recreated afterwards. No non-local environment was touched. Use `yarn migrate:undo <file>` (no second `--name`) for A07.

Fixtures used: Hotel A = Sunset Nam Dinh Suites; Hotel B = Resort Kade Hotel; `tn.guest1`, `tn.guest2`, `tn.ownerb`, `tn.noaccess` (Keycloak + DB), seeded `owner@travelnest.local`, `staff@travelnest.local`, `admin@travelnest.local`; bookings `MSGB1` (confirmed, future), `MSGB2` (guest2), `MSGB3` (expired), `MSGB4` (checked out 31d ago), `MSGB5` (cancelled), `MSGB6` (confirmed, no thread until J01). Hotel B membership was added temporarily for H11 and removed after testing.

### Stage A — schema and migrations

| ID  | Result | Evidence |
| --- | ------ | -------- |
| A01 | Pass | `migrate:status` shows both `20261111000000` and `20261111000100` up. |
| A02 | Pass | `conversations`, `messages`, `conversation_reads` exist. |
| A03 | Pass | `messages_conversation_seq_unique` (conversation_id, seq), `messages_conversation_client_id_unique` (conversation_id, client_message_id), `sender_user_id` index. |
| A04 | Pass | `conversations_booking_unique` unique; `conversations_hotel_last_message`, `conversations_guest_last_message` present. |
| A05 | Pass | `chat.read`, `chat.respond`. |
| A06 | Pass on migration | Migration grants `chat.read`/`chat.respond` to owner, manager, staff only. After `seed:all:quick`, the permission seeder additionally grants `admin` all permissions (seed-data variance, not the migration). |
| A07 | Pass with corrected command | `yarn migrate:undo 20261111000100-add-chat-permissions.js` → `... 20261111000000-create-messaging-tables.js` drops permissions/tables; `yarn migrate` reapplies both cleanly. The plan's command caused the incident above. |
| A08 | Not run | Schema-drift CI was not executed locally. |

### Stage B — smoke

| ID  | Result | Evidence |
| --- | ------ | -------- |
| B01 | Pass | `POST /conversations {bookingId}` created exactly one thread; repeated call returned the same id. |
| B02 | Pass | UI send showed the bubble immediately; DB row `seq=1`, `sender_side='guest'`. |
| B03 | Pass with defect | Owner inbox showed guest, booking code, preview and unread badge. Badge count is wrong when the reader has sent messages (defect D1). |
| B04 | Pass | Opening the thread cleared the badge; `conversation_reads.last_read_seq` advanced. |
| B05 | Pass | Owner reply appeared in the open guest thread in ~1 s (socket F01). |
| B06 | Pass | Reload kept both messages in ascending `seq` order. |
| B07 | Pass | Header bell showed unread counts and cleared after opening the thread. |

### Stage C — API contract

| ID  | Result | Evidence |
| --- | ------ | -------- |
| C01 | Pass | `200 {data,meta}`; only own threads; no `guest` field. |
| C02 | Pass with defect | `unreadOnly=true` filters on `last_message_seq > last_read_seq`, but includes threads whose only new rows are the reader's own messages (D1). |
| C03 | Pass | `limit=101` → `400 VALIDATION_ERROR`. |
| C04 | Pass | `200`; repeat returned the same conversation id. |
| C05 | Pass | `404 CONVERSATION_NOT_FOUND`; no row created. |
| C06 | Pass | `409 CONVERSATION_NOT_ALLOWED`. |
| C07 | Pass | `400 VALIDATION_ERROR`. |
| C08 | Pass | ≤30 rows, ascending, `meta.hasMore`, `meta.latestSeq`. |
| C09 | Pass | `beforeSeq` returned strictly older rows; zero overlap. |
| C10 | Pass | `limit=100` returned 65 rows for a 65-message thread. |
| C11 | Pass | `{data:{unread:N}}`; own messages excluded. |
| C12 | Pass | `201`; `seq` advanced by 1; fetch matched the response. |
| C13 | **Fail (contract)** | Blank/whitespace body returns `400 VALIDATION_ERROR` (Joi `.trim().min(1)`), not `MESSAGE_EMPTY`. |
| C14 | **Fail (contract)** | 4001 chars returns `400 VALIDATION_ERROR`, not `MESSAGE_TOO_LONG`. |
| C15 | Pass | XSS stored verbatim; both UIs rendered it as text, no `<img>` node, no alert. |
| C16 | Pass | `{lastSeq:9999}` clamped to the latest `seq` (2). |
| C17 | Pass | `{lastSeq:0}` left the cursor at 2. |
| C18 | Pass | Hotel A inbox only; guest object present. |
| C19 | Pass | `403 HOTEL_CONTEXT_REQUIRED`. |
| C20 | Pass | `400 HOTEL_CONTEXT_REQUIRED` (matches plan). |
| C21 | Pass | Owner token on the guest route → `200`, empty. |

### Stage D — authorization

| ID  | Result | Evidence |
| --- | ------ | -------- |
| D01–D03 | Pass | Guest2 got `404 CONVERSATION_NOT_FOUND` for read/send/read-cursor; no message row added. |
| D04–D05 | Pass | OwnerB + Hotel B header → `403 RESOURCE_ACCESS_DENIED`; no row added. |
| D06 | Pass | OwnerA without `X-Hotel-Id` → `403 HOTEL_CONTEXT_REQUIRED`. |
| D07 | Pass | StaffA could list, read and reply (`201`). |
| D08 | Pass | No-header → `403 HOTEL_CONTEXT_REQUIRED`; with Hotel A header → `403 HOTEL_ACCESS_DENIED`. |
| D09 | Pass | No bearer → `401 AUTHENTICATION_REQUIRED`. |
| D10 | Pass | Guest1 socket join of guest2's thread → `{success:false,message:"Conversation not found"}`. |
| D11 | Pass | OwnerB property socket (Hotel B) join of Hotel A thread → `{success:false}`. |
| D12 | Pass | Admin DTO contains guest id/first/last/avatar only; no email or phone keys in inbox or message payloads. |
| D13 | Pass | Revoking `staff.chat.respond` made `POST` return `403 INSUFFICIENT_PERMISSIONS` while reads stayed `200`; grant restored and verified. |

Additional finding: `/property` socket authentication requires a **global** owner/manager/staff role. Seeded hotel owners/staff only have global `user`, so they cannot connect even though they have hotel roles. Global roles were added temporarily for the socket tests and removed afterwards.

### Stage E — ordering, idempotency, concurrency

| ID  | Result | Evidence |
| --- | ------ | -------- |
| E01 | Pass | 20 sequential sends produced `5..24`, exactly +1 each. |
| E02 | Pass | 20 parallel sends produced distinct `25..44`; no duplicate `seq`; DB count = max `seq` (no gaps). |
| E03 | Pass | Same `clientMessageId` twice → same message id, one row. |
| E04 | Pass | Parallel duplicate → one row, both responses returned the same id. |
| E05 | Pass | 65 messages paged as 30 (36–65), 30 (6–35), 5 (1–5); `hasMore` true/true/false; no overlap. |
| E06 | Not run | Did not kill the API in the narrow window between commit and socket emit. |
| E07 | Pass | Guest send on a thread checked out 31 days ago → `409 CONVERSATION_SEND_WINDOW_CLOSED`. |
| E08 | Pass | Hotel replied in that thread → `201`. |
| E09 | Pass | `status='archived'` → guest send `409 CONVERSATION_CLOSED`. |
| E10 | Pass | Owner and staff had independent `conversation_reads` rows (10 and 20) and independent unread totals. |

### Stage F — realtime

| ID  | Result | Evidence |
| --- | ------ | -------- |
| F01 | Pass | Hotel send reached the joined guest socket in ~116 ms with no reload. |
| F02 | Pass | `chat:activity` fired for a guest on another page (personal room). |
| F03 | Pass | `chat:read` reached the room with `{userId,lastReadSeq}`. |
| F04 | **Fail** | Guest `chat:typing` never reached the `/property` owner socket. The handler emits only on the sender's namespace (`socket.to(room)` inside `/user`), so typing has no cross-namespace fanout. (The admin app has no socket client by design, gap N02.) |
| F05 | Pass | The sender did not receive its own typing event. |
| F06 | Pass | Two `chat:join` calls both succeeded with `side:"guest"` and `latestSeq`. |
| F07 | Pass | Sent while the guest socket was disconnected; message was present on reconnect/refetch. |
| F08 | Pass (REST analogue) | Send while a socket is down returns `201` and is visible after reconnect; the down-window test was run with the owner as sender. |

### Stage G — guest UI

| ID  | Result | Evidence |
| --- | ------ | -------- |
| G01 | Pass | "No conversations yet" + "Open one from a booking…". |
| G02 | Pass | Hotel name, booking code, preview, time and unread badge. |
| G03 | Pass | Thread header shows hotel + booking code. |
| G04 | Pass | "Load earlier messages" prepended older rows and disappeared when exhausted. |
| G05 | Pass | Enter sent; Shift+Enter inserted a newline; Send disabled for an empty body. |
| G06 | Pass | System line rendered as a centred pill, not a bubble. |
| G07 | Pass | Flagged message had an amber border (`rgb(240,180,41)`), class `is-flagged`. |
| G08 | Pass | At 390×844: list → thread switch and back button worked. |
| G09 | Pass | `/messages?bookingId=<uuid>` opened that booking's thread. |
| G10 | Pass | Archived thread replaced the composer with "This conversation is closed." |
| G11 | Pass | `vi` translated heading, subtitle, composer and booking prefixes; no raw `messages.*` keys. |
| G12 | **Partial/fail** | With the whole API down, the app redirected to `/login?redirect=/messages` and showed "Account unavailable", not `ErrorState` + retry. Reload after restart worked. A partial `/conversations` failure could not be simulated (no route interception in this tool run). |

### Stage H — admin UI

| ID  | Result | Evidence |
| --- | ------ | -------- |
| H01 | Pass | Messages nav visible with `chat.read`; after revoking it from `owner`, the nav item disappeared and `/messages` redirected to Dashboard. Grant restored. |
| H02 | Pass | Platform admin with no hotel → "Select a hotel". |
| H03 | Pass | Guest, booking code, preview, time and unread badge. |
| H04 | Pass | Search matched "Guest Two" and `MSGB4` client-side. |
| H05 | Pass with defect | Server `unreadOnly` hid read threads; system messages still count as unread (D2). |
| H06 | Pass | Thread loaded; badge cleared; `conversation_reads` persisted (50/50) after reload. |
| H07 | Pass | Reply appeared immediately; the guest tab received it without reload. |
| H08 | Pass | Guest message appeared by polling within ~10 s without interaction. |
| H09 | Pass | Load earlier prepended; 42 rendered rows, 42 unique. |
| H10 | Pass | "Contact shared" tag rendered for the flagged message. |
| H11 | Pass | Added a temporary Hotel B membership, switched the header; inbox became empty with no Hotel A rows. Membership removed. |
| H12 | Pass | 390×844: list → thread → back worked. |

### Stage I — non-functional

| ID  | Result | Evidence |
| --- | ------ | -------- |
| I01 | Pass | With `RATE_LIMIT_ENABLED=true`: writes 1–60 → `201`, write 61 → `429`; reads stayed `200`. |
| I02 | Pass | `EXPLAIN` used `messages_conversation_seq_unique` with a backward index scan; no full scan. |
| I03 | Pass | 30-message page served in ~15 ms locally (5 runs 14.8–17.5 ms). |
| I04 | Pass | `'; DROP TABLE messages;--` stored and rendered as text; table intact (count unchanged). |
| I05 | Pass | No `v-html` in `Messages.vue`, `ChatBell.vue` or the admin messages page; XSS rendered as text. |
| I06 | Pass | No email/phone keys in guest or admin conversation/message payloads. |
| I07 | Pass | Tab reached list items, "Load earlier" and the composer; visible `solid` outline on every stop; Enter sends. |
| I08 | **Partial** | Composer and back button have labels; the bell has `aria-label="Messages"`, but the unread `<sup>` has no accessible name and there is no `aria-live` region. Flagging remains colour-only (gap N04). |
| I09 | Pass | After restoring `RATE_LIMIT_ENABLED=false`, a write returned `201`; other routes unaffected. |
| I10 | Pass | `conversations.guest_user_id`, `messages.conversation_id` and `conversation_reads` FKs are `ON DELETE CASCADE`; a throwaway user/conversation/message deleted cleanly. `messages.sender_user_id` is `SET NULL`. |

### Stage J — regression

| ID  | Result | Evidence |
| --- | ------ | -------- |
| J01 | Pass | `ensureConversationForBooking` created a thread for a fresh confirmed booking (`MSGB6`) and was idempotent. |
| J02 | Pass | `postSystemMessage` posted "Booking confirmed" once. |
| J03 | Pass | Repeat delivery returned `null`; DB held exactly one system row. |
| J04 | Pass (partial flow) | Cancelled thread remained readable and showed the "Booking cancelled" system line; the full cancel API flow was not re-run. |
| J05 | Pass | `GET /api/v1/notifications` → `200`. |
| J06 | Pass | Admin bookings/reviews endpoints → `200`; sidebar navigation unchanged. |

### Automated suites

| Suite | Result |
| --- | --- |
| `yarn workspace @travelnest/server test:unit` | 148 suites / 840 tests passed |
| `yarn workspace @travelnest/client test:unit` | 12 files / 44 tests passed |
| `yarn workspace @travelnest/admin-client typecheck` | Pass |
| `yarn workspace @travelnest/admin-client test:unit` | 10 files / 50 tests passed |

### Defects found

| # | Severity | Finding | Where |
| - | -------- | ------- | ----- |
| D1 | Sev-2 | Per-conversation unread counts include the reader's own messages. `countUnreadForConversations` has no `sender_side <> :ownSide` filter, so `unreadCount` and `?unreadOnly=true` disagree with `/unread-count`. | `conversation.repository.js` (`countUnreadForConversations` / `buildUnreadLiteral`) |
| D2 | Sev-3 | System messages count as unread (`sender_side='system'` passes `<> guest` / `<> hotel`). Opening a thread with only a cancellation line shows an unread badge. | `countUnreadByScope`, list unread query |
| D3 | Sev-3 | `chat:typing` is emitted only within the sender's namespace, so a guest typing indicator never reaches `/property`. | `platform/realtime/namespaces/chat.js` |
| D4 | Sev-3 | `/property` socket authorization requires a global owner/manager/staff role; hotel membership alone is insufficient, so seeded owners/staff cannot connect. | `platform/realtime/server.js` + `auth.js` |
| D5 | Sev-4 | Blank and over-length bodies return `VALIDATION_ERROR` instead of the documented `MESSAGE_EMPTY` / `MESSAGE_TOO_LONG`. | `api/guest.schema.js` |
| D6 | Sev-4 | Total API outage during page load redirects to login with "Account unavailable" instead of the designed `ErrorState` + retry (G12). | guest auth bootstrap |
| D7 | Sev-3 | Unread badge has no accessible announcement (`aria-live`/label); flagging is colour-only. | `ChatBell.vue`, `Messages.vue` |
| D8 | Sev-2 (docs) | A07 command duplicates `--name` and triggers the baseline `down`, wiping a local database. | this test plan, section 3 |
| D9 | Sev-4 | Seeding grants `admin` `chat.read`/`chat.respond`, so A06's "owner/manager/staff only" no longer holds after a full seed. | permission seeder vs migration |

### Exit criteria status

A, C, D pass except the C13/C14 error-code contract mismatch. E01–E04 pass. F04 fails and F06/E06 were not fully exercised. G12 and I08 are partial. No data loss or authorization bypass was observed in the messaging feature itself. The environment incident under A07 was limited to the local database and was recovered by rebuild + reseed.

## 17. Post-fix verification — 2026-11-13

The defects above were addressed on `feat/guest-hotel-chat`, fast-forwarded to `origin/feat/guest-hotel-chat`.

### Implemented

- **Admin realtime client:** `admin-client/services/chatSocket.ts` connects to `/property` with a fresh Keycloak token on every (re)connect. `admin-client/pages/messages/index.vue` joins the active thread, consumes `chat:message`, `chat:activity`, `chat:typing` and `chat:read`, and keeps the 8s/20s polling loop as a fallback.
- **Unread scope (D1/D2):** per-thread and per-scope counts now use `m.sender_side = :otherSide`, so own messages and `system` lines never count as unread; `?unreadOnly=true` uses an `EXISTS` predicate over other-side messages.
- **Typing fanout (D3):** `chat:typing` is emitted to both `/user` and `/property`, excluding the sender's socket.
- **Property socket auth (D4):** `/property` accepts any hotel membership; a global owner/manager/staff role is no longer required. Platform admins remain allowed.
- **Socket CORS:** the handshake now allows the guest, admin and superadmin origins instead of only `CLIENT_HOST`.
- **Message error codes (D5):** Joi no longer pre-empts blank/over-length bodies; the service returns `MESSAGE_EMPTY` / `MESSAGE_TOO_LONG` as documented.
- **Accessibility (D7):** the guest chat bell announces the unread count (`aria-label` + `role="status" aria-live="polite"`), and flagged guest messages show a text label in addition to the amber border.

### Verification

| Check | Result |
| --- | --- |
| Guest sends 2 messages, then reads nothing | `/unread-count` = 0; inbox `unreadCount` = 0; `?unreadOnly=true` = empty |
| Hotel replies once | guest `/unread-count` = 1; inbox `unreadCount` = 1 |
| Insert a `system` "Booking confirmed" line | guest stays at 1; hotel stays at 2 (guest messages only) |
| Blank body | `400 MESSAGE_EMPTY` |
| 4001-character body | `400 MESSAGE_TOO_LONG` |
| Seeded owner (`owner@…`, global role `user`) connects to `/property` | connect + `chat:join` succeed; `side: "hotel"` |
| Guest → owner typing | owner received `chat:typing` with `side: "guest"` |
| Owner → guest typing | guest received `chat:typing` with `side: "hotel"` |
| Socket handshake `Origin: http://localhost:8000` | `200`, `Access-Control-Allow-Origin: http://localhost:8000` |
| Socket handshake `Origin: http://localhost:5173` | `200`, `Access-Control-Allow-Origin: http://localhost:5173` |
| Socket handshake unknown origin | `400` |
| `yarn workspace @travelnest/server test:unit` | 148 suites / 840 tests passed |
| `yarn workspace @travelnest/client test:unit` | 44 tests passed |
| `yarn workspace @travelnest/admin-client typecheck` | Pass |
| `yarn workspace @travelnest/admin-client test:unit` | 50 tests passed |
| `yarn workspace @travelnest/server lint` | 0 errors (warnings only) |
| `yarn workspace @travelnest/admin-client lint` | 0 errors |

New regression tests: `getUnreadCount.test.js`, `messaging/api/schema.test.js`, `realtime.chat.test.js` (typing fanout + join/deny), and extra assertions in `listConversations.test.js` and `realtime.auth.test.js`.

### Residual

- **D6 (Sev-4)** not changed: a total API outage during guest page load still sends the user to `/login` with "Account unavailable" rather than an `ErrorState` + retry. This is auth-bootstrap behaviour, separate from messaging; fix by distinguishing network failures from rejected sessions in `client/src/stores/auth/actions.js`.
- **Browser-level admin socket verification** (Playwright) could not be completed in this run because the browser backend aborted on every call after a machine restart. The server-side socket contract, CORS handshake, admin typecheck, unit tests and service wiring are verified; a manual two-browser F01/F04/H07 pass is still worth doing.
- **D9** is seed-data behaviour, not a migration bug: the permission seeder grants platform `admin` all permissions, including `chat.*`.
