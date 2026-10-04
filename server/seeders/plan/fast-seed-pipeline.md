# Fast Seed Pipeline (LOAD DATA) — Implementation Plan

**Status:** M1–M3 + image fast seeder implemented (`feat/fast-seed-pipeline`)
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

---

## 12. Implementation status

### M1 — done (branch `feat/fast-seed-pipeline`)

Shared library (`server/seeders/lib/`):

- `env.js` — resolves DB config from `.env.<NODE_ENV>` and the `.seed-tmp/` dir.
- `faker.js` — lazy, cached `@faker-js/faker` loader.
- `csv.js` — streaming MySQL `LOAD DATA` CSV serializer (`\N` NULLs, quoting,
  backslash escaping, UTC dates).
- `bulk.js` — raw `mysql2` connections, bulk session settings, streaming
  `LOAD DATA LOCAL INFILE` (no temp file), index drop/rebuild, truncate.
- `parent-index.js` — id manifests + bounded-memory reservoir sampler.

Generators (`server/seeders/generate/`): `hotels.gen.js`, `rooms.gen.js`,
`room_inventory.gen.js`.

Orchestrator: `seed:all` drives the fast pipeline directly (see M2). The
standalone `seed-fast` CLI and `seed:fast*` npm scripts were removed to avoid
confusion with `seed:all`.

Infra: MySQL dev compose command tuned (`--local-infile=1`,
`--max-allowed-packet=1G`, `--innodb-flush-log-at-trx-commit=2`, buffer/log
sizing) and `seeders/.seed-tmp/` ignored.

Verified without dependencies: syntax-checked all files; unit-checked CSV
escaping / `LOAD DATA` SQL text and the `room_inventory` generator output.

### M2 — done (branch `feat/fast-seed-pipeline`)

- New generators: `hotel_amenities.gen.js`, `room_amenities.gen.js`,
  `bookings.gen.js`, `reviews.gen.js`, `notifications.gen.js`.
- Set-based snapshot rebuild in `lib/snapshots.js` (single
  `INSERT ... SELECT ... ON DUPLICATE KEY UPDATE`, indexes dropped/rebuilt).
- Shared pipeline extracted to `lib/pipeline.js` (table registry, runners,
  manifest management). `seed-all.js` consumes it directly.
- `seed:all` **replaced** by a hybrid orchestrator: reference tables via the
  existing Sequelize seeders, large tables via the fast pipeline. The previous
  `seed-all.js` is preserved as `seed-all.legacy.js` (`seed:all:legacy`).
- Parent-id manifests (`users`, `rooms`) auto-built when bookings/reviews/
  notifications need samplers (`--refresh-manifests` to force).
- `notifications` / `hotel_amenities` / `room_amenities` enum values follow the
  legacy mappings so loaded data stays valid.

Verification (without `yarn install`): prettier `--check` clean; eslint `--quiet`
clean (only `no-console` warnings, matching existing seeders); every generator
executed against the real `@faker-js/faker` with zero missing columns and
serialized correctly; `bulk`/`pipeline`/`snapshots` require without errors.

### M3 — done (branch `feat/fast-seed-pipeline`)

- Converted the last hotel-dependent seeders to generators:
  `hotel_policies.gen.js`, `hotel_cancellation_rules.gen.js`,
  `nearby_places.gen.js`; `seed-all` now runs them on the fast path.
- Added `lib/generator-pool.js` + `lib/generate-shard-worker.js`: parallel
  `worker_threads` generation of CSV shards, loaded via `bulk.loadFiles`.
  Wired to the `hotels` generator behind `--shards=N` /
  `--shard-concurrency=N` (default 1 = existing streaming path).
- The default table order now includes the three policy/place tables.
- Graceful fallback: when `local_infile` is OFF the pipeline automatically uses
  batched multi-row INSERTs via `bulk.insertRows` instead of failing.
- MongoDB analytics seeders (`search_logs`, `hotel_view_events`) are now part of
  `seed:all` (options-driven; `--skip-mongo` to opt out). They no longer close
  the shared Sequelize connection when run in-process.
- mysql2 connections pinned to `timezone: 'Z'` so the INSERT fallback stores the
  same UTC wall-clock as `LOAD DATA` and Sequelize; removed the invalid
  `localInfile` connection option (mysql2 always advertises `LOCAL_FILES` and
  uses the per-query `infileStreamFactory`).

