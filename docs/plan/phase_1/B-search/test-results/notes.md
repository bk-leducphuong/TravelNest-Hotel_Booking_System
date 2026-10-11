# B — Search: Supplementary evidence

Captured 2026-10-09 against the local stack (API :3000, ES :9200, client :5173).

## B-F1 — Price filter broken (ES `min_price` is a constant)

ES index `hotels` stats for `min_price`:

```
count: 12600   min: 80.0   max: 88.14   avg: 80.618   sum: 1015783.56
```

Range buckets (all 12,600 docs fall in a single ~8-unit band):

```
*-50.0        -> 0
50.0-100.0    -> 12600
100.0-200.0   -> 0
200.0-*       -> 0
```

Direct ES range queries:
```
min_price >= 100 -> count 0
min_price <= 500 -> count 12600
```

API + UI effect (city=Ha Noi, 2026-10-11 → 2026-10-13, adults=2):

| Filter | API total | UI text |
|---|---|---|
| _(none)_ | 200 | 200 hotels |
| `minPrice=10` | 200 | 200 hotels |
| `minPrice=50` | 200 | — |
| `minPrice=90` | **0** | **0 hotels** |
| `maxPrice=500` (alone) | **400** | **0 hotels** (no message) |

Real per-night prices shown in results are ~90–394, so the filter does not correspond to
what the user sees. Root cause is the indexed `min_price` value, not the query builder.

## B-F2 — maxPrice without minPrice → 400

```
GET /search/hotels?...&maxPrice=500
HTTP 400 {"error":{"code":"VALIDATION_ERROR","fields":{"maxPrice":"\"maxPrice\" limit references \"ref:minPrice\" which must be a number"}}}
```

## B-F5 — Recent-search echoes raw user input

`GET /search/recent` (User A, fresh token) returned a stored entry:

```json
{ "city": "Ha Noi' UNION SELECT 1,2,3 --", "checkIn": "...", ... }
```

Left over from a prior security probe. Output is escaped in the UI (`RecentSearchs.vue`
uses `{{ displayLocation(search) }}`; the home "Continue your search" reads localStorage,
not this endpoint), so no live XSS — but the value is persisted verbatim.

## Per-user scoping

- `GET /search/recent` without token → 401.
- User A → 20 entries; User B (`owner@travelnest.local`) → 0 entries.

## Autocomplete (UI)

Typing "Ha" in the hero destination box → 7 suggestions:
Ha Giang, Ha Nam, Ha Noi, Ha Tinh, Hai Duong, Hai Phong, Hau Giang.

Hotel-name autocomplete returns 10 for "View", "Boutique", "Hotel", "Sunset", "Inn";
0 for "Ha" (expected — hotel names contain no "Ha").
