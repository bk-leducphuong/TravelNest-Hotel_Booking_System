# Fast Seed Pipeline (LOAD DATA) — Implementation Plan

**Status:** proposed
**Target environment:** local dev MySQL (docker, `server/infra/docker-compose.yml`)
**Primary goal:** wall-clock speed for million-row / GB tables
**Decision:** this pipeline **replaces** `seed:all`. The current Sequelize row-by-row
seeders are retained as a legacy fallback (`seed:all:legacy`) for small/reference data
and for environments where `local_infile` is unavailable.

---

## 1. Problem summary

Current bottlenecks, ranked by impact at million-row scale:

| #   | Bottleneck                                                                           | Location                                                                                                                                                                                              |
| --- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `findOrCreate` once per junction link (2 round-trips each)                           | `hotel_amenity.seed.js:114`, `room_amenity.seed.js:97`, plus `user.seed.js`, `city.seed.js:112`, `amenity.seed.js:223`, `destinations.seed.js:61,111`, `permission.seed.js`, `hotel_staff.seed.js`    |
| 2   | Per-booking `rooms.findByPk` + `room_inventory.findOne`                              | `booking.seed.js:164`, `booking.seed.js:132`                                                                                                                                                          |
| 3   | `bulkCreate(..., { validate: true })` (Sequelize instantiates + validates every row) | `room_inventory.seed.js:131,141`, `review.seed.js:411,529`, `room.seed.js:127`, `booking.seed.js:324,420`, `notification.seed.js:383`, `hotel_policy.seed.js:350,398`, `nearby_place.seed.js:321,377` |
| 4   | Entire table accumulated in one array before insert (OOM risk at GB)                 | `review.seed.js`, `booking.seed.js`, `notification.seed.js`                                                                                                                                           |
| 5   | Small batches / one autocommit per batch                                             | `hotel.seed.js:21` (500), `room_inventory.seed.js:87` (10k)                                                                                                                                           |
| 6   | Secondary indexes maintained on every insert                                         | `hotels` (6), `bookings` (7), `room_inventory` (4), `hotel_search_snapshots` (~15)                                                                                                                    |
| 7   | Per-hotel snapshot rebuild loop                                                      | `hotel_search_snapshot.seed.js:87-129` → `snapshotRepo.fullRefresh()`                                                                                                                                 |
| 8   | No bulk-load session tuning                                                          | `config/database.options.js`                                                                                                                                                                          |
| 9   | `faker` called per field, single-threaded                                            | all seeders                                                                                                                                                                                           |

---

## 2. Architecture

```
  [ reference seeders ]        (existing Sequelize code, small tables)
            │
            ▼
  write .seed-tmp/<table>.ids  (parent UUID manifests)
            │
            ▼
  ┌───────────────────────────────────────────┐
  │  per bulk table                            │
  │                                            │
  │  1. drop secondary indexes                 │
  │  2. N worker_threads → Readable streams ─┐ │
  │  3. LOAD DATA LOCAL INFILE (streamed)  ◄─┘ │
  │  4. recreate indexes + ANALYZE TABLE       │
  └───────────────────────────────────────────┘
            │
            ▼
  [ set-based snapshot rebuild (single SQL) ]
```

Key properties:

- **No temp files.** Rows are streamed from a Node `Readable` directly into
  `LOAD DATA LOCAL INFILE` via mysql2's `infileStreamFactory`.
- **Bounded memory.** One shard in flight at a time; no GB arrays.
- **Parallel generation.** `worker_threads`, one shard per CPU core.
- **Aggressive but dev-safe.** `foreign_key_checks=0`, `unique_checks=0`,
  `sql_log_bin=0`, indexes dropped during load.

---

## 3. Infrastructure changes

### 3.1 `server/infra/docker-compose.yml` (service `mysql`)

```yaml
command: >
  --default-authentication-plugin=mysql_native_password
  --local-infile=1
  --max_allowed_packet=1G
  --innodb_flush_log_at_trx_commit=2
  --innodb_buffer_pool_size=2G
  --innodb_log_file_size=1G
  --innodb_flush_method=O_DIRECT_NO_FSYNC
```

Rationale:

- `local-infile=1` — enables the load path (client must also opt in).
- `max_allowed_packet=1G` — remove the per-statement size ceiling.
- `flush_log_at_trx_commit=2` — no fsync per commit (dev only).
- buffer/log sizing — accelerate index rebuild and inserts.

### 3.2 `server/config/database.options.js`

Add a loader connection factory (raw `mysql2`) used only by the bulk path:

```js
function createBulkConnection() {
  return mysql.createConnection({
    host,
    port,
    user: process.env.DB_ADMIN_USER || user,
    password,
    database,
    localInfile: true,
    multipleStatements: true,
    // big batches: disable per-query row limits if needed
  });
}
```