Verification (without `yarn install`): prettier `--check` clean; eslint `--quiet`
clean; all **11** generators executed against the real faker with zero missing
columns; the worker-thread shard pool generated 3 shards / 10 rows end-to-end.
Live against the running dev MySQL (temporary tables only, no persistence):
`LOAD DATA` round-trips quotes/newlines/backslashes/NULL/empty-string/JSON and
UTC datetimes; the INSERT fallback works; `createFastContext` →
`runFastTable` → `loadTable` orchestration works and detects `local_infile=OFF`.

### M4 — next (full run)

- `yarn install` in the worktree, then (for the LOAD DATA path) restart dev MySQL
  with the updated compose command or grant `SET GLOBAL local_infile=1`.
- Run `seed:all --quick` then a full run; validate row counts and data, and
  benchmark each table vs `seed:all:legacy`.
- Optionally extend `--shards` to `rooms` / `room_inventory` (needs worker-side
  parent streaming or file-based parent sharding).

---

## 13. Fast image seeder (direct MinIO + bulk metadata)

`seeders/database/images.seed.js` was the slowest seeder: one HTTP request per
image plus a hardcoded `setTimeout(100ms)` between images, so throughput was
capped at ~10 images/s. Each upload also cost a MinIO PUT, two DB writes, a NATS
event, and then the consumer downloaded the original and re-uploaded a variant.

The fast path writes objects straight to MinIO and bulk-inserts metadata, with
no API/media-service/NATS dependency.

| File                                     | Role                                                                                                                                                          |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `server/seeders/generate/images.gen.js`  | Loads source albums, decodes each source **once** (`sharp`) and pre-builds its `medium_webp` variant; builds `images` / `image_variants` rows and object keys |
| `server/seeders/lib/minio-objects.js`    | MinIO put/remove helpers + a bounded-concurrency limiter                                                                                                      |
| `server/seeders/lib/images.js`           | `runImages()`: entity streaming, pooled uploads, batched metadata inserts, keyset-paginated cleanup                                                           |
| `server/seeders/database/seed-images.js` | CLI (`seed:images`)                                                                                                                                           |
| `server/seeders/database/images.seed.js` | Unchanged; still available as `seed:images:legacy`                                                                                                            |

Key points:

- All entities reuse the same 3 hotel + 3 room source files, so decoding and
  variant generation happen once, not per entity.
- Object keys mirror the media service: `{type}/{entityId}/{imageId}.{ext}` and
  `..._medium.webp`; `is_primary = 1` for the first album image and `NULL` for
  the rest (keeps `unique_primary` valid); `status = 'active'`.
- Variants are **real** WebP (≤800px) rather than the media service's
  placeholder (which uploaded AVIF bytes labelled `image/webp`).
- `replace` (default on) keyset-paginates deletes of existing rows + objects so
  re-runs stay idempotent.
- `seed:all` uses it as the default images step; `--skip-images` still applies,
  and `--images-concurrency=N` tunes PUT parallelism.

Measured on local docker (500 hotels → 1500 images / 3000 objects): **1.74 s**
≈ **863 images/s / 1726 objects/s**, versus the ~10 images/s ceiling of the
previous seeder (~86x).

Verified: real AVIF decode + variant build; row builders against the real schema
via `CREATE TABLE ... LIKE` (columns, enums, `unique_primary`); full
`runImages` run against MinIO + scratch tables (cleanup, 1 primary per entity,
objects present with correct content type, object removal); `seed-all` wiring and
CLI arg parsing. Real `images`/`image_variants` rows were not modified.

---

## 14. Live test results (isolated test databases)

Ran against throwaway databases so dev data was untouched:
MySQL `travelnest_seedtest`, MongoDB `travelnest_analytics_seedtest`, MinIO
bucket `uploads-seedtest`.

`seed:all --quick --skip-keycloak` → **22/22 steps passed, 260 s total**.

| Step            | Rows       | Time        |
| --------------- | ---------- | ----------- |
| Hotels          | 5,040      | 0.49s       |
| Rooms           | 20,230     | 0.49s       |
| Hotel Amenities | 50,424     | 1.20s       |
| Room Amenities  | 111,260    | 6.01s       |
| Room Inventory  | 606,900    | 27.37s      |
| Hotel Policies  | 42,870     | 0.55s       |
| Nearby Places   | 75,646     | 8.05s       |
| Bookings        | 75,653     | 5.76s       |
| Reviews         | 50,702     | 1.20s       |
| **Images**      | **75,810** | **198.05s** |
| Snapshots       | 5,040      | 2.85s       |

