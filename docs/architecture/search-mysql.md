# MySQL-only hotel search

Status: implemented. Elasticsearch is no longer part of the search path, the
health checks, the internal task registry, the seeders or the deployment
manifests. Analytics events live in MySQL (`analytics_*` tables); Redis remains session/cache/
hold state; NATS/Go analytics is unchanged.

## Request flow

```text
GET /api/v1/search/hotels
  -> validate (Joi) + normalize dates
  -> resolve destination           catalog: cached active list + in-memory matching
  -> filter candidate hotels       1 query: hotel_search_snapshots
  -> availability + offers         N/2000 queries: rooms + room_inventory (parallel chunks)
  -> choose one offer per hotel    domain/offers.js (cheapest eligible)
  -> rank / facet / paginate       domain/ranking.js, domain/facets.js
  -> attach favourites             identity module
  -> response envelope             application/search-response.js
```

Search never reserves inventory: booking re-checks and holds availability
atomically through the inventory module.

### 1. Destination resolution (`catalog` module)

`destination.repository.js` caches the **active** destination list (provinces +
countries, currently 64 rows) for 60 seconds and delegates matching to
`catalog/domain/destination-matching.js`:

| Tier      | Rule                                                              |
| --------- | ----------------------------------------------------------------- |
| exact     | normalized name, compact key or slug match                        |
| prefix    | compact/normalized key starts with the query                      |
| substring | compact/normalized key contains the query                         |
| typo      | Damerau–Levenshtein distance 1 (query ≥ 5 chars) or 2 (≥ 8 chars) |

Cities win over countries at the same tier. A typo only resolves when the
closest candidate is unambiguous; otherwise the request falls through to
hotel-name intent instead of silently picking a city. `utils/placeName.js`
normalizes accents, whitespace, punctuation and explicitly maps `đ/Đ` → `d`
(Unicode NFD does not decompose them). Aliases include Saigon/HCMC/TPHCM →
Ho Chi Minh City.

Cache invalidation: `catalog.invalidateDestinationsCache()` (call after a
destination write). Staleness is otherwise bounded by the 60 s TTL.

### 2. Candidate hotels

`hotel_search_snapshots` is the denormalized read model. When a destination
resolves, filtering uses `city_id` / `country_id` (never a broad name `LIKE`).
Other filters: `status = 'active'`, rating, class and all-selected-amenities
(`COUNT(DISTINCT code) = requested`). The stale `is_available`,
`has_available_rooms` and `min_price` flags are **not** treated as authoritative.

Geo search uses a latitude/longitude bounding box followed by an exact
spherical-distance predicate (`ACOS`, with `LEAST(1, …)` to guard rounding) and
a radius filter. A POINT/SPATIAL index is not used; see "Deferred".

Hotel-name intent (free text that does not resolve to a destination) is matched
against the pre-normalized `hotel_name_normalized` / `hotel_name_compact`
columns with tiers 4/3/2/1 (exact compact, exact normalized, prefix, substring).
Because a degenerate query like "hotel" can match most of the catalogue, a
text-only search keeps the highest-tier matches and is capped at 500 candidates
with a warning log. Location-filtered searches are never capped.

### 3. Availability and offers (set-based)

One query per chunk of ≤2000 candidate ids (`room-offers.query.js`):

- window is `[checkIn, checkOut)` as date-only strings
- `ri.status = 'open'` is required for every night; a missing/closed/maintenance
  night reduces `COUNT(DISTINCT date)` and rejects the offer
- nightly quantity = `total_rooms - booked_rooms - COALESCE(held_rooms, 0)`
- whole-stay availability = `MIN(nightly quantity)` (never a sum across dates)
- `rooms` identical rooms must fit the party: `max_guests * rooms >= adults + children`
- one currency per offer (`COUNT(DISTINCT currency) = 1`)
- grouped by `rooms.id`, so nights are never stitched across room types
- free cancellation is offer-level: `EXISTS` on active, refundable
  `hotel_cancellation_rules` rows with a free-cancellation window

Chunking exists because MySQL switches `rooms` from an index range to a full
table scan once the `IN` list passes a few thousand values. Chunks run in
parallel against the Sequelize pool (max 10) and each hotel is entirely inside
one chunk, so its offers still come from a single statement.

### 4. Offer selection and price units

`domain/offers.js` applies the budget (`minPrice`/`maxPrice` on the average
nightly price) and the optional free-cancellation filter **before** choosing the
cheapest offer, then sorts by stay subtotal, room id for determinism.

Money is handled in integer minor units (2-decimal assumption; inventory
currency is USD today):

| Field                             | Meaning                                                      |
| --------------------------------- | ------------------------------------------------------------ |
| `price_per_night`                 | average per room per night                                   |
| `total_price`                     | selected-stay subtotal for **one** room (unchanged contract) |
| `total_price_for_requested_rooms` | same subtotal × requested rooms                              |
| `min_price_for_dates`             | winning offer's `total_price` (one room, whole stay)         |
| `min_price_for_requested_rooms`   | winning offer × requested rooms                              |
| `currency`                        | inventory currency                                           |
| `available_rooms`                 | normalized offers for the hotel                              |
| `total_available_rooms`           | sum of each offer's minimum nightly quantity                 |

