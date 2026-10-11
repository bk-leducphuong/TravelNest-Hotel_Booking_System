# A — Public Discovery & Content: Console, a11y & i18n notes

Captured via Playwright MCP against `http://localhost:5173/` (2026-10-09).

## Console (home page load)

Total: 5 errors, 24–91 warnings.

- **85 × Vue warning** (flood): `Invalid prop: type check failed for prop "hotelId". Expected Number with value NaN, got String with value "01a105dc-…"` — one per hotel card rendered by `SavedHotelIcon`.
- **3 × error**: `TypeError: Failed to construct 'URL': Invalid URL` at `keycloak-js` `parseCallbackUrl_fn` (silent-check-sso callback).
- **1 × error**: `net::ERR_TIMED_OUT https://m.stripe.com/6` (Stripe telemetry, blocked in this environment — likely environmental).

## Accessibility scan (home)

- Total controls: 86 · **unlabeled visible controls: 26**
  - all `.favorite-button` (heart) buttons — no `aria-label`
  - hero destination search input (`.el-input__inner`) — placeholder only
  - both date inputs (`.el-range-input`) — placeholder only
- Images without `alt`: **0** (good).

Hotel cards (`TrendingHotels.vue:15-20`) are `<div @click>` — no `role`, no `tabindex`,
no keyboard handler → not focusable/activatable by keyboard; also not crawlable links.

## i18n

- `en.json` / `vi.json`: 39 keys each, **0 only-in-en, 0 only-in-vi, 0 empty values**.
- Hard-coded strings found outside locale files: `đánh giá` (`TrendingHotels.vue:34`),
  `Vui lòng đăng nhập để thêm vào danh sách yêu thích` (`SavedHotelIcon.vue`).

## Responsive

No horizontal overflow at 390 / 1440 / 2400 px. Trending + Popular Places sections
render correctly at 1440 (an initial full-page capture at 2400 showed a transient
clipped state during carousel/skeleton settling — **not reproducible after settle**).

## Network (home load → API)

- `POST /api/v1/hotels/batch` → 200
- `GET /api/v1/hotels/trending?limit=10&days=30` → 200
- `GET /api/v1/search/destinations/trending?limit=5&days=30` → 200
