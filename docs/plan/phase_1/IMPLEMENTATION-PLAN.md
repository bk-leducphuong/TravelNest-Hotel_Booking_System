# Phase 1 — Implementation Plan (Fixes from the Feature Review)

_Companion to [`TEST-REVIEW-PLAN.md`](./TEST-REVIEW-PLAN.md) and the per-feature folders.
Derived from the ~60 findings recorded across features A–V (see each folder's `review.md` /
`improvements.md`)._

## Goal

Turn the recorded findings into a prioritized, low-risk implementation program, fixing the
**systemic** issues once rather than per-feature.

## Guiding principles

1. **Fix cross-cutting root causes first** — they resolve many findings at once (IDOR guard,
   error mapping, response envelope, validation messages).
2. **Security before features** — the S2 IDOR affects 5 features (R, S, T, U, V).
3. **One change, one re-test** — after each work package, re-run that feature's `phase_1` checklist.
4. **Keep behaviour changes visible** — note any product decisions (owner override, onboarding auth).

---

## Progress

### M1 — Security + foundations (WP0 + WP1) — ✅ implemented (2026-10-11)

**Closed:**
- **Shared hotel-ownership guard** `requireEntityInHotel` applied to inventory rooms, bookings,
  payment transactions/refunds, payouts + connected accounts, and reviews →
  **R-F1, S-F1, T-F1, U-F1, V-F1** (cross-hotel IDOR). Verified: foreign entity → `403`,
  own entity → `200`, platform staff → global.
- **Admin catalog list gating + per-hotel scoping** → **O-F1** (guest → `403`; owner → only their
  hotels).
- **Central error mapping** (Sequelize validation / Multer / plain errors → 4xx) → **Q-F1, L-F1**.
- **JSON 404** for unmatched `/api/*` (and bad path params) → **A-F2, C-F4**.
- **Joi custom-message + field-key fix** (central, in `validate.middleware.js`) →
  **B-F3, C-F3, E-F4, G-F1**.
- **Clean malformed-JWT message** → **D-F1**.
- **Owner-override documented** → **V-F2**.

**Deferred from WP0 (still open):**
- **Response-envelope unification** (**A-F1, C-F5, L-F2, M-F4, D-F6**) — deferred: it requires
  coordinated client changes and is high-risk; track as its own work package.
- **U-F2** (generate-eligible `500`) — needs a domain `ApiError` in the payout service; not covered
  by the central mapping.

**Verification:** `334/334` unit tests, `82/83` e2e (the 1 failure is the Stripe-webhook test that
needs the Stripe CLI), `arch:check` + lint clean; IDOR / 404 / validation / error-mapping fixes
re-tested live against the running stack.

### M2 — Money & pricing correctness (WP2) — ✅ implemented (2026-10-11)

**Closed:**
- **Price filter (B-F1)** — removed the Elasticsearch/DB `min_price` range filter (a static
  "from" price that returned wrong/empty results); the date-specific filter
  (`domain/filters.js applyDateSpecificFilters`) now does the work. Verified: `minPrice=90` →
  196, `maxPrice=120` → 38, `minPrice=10` → all.
- **`maxPrice` without `minPrice` (B-F2)** — Joi `when(minPrice)` conditional → valid.
- **Room price parity (C-F1)** — the catalog `/rooms` query used `SUM(price_per_night)` labelled
  as per-night; now `AVG` (per-night) + `SUM` (total). Also normalized the search dates to
  `YYYY-MM-DD` (Joi passed `Date` objects that shifted the MySQL window). Verified: `/rooms` and
  `/search` now return **identical** prices for the same room + dates.
- **`/rooms` `totalPrice` (C-F2)** — now populated from the query.
- **`has_free_cancellation` (C-F6)** — derived from active refundable cancellation rules
  (snapshot SQL + runtime `checkFreeCancellation`); snapshots rebuilt + ES reindexed.
  Verified: `freeCancellation=true` → 142 hotels.
- **Refunds in the payment summary (P-F1, T-F2)** — `refundedAmount` now includes transactions
  marked `refunded` without a refund record (the seed case) without double-counting the normal
  case. Verified: net = gross − refunded.

**Data operations:** rebuilt `hotel_search_snapshots` (12,600) and reindexed the `hotels` ES index.

**Verification:** `318/318` unit tests, `82/83` e2e (the 1 failure is the Stripe-webhook test),
`arch:check` + lint clean.

### M3 — Broken user flows (WP3) — ✅ implemented (2026-10-11)

**Closed:**
- **Guest cancellation (H-F1, H-F2)** — `BookingCancellation` now loads the booking by code and
  calls `BookingService.cancelBooking(id)` (`DELETE /bookings/:id`) instead of the dead
  `/api/cancel-bookings`; added `@submit.prevent`; `BookingDetails` shows the cancel option for
  cancellable statuses (not only `confirmed`). Verified end-to-end in the browser.