`min_price_per_night` keeps its meaning (average nightly price of the winning
offer) because the filter sidebar, facets and map already consume it.

### 5. Ranking

`domain/ranking.js`, versioned as `mysql-v1`:

- quality: Bayesian rating shrinkage `(v·R + m·C)/(v + m)`, `m = 20`,
  `C` = mean rating of the eligible set (fallback 7 on a 0–10 scale); hotels
  without reviews land on `C`
- popularity: `log1p(total_bookings) / log1p(max booking count)` (diminishing
  returns)
- distance: `1 - min(distance/scale, 1)` only when the request has an anchor;
  otherwise its weight is redistributed proportionally
- weights: quality 0.60, popularity 0.25, distance 0.15
- hotel-name intent adds a tier boost so exact/prefix name matches outrank
  generic business relevance
- explicit sorts keep their meaning: `rating` is the **raw average**, `price_*`
  uses the stay subtotal, `distance` requires an anchor
- every sort ends with `hotel_id` as a stable tie-breaker; `null` sorts last and
  a real zero distance/price is not replaced by `Infinity`

### 6. Facets, totals and pagination

Facets and totals are computed over the complete eligible set, never the page or
a candidate cap. The current facet semantics are "with all applied filters"
(not disjunctive); this matches the existing UI contract and is documented in
`domain/facets.js`. Pagination is LIMIT/OFFSET applied last.

## Measured results (local development)

Environment: MySQL 8.0 in Docker on the same machine, seeded dataset of
**12,600 hotels / 69,574 rooms / 6,261,540 room_inventory rows** over
2026-10-04…2027-01-01 (larger than the 5,040-hotel seed described in the
issue). Jest unit tests + a direct probe against the database; these are
single-user development numbers, not a production benchmark.

Warm runs (5 warmup requests excluded), single client, `searchHotels()` in
process, no HTTP layer:

| Scenario                                           | Candidates   | Eligible | Statements | p50    | p95    |
| -------------------------------------------------- | ------------ | -------- | ---------- | ------ | ------ |
| Ha Noi, 3 nights, 2 guests (`n=200`)               | 200          | 200      | 2          | 32 ms  | 34 ms  |
| "Saigon" → Ho Chi Minh City (`n=100`)              | 200          | 199      | 2          | 31 ms  | 36 ms  |
| 5 km around Ha Noi centre, distance sort (`n=100`) | 19           | 19       | 2          | 4 ms   | 7 ms   |
| Hotel-name intent "grand" (`n=100`)                | 500 (capped) | 499      | 2          | 91 ms  | 95 ms  |
| Country-wide Vietnam (`n=30`)                      | 12,600       | 12,588   | 8          | 483 ms | 583 ms |

Query-level breakdown for the country-wide case: candidates 62 ms; offers
1.87 s as one statement, ~0.39 s split into 7 parallel chunks. `EXPLAIN` shows
`range` on `rooms.idx_hotel_id` for ≤2000 ids and `type=ALL` at 12,600 ids,
which is why chunking exists. Adding `idx_hss_city_status` /
`idx_hss_country_status` moved candidate filtering to an index scan.

Spot checks against the raw data confirmed the selected offer's subtotal equals
`SUM(price_per_night)` over the three nights and that nightly availability is
the minimum across nights.

## Verification

```bash
cd server
npx jest __tests__/unit/modules/search __tests__/unit/modules/catalog --runInBand
node scripts/check-architecture.js
```

Covered by unit tests: normalization/aliases/typos, tier ordering, ambiguity
guards, offer units/rounding, budget-before-selection, free cancellation, party
allocation, night coverage, mixed currency rejection, min-not-sum availability,
chunked queries, ranking shrinkage/zero values/tie-breaks, facets, empty results,
both autocomplete endpoints, the availability use case and the snapshot
name-maintenance path.

Covered by MySQL integration fixtures
(`server/__tests__/integration/search.repository.test.js`, Testcontainers):
missing/closed nights, held rooms reducing availability, two identical rooms for
a party, no cross-room-type date stitching, mixed currency rejection, stay
subtotal/per-night average, offer-level free cancellation, all-amenities
filtering, and one row per hotel with the cheapest eligible offer.

```bash
npx jest --config jest.integration.config.js __tests__/integration/search.repository.test.js --runInBand
```

The integration suite starts MySQL/Redis containers; all 10 cases pass
locally.

## Deferred (documented, not implemented)

- mixed-room-type allocation (first release uses one room type per offer)
- keyset/search-session pagination (LIMIT/OFFSET until deep-page data exists)
- blanket result caching
- POINT/SPATIAL index for geography (bbox + haversine is fast at this size)
- FULLTEXT token search for hotel names (see below)
- learned/personalized ranking

### Why no FULLTEXT index

MySQL InnoDB FULLTEXT defaults (`innodb_ft_min_token_size = 3`, stopword list)
and Vietnamese tokenization make it unreliable for hotel names such as
"La Siesta" / "Ha Noi". The measured normalized/compact prefix + substring
match covers the seeded catalogue; FULLTEXT would need its own evaluation on
real names before replacing it.