Verification: every hotel (5,040) and room (20,230) has images; exactly one
`active` primary per entity (25,270/25,270); `image_variants` 1:1 with images;
all snapshots have `primary_image_url`; MongoDB got 5,000 search logs and
78,017 view events.

Bugs found and fixed during this test (all were caught only by running it):

1. Every fast runner destructured `options` from the context object while
   `runFastTable` passed it as a second argument → all fast tables failed.
2. MySQL refuses to drop an index that backs a foreign key; index drop/rebuild
   is now FK-aware (FK-backed indexes are kept).
3. `ensureManifests` skipped existing manifests, so a stale/empty
   `rooms.ids` from a failed run broke bookings. Manifests are now rebuilt right
   before each table runs, and `seed:all` clears the scratch dir on start.
4. MinIO bucket names cannot contain underscores (use `uploads-seedtest`).

### Observation: image seeding is I/O bound, not overhead bound

Images are 198 s of the 260 s run. MinIO received ~48 GB for 302k objects
because `images/rooms/room_3.avif` is ~980 KB and is uploaded to every room
(plus its WebP variant). A full-scale run with ~69k rooms would push tens of
GB. Options if that matters: shrink the room source fixtures, add a
max-bytes downscale/skip rule, or seed hotel images only.

## 15. Seeder coverage audit — is `seed:all` self-sufficient?

Every seeding entry point in the repo was reviewed against `seed:all`:

| Seeder                                                                                          | npm script               | In `seed:all`?                                                                                             |
| ----------------------------------------------------------------------------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `database/seed-all.js`                                                                          | `seed:all`               | — (the orchestrator)                                                                                       |
| `seed-all.legacy.js`                                                                            | `seed:all:legacy`        | reference baseline                                                                                         |
| `database/seed-images.js`                                                                       | `seed:images`            | ✅ step _Images_ (now hotel + room + **city**)                                                             |
| `mongodb/search_logs.seed.js`                                                                   | `seed:search_logs`       | ✅ step _MongoDB Search Logs_                                                                              |
| `mongodb/hotel_view_events.seed.js`                                                             | `seed:hotel_view_events` | ✅ step _MongoDB Hotel View Events_                                                                        |
| `elasticsearch/destinations_index.seed.js`                                                      | `es:seed-destinations`   | ✅ step _Elasticsearch Search Indices_ (new)                                                               |
| `elasticsearch/hotels_index.seed.js`                                                            | `es:seed-hotels`         | ✅ step _Elasticsearch Search Indices_ (new)                                                               |
| `database/city_images.seed.js`                                                                  | `seed:city_images`       | ✅ superseded — city images now go through the fast direct-MinIO path                                      |
| `scripts/backfill-snapshot-primary-images.js`                                                   | `seed:snapshot-images`   | ❌ deliberately not needed (see below)                                                                     |
| reference seeders (countries, cities, destinations, users, amenities, hotel_staff, permissions) | `seed:*`                 | ✅ steps _Countries_, _Cities_, _Destinations_, _Users_, _Amenities_, _Admin & Hotel Staff_, _Permissions_ |

### 15.1 City images folded in

`seed:city_images` uploaded city photos through the HTTP API → media service →
MinIO pipeline, so it required a running server. The fast image runner now
handles the `city` entity type:

- source fixtures: `seeders/database/images/city/vietnam/*.avif` (62 files)
- one **primary** image per city (not an album), matched by city name first
  (`Hà Nội.avif` → city `Hà Nội`) with a round-robin fallback for the one
  unmatched city
- a real WebP variant is written alongside each original, exactly like
  hotels/rooms

`selectAlbum()` in `seeders/lib/images.js` decides between whole-album cycling
(hotels/rooms) and name-matched single images (cities).

### 15.2 Elasticsearch indices folded in (optional, best effort)

`seed:all` now also syncs the `destinations` and `hotels` search indices, so
search works after a single command. `seeders/lib/elasticsearch.js`:

1. `ping()` the client — **if Elasticsearch is not reachable the step logs a
   warning and is marked skipped**, it does not fail the seed, and prints the
   `npm run es:seed-*` fallback. A developer without ES running is never blocked.
2. Create `hotels` / `destinations` from `infra/elasticsearch/mapping/*.json`
   when they do not exist, then run the two existing seeders.

Indices are created with the shared client instead of
`infra/elasticsearch/setup-*.js` because those scripts call `process.exit()` and
cannot be required in-process.

`--skip-elasticsearch` forces the step off.

### 15.3 `seed:snapshot-images` is now redundant