- **Reviews UI (J-F1, J-F2)** — `Reviews.vue` rewritten to consume the API shape (no more
  `review.review.length` crash); `ReviewDetails`/`ReviewValidation` now use `ReviewService`
  (`POST /reviews`, `/validate`, `/check`) with the correct body (1-5 UI → 1-10 ratings).
  Verified: `POST /reviews → 201`, list renders the written review.
- **Onboarding (M-F1, M-F2, M-F3)** — backend maps check-in/out to a single `TIME` value
  (was `500`); `Form6` uses `JoinService` (`/api/v1/join`); the wizard route requires auth
  (anonymous visitors are sent through login). Verified: join `201`.
- **Legacy-endpoint sweep** — all `VITE_SERVER_HOST}/api/<x>` calls removed (H, J, M).
- **Account password UI (E-F1)** — stale form replaced with a Keycloak account-console link.

**Verification:** `318/318` unit tests, `arch:check` clean, client **build** passes, lint clean;
H/J/M/E flows exercised in the browser.

### M4–M5 — pending

---

## WP0 — Cross-cutting foundations (do first)

| Task | Findings fixed | Effort |
|---|---|---|
| **Shared hotel-ownership guard** `requireEntityInHotel(resolver)` — resolve the entity's `hotel_id`, compare to the hotel context, `403` on mismatch. Apply to `/admin/inventory/rooms/:roomId`, `/admin/bookings/:bookingId*`, `/admin/payments/transactions\|refunds/:id*`, `/admin/payouts/:payoutId*` + connected-accounts, `/admin/reviews/:reviewId*`. | **R-F1, S-F1, T-F1, U-F1, V-F1** (all S2) | M |
| **Central error mapping** — `SequelizeValidationError` → 400, Multer error → 400, plain `Error` → 500 with a clean message, malformed JWT → clean 401. | Q-F1, L-F1, U-F2, D-F1 | S |
| **Shared response envelope** — `{ success, data }` + `{ error:{ code, message, fields } }` across all modules. | A-F1, C-F5, L-F2, M-F4, D-F6 | M |
| **JSON 404 handler** for unmatched `/api/*` + validate path params before routing. | A-F2, C-F4 | S |
| **Joi custom-message helper** — correct `any.custom`/`.messages()` wiring. | B-F3, C-F3, E-F4, G-F1 | S |

**Exit criteria:** a manager/owner cannot touch another hotel's inventory/booking/payment/payout/
review (`403`); no endpoint returns an HTML error page or a raw 500 for a client error.

---

## WP1 — Security hardening

| Task | Findings | Effort |
|---|---|---|
| Admin catalog list gating — require platform staff or hotel membership, not the broad `hotel.read`. | O-F1 | S |
| Decide + document the **owner permission override** (owner bypasses hotel-scoped permission checks). | V-F2 | XS |
| Sweep for any other `:id` admin route that resolves the hotel from `X-Hotel-Id` (media `/images`, etc.). | proactive | S |

**Exit criteria:** guest `GET /admin/hotels` → `403`; owner/manager see only their hotels.

---

## WP2 — Money & pricing correctness (highest user impact)

| Task | Findings | Effort |
|---|---|---|
| Fix the ES `min_price`/`max_price` indexer/seeder to write the real per-night base price; reindex + add a data-quality assertion. | **B-F1** | L |
| Make `maxPrice` valid without `minPrice` (Joi `when`/default `0`); stop the client sending an unused default. | **B-F2**, C-F8 | S |
| Single pricing source: `/hotels/:id/rooms` uses the same pricing as the search pipeline. | **C-F1** | L |
| `/rooms` `totalPrice = pricePerNight × nights`. | C-F2 | S |
| Derive `has_free_cancellation` from the hotel's cancellation policy (search + details consistent). | C-F6 | S |
| Refunds reduce `refundedAmount`/net (or exclude refunded transactions from `grossAmount`). | P-F1, T-F2 | S |

**Exit criteria:** `minPrice`/`maxPrice` filters return correct subsets; the same room + dates has
an identical price in search and on the hotel page; refunded revenue is reflected in net.

---

## WP3 — Broken user flows (client drift + backend)

| Task | Findings | Effort |
|---|---|---|
| Guest **cancellation**: show Cancel for cancellable statuses; call `BookingService.cancelBooking` (`DELETE /bookings/:id`); add `@submit.prevent` to the form. | **H-F1, H-F2** | M |
| Guest **reviews UI**: rewrite `Reviews.vue` to the API shape; point `ReviewDetails`/`ReviewForm`/`ReviewValidation` at `ReviewService` (`POST /reviews`, `/validate`, `/check`). | **J-F1, J-F2** | M |
| **Onboarding**: map check-in/out times to a single `TIME` value (backend); point `Form6` at `/api/v1/join`; decide public-vs-auth. | **M-F1, M-F2, M-F3** | M |
| Sweep **legacy `/api/<x>`** calls (`grep -rn "VITE_SERVER_HOST}/api/" client/src`) → route through `services/*`. | H, J, M | S |
| Account: replace the stale "Change password" form with a Keycloak account-management link. | E-F1 | S |

