# A — Public Discovery & Content: Review

Date: 2026-10-09 · Environment: local dev stack (API :3000, client :5173, Keycloak :8080).
Evidence: [`test-results/api.md`](./test-results/api.md), [`test-results/console-notes.md`](./test-results/console-notes.md), screenshots in `test-results/`.

## Findings

| # | Sev | Axis | Symptom | Root cause | Evidence | Status |
|---|-----|------|---------|-----------|----------|--------|
| A-F1 | S3 | API/contract | Three different response envelopes on discovery endpoints: catalog returns `{data}`, search returns `{success:true,data}`, validation errors return `{error:{code,message,fields}}`, auth errors return `{success:false,message}` | No shared response helper across modules | api.md A-API-01/02/23, A-API-05 | ✅ Fixed (M6) |
| A-F2 | S3 | API/contract | Invalid path param (`GET /hotels/not-a-uuid/nearby-places`) returns an **HTML** 404 page instead of the JSON error envelope | Route param regex `:hotelId([0-9a-fA-F-]{36})` doesn't match, falls through to Express default 404 | api.md A-API-15 | ✅ Fixed (M1) |
| A-F3 | S3 | API/contract | `POST /hotels/batch` silently accepts missing / non-array / invalid-UUID `ids` and returns `200 {data:[]}` with no validation error | Controller guards with `Array.isArray` but no schema; not in the Joi validation path | api.md A-API-17..20 | ✅ Fixed (M6) |
| A-F4 | S3 | UI/UX | 85 Vue warnings per home load: `Invalid prop: type check failed for prop "hotelId". Expected Number ... got String` | `SavedHotelIcon.vue` declares `hotelId: { type: Number }` but hotel ids are UUID strings; component is rendered once per hotel card | console-notes.md | ✅ Fixed (M4) |
| A-F5 | S3 | UI/UX (a11y) | 26 unlabeled visible controls: every favorite (`.favorite-button`), the destination search input, and both date-range inputs; hotel cards are clickable `<div>`s with no `role`/`tabindex`/keyboard handler | Missing `aria-label` on icon buttons; cards use `@click` on a div instead of `<a>`/`<button>` | console-notes.md, `TrendingHotels.vue:15-20`,`SavedHotelIcon.vue` | ✅ Fixed (M4) |
| A-F6 | S4 | UI/UX | Browser tab title is `Vite App` (unbranded); footer partner logos (`TravelNest`, `Priceline`, `Kayak`, `Agoda`, `OpenTable`) have empty `src` and render broken | `<title>` not set; logo `src=""` placeholders | home-desktop.png, console-notes.md | ✅ Fixed (M4) |
| A-F7 | S3 | UI/UX (i18n) | Hard-coded Vietnamese strings bypass i18n: `đánh giá` (review count, `TrendingHotels.vue:34`), toast `Vui lòng đăng nhập...` (`SavedHotelIcon.vue`) | Literal strings instead of `$t(...)` | code + UI | ✅ Fixed (M4) |
| A-F8 | S4 | UI/UX (semantics) | Every hotel card name is an `<h2>`, flooding the heading outline (30+ h2s on home) | Card title uses `<h2 class="hotel-name">` | console-notes.md | ✅ Fixed (M4) |
| A-F9 | S3 | UI/UX | 3x `TypeError: Failed to construct 'URL': Invalid URL` from `keycloak-js` `parseCallbackUrl` on home load | Keycloak callback URL config / silent-check-sso (cross-ref feature D) | console-notes.md | ✅ Fixed (M6) |

## Positives

- All discovery endpoints return correct data; validation (`limit`, `days`, `category`) returns proper 400s with field-level messages.
- `recently-viewed` is correctly **per-user scoped** (User A 7 hotels, User B 0) — no data leakage; requires auth (401 without / bad token).
- `trending` `days` filter works (days=1 → 3, days=365 → 50).
- Latency ~5 ms; no evident N+1 on the trending path.
- EN/VI locale files have full key parity (39/39), no empty values.
- No horizontal overflow at 390 / 1440 / 2400 px.
- Trending card click routes correctly to `/hotels/:id`; all images carry `alt`.

## Verdict

**🟡 Partial.** The feature is functionally correct and its main security concern
(data leakage) is clean, but it is **not production-ready** until: response envelopes
are unified (A-F1/A-F2), the batch contract validates input (A-F3), the `SavedHotelIcon`
prop type / console flood (A-F4) and the a11y/keyboard gaps (A-F5) are fixed. A-F1–A-F3
are cross-cutting and should be resolved centrally (shared response + error middleware).

---

> **Update — 2026-10-11 (M1–M6):** every finding recorded above is now **✅ fixed** (see the Status column) or **by-design**. The verdict above reflects the **original** review; the current index marks this feature **✅ Ready**.