`scripts/backfill-snapshot-primary-images.js` exists to fill
`hotel_search_snapshots.primary_image_url`. The set-based snapshot rebuild in
`seeders/lib/snapshots.js` derives that column from the `images` table at build
time, so the backfill has nothing left to do (verified: 5,040/5,040 snapshots
have `primary_image_url`). It is intentionally **not** called from `seed:all`;
keep the script for repairing older/partial databases.

## 17. Unseeded-table audit

Every table in the migrated schema was checked for row count after a `seed:all` run, then each empty table was traced to its read path. Two genuine bugs surfaced, not just missing seeders.

### 17.1 Bugs found

**Hotel ratings were completely absent.** `hotels` has no rating columns; the only rating source is `hotel_rating_summaries`, and `snapshots.js` LEFT JOINs it for `avg_rating`. The review module maintains it through `recomputeHotelRatingSummary`, driven by NATS events on review create — which bulk `LOAD DATA` bypasses. Result: **all 5,040 snapshots had `avg_rating = 0` and `review_count = 0` despite 50,689 reviews**, and since the client renders `{{ hotel.avg_rating ?? '—' }}`, `0` displayed as a literal zero rather than the em-dash fallback.

**`room_inventory.booked_rooms` was 0 across all ~600k rows.** Availability is `total_rooms - booked_rooms - held_rooms`, and only `reserveRooms` (called from `createPaymentIntent`) ever increments it. Seeding bookings directly left every date showing "everything free" and defeated the `booked_rooms < total_rooms` filter in `hotel_search_snapshot.repository.js`.

**Bookings had no rooms.** `booking.repository.js` always includes `BookingRooms`, and the checkout path always writes it, so 75k bookings rendered with empty room lists.

**Admin dashboard revenue was $0.** `admin/dashboard.repository.js` computes revenue with `Invoices.sum('amount')`.

### 17.2 Tables now seeded

| Table                         | Why                                        | Approach                                                                                                  |
| ----------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `hotel_rating_summaries`      | only rating source; drives `avg_rating`    | set-based rebuild (`lib/rating-summaries.js`), mirrors `review/domain/rating-summary.js` bucket semantics |
| `room_inventory.booked_rooms` | availability + search filter               | recursive-CTE backfill (`lib/booked-rooms.js`), clamped to `total_rooms`                                  |
| `booking_rooms`               | included on every booking read             | derived from `bookings.price_breakdown`                                                                   |
| `transactions`                | booking payment context, admin `/payments` | derived from bookings (opt-in)                                                                            |
| `payments`                    | admin `/payments`, booking detail          | derived from transactions (opt-in)                                                                        |
| `invoices`                    | **admin dashboard revenue**                | derived from captured transactions (opt-in)                                                               |
| `review_replies`              | hotel detail reply, `hasReply` filter      | staff-authored, one per review (UNIQUE)                                                                   |
| `review_media`                | hotel detail guest photos                  | URLs reuse already-uploaded hotel images                                                                  |
| `review_helpful_votes`        | backs `reviews.helpful_count`              | plus `lib/helpful-counts.js` to resync the counter                                                        |
| `saved_hotels`                | wishlist page + heart icons                | per-user sampling, deduped                                                                                |

`bookings.gen.js` now emits a real money breakdown (`subtotal`, `tax_amount`, `service_fee_amount`, `platform_commission_amount`, `currency`, `price_breakdown` JSON) computed by the new `lib/pricing.js`, which mirrors `services/pricing.service.js` exactly and reads the same `BOOKING_TAX_RATE` / `BOOKING_SERVICE_FEE_RATE` / `PLATFORM_FEE_RATE` env vars. The nightly list is built first so `subtotal === sum(nightly.total)` by construction.

Transactions / payments / invoices are behind **`--with-finance`** (also `npm run seed:all:finance`): they are ~3x the booking row count and only matter for the admin payments and dashboard screens.

### 17.3 Tables deliberately left empty

| Table                                                   | Reason                                                                                                                   |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `payouts`, `payout_items`, `connected_payment_accounts` | need real Stripe Connect IDs; the flows cannot be exercised without Stripe anyway                                        |
| `ledger_accounts`, `ledger_entries`                     | `ledger.service.js` uses `findOrCreateAccount`, so accounts are created lazily; `ledger_entries` has no read path at all |
| `holds`, `hold_rooms`                                   | transient and expiring; seeded rows would _distort_ availability via `held_rooms`                                        |
| `viewed_hotels`                                         | recently-viewed is Redis-backed (`recentlyViewedKey` + `zRange`); this table is not the read path                        |
| `audit_logs`, `idempotency_keys`, `webhook_event_logs`  | runtime housekeeping / TTL data, generated as the app is used                                                            |