Use `DB_ADMIN_USER` (root) so `SET sql_log_bin=0` is permitted.

---

## 4. Shared library — `server/seeders/lib/`

### 4.1 `bulk.js`

| Function                                           | Purpose                                                       |
| -------------------------------------------------- | ------------------------------------------------------------- |
| `withBulkSession(fn)`                              | open raw connection, apply, and restore bulk session settings |
| `loadStream(conn, table, columns, readable, opts)` | stream a `Readable` into `LOAD DATA LOCAL INFILE`             |
| `listSecondaryIndexes(conn, table)`                | `SHOW INDEX FROM` → DDL stmts                                 |
| `dropSecondaryIndexes(conn, table)`                | drop all non-`PRIMARY` indexes                                |
| `recreateIndexes(conn, table, ddl)`                | re-add indexes, then `ANALYZE TABLE`                          |
| `truncate(conn, tables)`                           | FK-safe truncate                                              |

Session settings applied:

```sql
SET SESSION unique_checks = 0;
SET SESSION foreign_key_checks = 0;
SET SESSION sql_log_bin = 0;
SET SESSION autocommit = 1;
SET sql_mode = '';
```

Load statement template:

```sql
LOAD DATA LOCAL INFILE 'stream'
INTO TABLE `<table>` CHARACTER SET utf8mb4
FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"' ESCAPED BY '\\'
LINES TERMINATED BY '\n'
(`col1`,`col2`,...);
```

Explicit column list per table (including `created_at` / `updated_at`, excluding
generated columns).

### 4.2 `csv.js`

Streaming row serializer:

- escape `"` and `\`; quote strings containing `,` / `"` / newline;
- `NULL` → `\N`; `true`/`false` → `1`/`0`;
- `Date` → `YYYY-MM-DD HH:mm:ss`; `JSON` → `JSON.stringify`;
- `hygiene(text)` to neutralize embedded `\n` / `\r` in free text
  (e.g. `hotel.seed.js:120` `faker.lorem.paragraphs(2, '\n')`).

### 4.3 `parent-index.js`

- `writeManifest(table, ids)` → `.seed-tmp/<table>.ids` (one UUID per line).
- `loadSampler(table)` → O(1) random access; reservoir sampling above a
  configurable row cap (>10M) to bound memory.

Under `foreign_key_checks=0` ordering does not block the load, but sampling from
manifests guarantees no orphan FK values.

### 4.4 `generator-pool.js`

- Split a table into `shards = os.cpus().length` (or `--shards=N`).
- Each worker runs a pure generator and exposes a `Readable`.
- Main thread loads shards sequentially (or up to `--loaders` concurrently for
  disjoint tables).
- Backpressure handled by pausing the stream; no disk buffering.

---

## 5. Generators — `server/seeders/generate/`

Pure functions (no DB, no per-row `await`). Port existing faker logic with:

- pre-built faker value pools (e.g. 500 names, 200 addresses) sampled by index;
- one `uuidv7()` per row (time-ordered, friendly to the clustered PK);
- explicit `created_at` / `updated_at`.

Dependency order and manifests:

| #   | Table                                     | Method                        | Parent IDs sampled   | Emits manifest    |
| --- | ----------------------------------------- | ----------------------------- | -------------------- | ----------------- |
| 0   | countries, cities, amenities, permissions | existing Sequelize            | —                    | cities, amenities |
| 1   | users (+ auth_accounts, user_roles)       | bulk stream                   | cities?              | users             |
| 2   | hotels                                    | bulk stream                   | cities, countries    | hotels            |
| 3   | rooms                                     | bulk stream                   | hotels               | rooms             |
| 4   | room_amenities                            | bulk stream (`INSERT IGNORE`) | rooms, amenities     | —                 |
| 5   | hotel_amenities                           | bulk stream (`INSERT IGNORE`) | hotels, amenities    | —                 |
| 6   | room_inventory                            | bulk stream                   | rooms                | —                 |
| 7   | bookings                                  | bulk stream                   | hotels, rooms, users | —                 |
| 8   | reviews                                   | bulk stream                   | hotels, users        | —                 |
| 9   | notifications                             | bulk stream                   | users                | —                 |
| 10  | hotel_search_snapshots                    | set-based SQL                 | —                    | —                 |

Specific fixes carried into generators:

- junction dedupe via in-memory `Set<parent:child>` (replaces `findOrCreate`);
- bookings: precompute `{room_id → max_guests, quantity}` and
  `{room_id,date → price}` maps once; `booking_code` from a counter + prefix
  instead of random (avoids unique-index collisions/retries).

---

## 6. Snapshot rebuild — set-based

Replace the per-hotel `fullRefresh` loop with a single statement:

