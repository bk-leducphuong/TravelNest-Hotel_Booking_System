# B — Search: Improvements

## Backlog

| # | Finding | Severity | Proposed fix | Effort | Owner | Status |
|---|---------|----------|--------------|--------|-------|--------|
| B-F1 | Price filter broken (ES `min_price` constant ~80–88) | S2 | Fix the hotel indexer/seeder to write the real per-night base price into `min_price`/`max_price`; reindex; add a data-quality assertion | L | | Open |
| B-F2 | `maxPrice` without `minPrice` → 400 | S2 | Make the comparison conditional (default `minPrice=0`/use `Joi.when`) so `maxPrice` alone is valid | S | | Open |
| B-F3 | Unhelpful >30-nights validation message | S3 | Pass the message via the correct Joi `.custom`/`.messages` wiring | S | | Open |
| B-F4 | Empty field key on no-location error | S3 | Attach the `object.missing` message to a named key | XS | | Open |
| B-F5 | Recent-search stores raw user input | S4 | Trim/length-cap/sanitise `city` before persisting; keep output escaping | S | | Open |
| B-F6 | Keycloak console errors | S3 | Cross-ref feature D (A-F9) | M | | Open |
| B-F7 | Tab title "Vite App" | S4 | Cross-ref feature A (A-F6) | S | | Open |
| B-F8 | Filter 400 swallowed → silent "0 hotels" | S3 | Surface request errors (message/retry) instead of rendering an empty result set | S | | Open |

## Notes

- **B-F1 is the highest-impact finding so far**: a headline search filter returns wrong
  results silently. It belongs to the **X (Search infrastructure / seeders)** workstream —
  fix the index source and reindex, then re-run this matrix.
- B-F2 is a one-line schema fix and unblocks the "under $X" use case immediately.
- B-F3/B-F4 are small contract-quality fixes.
- After B-F1 is fixed, re-verify: `minPrice`/`maxPrice` alone and combined, plus the UI
  counts, and add an e2e assertion that the filtered price range matches returned hotels.