### 17.4 Verification (isolated test databases)

`seed:all --quick --clear --with-finance --skip-keycloak` → **33/33 steps, 313.53s** (Images 214.68s dominate).

- `avg_rating` populated on 5,040/5,040 snapshots (avg 7.08); rating buckets sum exactly to `total_reviews`; `overall_rating` / `total_rating_sum` / `total_reviews` match a direct recompute from `reviews` (0 mismatches)
- 75,455 bookings ↔ 75,455 `booking_rooms` (0 bookings without rooms, 0 quantity/room mismatches); `subtotal + tax + service_fee === total_price` on all 75,455
- `transaction.amount` = `booking.total_price`, `payment.amount` = `transaction.amount`, `invoice.amount` = `transaction.amount` — 0 mismatches at each hop; 66,343 invoices with 66,343 distinct `invoice_number`
- `booked_rooms`: 0 overbooked rows, ~9,858 sold out; cross-checked against an independent recursive-CTE recompute (0 mismatched rows)
- `reviews.helpful_count` matches `COUNT(is_helpful = 1)` on all 50,763 reviews
- 37,520 `review_media` rows, 0 null URLs, and all 37,520 resolve to an actual `images.object_key`
- 16,438 replies, all on published reviews, all authored by a `hotel_users` account; 234 saved-hotels rows with no duplicate `(user_id, hotel_id)` and no orphans

**Pre-existing issue (not introduced here):** re-running without `--clear` fails on unique-key duplicates in `hotel_amenities`, `room_amenities`, `room_inventory` and (now) `review_replies` / `review_helpful_votes`. Use `--clear` (or `npm run seed:all:clear`) on re-runs.

## 16. Benchmark: legacy vs fast (`--quick`, no images, no Keycloak)

Both runs used identical reduced counts against isolated throwaway databases
(`travelnest_seedtest` vs `travelnest_seedtest_legacy`).

| Step                     |                            Legacy |       Fast |  Speed-up |
| ------------------------ | --------------------------------: | ---------: | --------: |
| Countries                |                             0.01s |      0.03s |         — |
| Cities                   |                             0.38s |      0.54s |         — |
| Destinations             |                             0.29s |      0.53s |         — |
| Users                    |                             2.43s |      2.77s |         — |
| Amenities                |                             0.29s |      0.29s |         — |
| Hotels                   |                             0.59s |      0.72s |         — |
| **Hotel Amenities**      |                       **247.25s** |  **7.70s** |   **32×** |
| Hotel Policies           |                             1.83s |      0.71s |      2.6× |
| Hotel Cancellation Rules |                             0.39s |      0.28s |      1.4× |
| Nearby Places            |                             8.49s |      4.50s |      1.9× |
| Rooms                    |                             1.00s |      1.50s |         — |
| **Room Amenities**       |                       **717.23s** |  **7.12s** |  **101×** |
| Room Inventory           |                            29.22s |     20.93s |      1.4× |
| Bookings                 | — (seeded by room-inventory step) |      6.74s |         — |
| Reviews                  |                             4.88s |      2.67s |      1.8× |
| Notifications            |                            11.97s |      0.30s |       40× |
| Permissions              |                             2.26s |      2.11s |         — |
| Hotel Search Snapshots   |                            53.05s |      3.65s |       15× |
| **Total**                |            **1082.00s (18m 02s)** | **80.22s** | **13.5×** |

The two legacy killers were the row-by-row amenity inserts (`buildBulkCreate`
`include`s inside a loop): 964 s of the 1082 s total, i.e. **89% of the whole
legacy run** went into two tables. `seed:all` (fast) does the same work in
~15 s.

Adding images on top of the fast run: 183–198 s for ~75k image rows / 302k
objects, so a full `seed:all --quick` is ~250 s versus ~18 minutes for legacy.

Final integrated run after folding city images + Elasticsearch into `seed:all`
(`--quick --skip-keycloak`, ES down): **23/23 steps, 266.73 s**. Images were
75,474 rows (15,120 hotel + 60,291 room + 63 city) in 197.95 s, `image_variants`
exactly 1:1, zero entities with a wrong number of active primaries, zero cities
without an image, zero snapshots missing `primary_image_url`, and the
Elasticsearch step skipped with its warning as designed.