**Exit criteria:** a guest can cancel, review, and onboard end-to-end; no legacy 404 calls remain.

---

## WP4 — Contract & error UX

| Task | Findings | Effort |
|---|---|---|
| Surface filter errors instead of a silent "0 results". | B-F8 | S |
| Normalise double-cancel to a single `409 BOOKING_ALREADY_CANCELLED` (sequential + concurrent). | H-F4 | S |
| Distinct `REVIEW_NOT_ELIGIBLE` (409/422) when the booking exists but isn't reviewable. | J-F3 | S |
| Return `403` (not `400`) when authenticated but without hotel context. | O-F2 | S |
| Clearer message for unknown-only payloads. | E-F3 | S |
| Document (or require explicit) inventory price inheritance on new dates. | R-F2 | XS |

---

## WP5 — UI/UX, a11y & i18n

| Task | Findings | Effort |
|---|---|---|
| `SavedHotelIcon` `hotelId` prop `Number` → `String`. | A-F4, F-F5 | XS |
| `aria-label` on favorite/remove buttons + inputs; make hotel cards `<a>`/`<button>` (keyboard). | A-F5, F-F4 | M |
| Page `<title>` per route; footer logos (assets or remove empty `<img>`). | A-F6, C-F7 | S |
| Move hard-coded Vietnamese strings to locale files. | A-F7 | XS |
| Card titles off `<h2>` (heading semantics). | A-F8 | XS |
| Localized **status labels** for bookings/notifications. | H-F3 | S |
| Notifications: real timestamp, persist read on click, wire/remove "See all". | K-F1, K-F2, K-F3 | S |
| Saved hotels: real card data, heart reflects saved state, wire/remove dead controls. | F-F1, F-F2, F-F3 | M |
| Reviews page: show the real user name. | J-F4 | XS |

---

## WP6 — Data quality & config

| Task | Findings | Effort |
|---|---|---|
| Expand the timezone allowlist to the full IANA set + Joi validation. | Q-F1, Q-F2 | S |
| Filter soft-deleted rooms in the admin rooms list. | O-F3 | XS |
| Sanitise recent-search `city`; sanitise profile text fields. | B-F5, E-F2 | S |
| Move JWT verification to **JWKS** (key rotation). | D-F5 (R1) | M |
| Fix the Keycloak `parseCallbackUrl` console error. | A-F9, D-F2, B-F6 | M |

---

## WP7 — Verification & closure

1. After each WP, re-run the affected `phase_1/<feature>` checklist and update the feature's
   `review.md` verdict + the index row.
2. **Fill the admin UI coverage gap** (Q–V) with Playwright as `owner@travelnest.local` — each
   folder's `improvements.md` lists the pages to verify.
3. **Unblock feature I** (Stripe CLI) and run its checklist (`I-payments-guest-webhook/BLOCKED.md`).
4. Add regression tests: IDOR-guard unit tests, pricing-parity test, cancellation/review/onboarding
   e2e.
5. Re-run the full guest e2e suite + `arch:check` / `schema:check`.

---

## Suggested sequence & milestones

- **M1 (security):** WP0 + WP1 → closes 5×S2 + O-F1. _Highest priority._
- **M2 (money):** WP2 → closes B-F1/B-F2/C-F1 (trust-breaking pricing).
- **M3 (flows):** WP3 → restores cancellation / reviews / onboarding.
- **M4 (polish):** WP4 + WP5 + WP6.
- **M5 (verify):** WP7 (admin UI sweep + unblock I).

## Definition of done (overall)

- No open **S1/S2** findings; all guest + admin core flows pass end-to-end.
- No cross-tenant IDOR; no HTML error pages or raw 500s for client errors.
- Pricing consistent across search and hotel pages; refunds reflected in net.
- Legacy `/api/<x>` calls removed; envelopes + validation messages consistent.
- Admin UI (Q–V) exercised; feature I unblocked and reviewed.

## Open decisions (to confirm before/at start)

1. **Scope order** — start with **M1 (security)** as recommended, or reprioritize?
2. **Systemic refactors** — do WP0 centrally (recommended) or patch per-feature?
3. **Owner override (V-F2)** — keep owners as hotel superusers, or enforce per-permission checks?
4. **Onboarding (M-F3)** — keep `/join` auth-required (redirect to login) or make it public?
5. **Ownership** — implement in-repo, or use this as a hand-off doc for the team?
