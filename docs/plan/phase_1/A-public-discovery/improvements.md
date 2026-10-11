# A — Public Discovery & Content: Improvements

## Backlog

| # | Finding | Severity | Proposed fix | Effort | Owner | Status |
|---|---------|----------|--------------|--------|-------|--------|
| A-F1 | Inconsistent response envelopes | S3 | Introduce a shared response helper (e.g. `{ success, data }`) used by every module; align catalog + search + errors | M | | Open |
| A-F2 | HTML 404 for bad path params | S3 | Add a JSON 404/error handler for unmatched `/api/*` routes; validate path params before routing | S | | Open |
| A-F3 | `/hotels/batch` accepts bad input | S3 | Add a Joi schema (`ids: Joi.array().items(Joi.string().uuid()).max(50)`) → 400 on invalid | S | | Open |
| A-F4 | `SavedHotelIcon` prop type mismatch (85 warns) | S3 | Change `hotelId` prop type `Number` → `String` (UUID) | XS | | Open |
| A-F5 | a11y: unlabeled favorite/search/date controls; div cards | S3 | Add `aria-label` to favorite buttons + inputs; make cards `<a>`/`<button>` with keyboard support | M | | Open |
| A-F6 | Title "Vite App" + broken footer logos | S4 | Set document `<title>` per route; provide logo assets or remove empty `<img>` | S | | Open |
| A-F7 | Hard-coded VI strings | S3 | Move `đánh giá` / login toast to locale files | XS | | Open |
| A-F8 | Card names as `<h2>` | S4 | Use non-heading element for card titles | XS | | Open |
| A-F9 | Keycloak `parseCallbackUrl` errors | S3 | Fix callback/redirect URL config (cross-ref feature D) | M | | Open |

## Notes

- A-F1–A-F3 are cross-cutting (shared envelope/error handling); fix once and apply
  across all modules rather than per-feature.
- A-F4/A-F7/A-F8 are quick client-only wins.
- Cross-reference: **D (Authentication)** for A-F9; **Z (Platform/Infra)** for the
  JSON 404 handler in A-F2.