```sql
INSERT INTO hotel_search_snapshots (...)
SELECT h.id, h.name, ...,
       MIN(ri.price_per_night), MAX(ri.price_per_night),
       JSON_ARRAYAGG(a.code), ...
FROM hotels h
LEFT JOIN cities c ON ...
LEFT JOIN countries co ON ...
LEFT JOIN rooms r ON r.hotel_id = h.id
LEFT JOIN room_inventory ri ON ri.room_id = r.id AND ri.date >= CURDATE() AND ri.status='open'
LEFT JOIN hotel_amenities ha ON ha.hotel_id = h.id AND ha.is_available = 1
LEFT JOIN amenities a ON a.id = ha.amenity_id
LEFT JOIN hotel_rating_summaries hrs ON ...
LEFT JOIN images i ON i.entity_id = h.id AND i.entity_type='hotel' AND i.is_primary=1
GROUP BY h.id
ON DUPLICATE KEY UPDATE ...;
```

One query instead of ~6 per hotel. Optional follow-up: bulk index to Elasticsearch.

---

## 7. Orchestrator — `server/seeders/database/seed-all.js`

Rewrite `seed-all.js` to drive the fast pipeline. Phases:

1. `truncate` target tables (FK-safe).
2. seed reference tables (existing seeders) → write manifests.
3. per bulk table: drop indexes → generate+load → recreate indexes + `ANALYZE`.
4. set-based snapshot rebuild.
5. report per-phase timings and `SHOW TABLE STATUS` row counts
   (never `COUNT(*)` on millions).

CLI flags:

```
--tables=hotels,rooms      only run selected bulk tables
--scale=1m                 target rows (per table or total, see below)
--shards=N                 generator worker count
--loaders=N                concurrent LOAD DATA connections
--keep-indexes             skip drop/recreate (debug / fallback)
--no-load-data             fall back to queryInterface.bulkInsert batches
--strict                   run model validation on a small sample
```

### 7.1 `package.json` script changes (`server/package.json`)

`seed:all` becomes the fast pipeline; legacy is preserved:

```jsonc
"seed:all":        "cross-env NODE_ENV=development node seeders/database/seed-all.js",
"seed:all:clear":  "npm run seed:clear && npm run seed:all",
"seed:all:quick":  "cross-env NODE_ENV=development node seeders/database/seed-all.js --quick",
"seed:all:legacy": "cross-env NODE_ENV=development node seeders/database/seed-all.legacy.js",
```

`seed-all.legacy.js` = current `seed-all.js` moved verbatim so nothing is lost.

---

## 8. Fallbacks and safety

- Current seeders remain functional; fast path is the default `seed:all` but can be
  disabled with `--no-load-data`.
- If `local_infile` is unavailable, `bulk.js` falls back to
  `queryInterface.bulkInsert` in 10k batches with `validate:false` (~2–3x).
- `--strict` validates a small sample against the Sequelize models.
- `.seed-tmp/` cleaned up; streams bounded to one shard in flight (fixes current
  OOM risk).
- All aggressive settings (`sql_log_bin=0`, index drops, durability) are applied
  only for the duration of the load and scoped to the seeding connection.

---

## 9. Risks

| Risk                                                   | Mitigation                               |
| ------------------------------------------------------ | ---------------------------------------- |
| `local_infile` disabled client or server               | enable both; fall back to bulkInsert     |
| Free text containing newlines/quotes                   | `csv.js` hygiene + parser test           |
| JSON / `\N` / enum / empty-int under strict `sql_mode` | `SET sql_mode=''`; validate sample       |
| `sql_log_bin=0` needs privileges                       | use `DB_ADMIN_USER` (root)               |
| Disk/memory blow-up                                    | stream shards; never hold full array     |
| Index rebuild time/space                               | rebuild only after load; `ANALYZE TABLE` |
| Data correctness drift vs models                       | `--strict` sample check                  |

---

## 10. Expected impact (local dev)

| Optimization                           | Speedup           |
| -------------------------------------- | ----------------- |
| N+1 elimination (junctions/users)      | 10–100x           |
| `validate:false` + raw bulk insert     | 2–3x              |
| drop/recreate indexes + session tuning | 2–5x              |
| LOAD DATA streaming + parallel shards  | 5–20x             |
| snapshot set-based rebuild             | minutes → seconds |

Net for GB tables: **10–50x** wall-clock reduction.

---

## 11. Milestones

1. **M1 — foundation:** `lib/csv.js`, `lib/bulk.js`, `lib/parent-index.js`,
   compose + config changes. Vertical slice: `hotels` and `room_inventory`.
2. **M2 — breadth:** generators for rooms, junctions, bookings, reviews,
   notifications; rewrite `seed-all.js`; `seed:all` switch-over.
3. **M3 — polish:** `generator-pool.js` parallelism, set-based snapshots,
   `--strict`, telemetry, docs.
4. **M4 — validation:** run at `--scale` targets, compare row counts and a
   sampled data sanity report vs legacy, document results in this folder.
