# Guest UI/UX review and redesign proposal

Reviewed 25 October 2026. Status: proposal; no guest application code changed.

## Recommendation

Bring the guest app into the admin design system: matching typography, spacing, surfaces, form states, semantic colors and interaction quality. Keep the public discovery/booking journey suited to guests rather than reproducing the operational admin sidebar.

The shared blue palette already exists. The largest gaps are mobile usability, truthful booking information, keyboard accessibility and inconsistent component composition. Resolve the trust/functionality issues alongside the design foundations, before polishing additional discovery sections.

## Review scope and evidence

- Source reviewed: guest shell/search, Home, Search Results, Hotel Details, booking details/confirmation/cancellation, checkout/payment integration, Saved Hotels, Reviews, account settings and locale files. Remaining flows are source-reviewed rather than claimed as fully exercised.
- Rendered eight representative screens at 1440px and 375px in English: Home, Search, Hotel Details, Bookings, Booking Details, Saved Hotels, Account, checkout guest-details step.
- [Current-state screenshot gallery](./guest-ui-ux-review/gallery.md). Images use synthetic intercepted API responses and an existing repository room image; repeated photos/sparse content are fixture artifacts.
- Protected-route rendering used a controlled Vuex session. No real login, inventory hold, payment, refund, cancellation or media mutation was submitted. Stripe's actual payment step was not driven.
- Confirmed direct booking-link behavior separately with an authenticated fixture and an empty booking store: `Cannot read properties of null (reading 'status')`.
- Automated accessibility checks sampled those eight screens at both widths. Raw diagnostics are [retained here](./guest-ui-ux-review/audit.json). Development-tools `.panel-entry-btn` warnings are excluded from product findings; generated autocomplete ARIA reports need interaction-level reproduction. Automated results are diagnostic, not a certification or a production defect count.
- Guest sources are identical between `master` and the completed admin worktree. The root checkout lacks Yarn's installed state file, so the same guest sources were run using the already-installed admin worktree. Unit: **22 passed / 6 files**. Component: **40 passed / 8 files**. The existing guest e2e file only checks the homepage title; a full live e2e run was not performed.

## Findings, ordered by impact

| ID | Priority | Finding and evidence | Proposed correction |
| --- | --- | --- | --- |
| G01 | P1 | At 375px the header and search form clip destination, guest and Search controls. `SearchBar.vue` fixes the form at 1100px and centers it with a transform; `main.css` hides horizontal overflow. The document still reports a width of 375px, concealing offscreen controls. | Responsive header and full-width search card; stack destination/dates/guests, provide one reachable Search action. Check element bounds and keyboard reachability, not only page scroll width. |
| G02 | P1 | Search cards unconditionally advertise a standard double room, one double bed, no prepayment, pay at property, taxes/fees and “Only 4 rooms left”. Every score is labelled “Good”. Hotel amenities and the embedded map are also hard-coded rather than hotel-specific. | Map each displayed fact to the available API contract. Omit unsupported claims. Resolve rating labels from returned scores; keep hotel class distinct from guest ratings. Build amenities/map from returned hotel data. |
| G03 | P1 | Booking Details contains a fixed PIN `4338`, five stars, a Genius badge, the unrelated hotel “Chalet Islamabad”, PKR rewards/upgrade copy, fixed check-in/out windows, and nonfunctional print/save/edit/app links. This is visible even with a different synthetic hotel booking. | Replace with an authoritative reservation summary. Show only returned confirmation, payment, policy, property and guest facts. Hide unsupported PIN/reward/upgrade/app claims. Implement real print behavior if desired; omit unsupported actions. |
| G04 | P1 | Stay length disagrees across the flow. Header and hotel calculations add `+1` to the date difference; 10–13 November displays 4 nights in search. Checkout explicitly renders `{ nights: 2 }`. | One date-only stay helper, checkout-exclusive nights, consistent shared stay summary. For 10–13 November, show 3 nights everywhere. Server quote remains authoritative for amounts; this review does not establish that backend charges are incorrect. |
| G05 | P1 | Booking Details dereferences a Vuex-only booking object with no route-driven load or null guard. An authenticated fresh session/deep link crashes. Confirmation searches a booking list page instead of fetching its exact code. | Fetch the booking by route/code using the existing `BookingService.getBookingByCode()`. Add loading/not-found/forbidden/error/retry states. Store data can accelerate initial display but must not be required for recovery. |
| G06 | P2 | Mobile search stacks the entire long filter sidebar above all results; hotel section navigation overlaps. Small home cards reserve room for two items while truncating content in a fixed-height carousel. | Mobile Filter/Sort/Map toolbar and accessible filter drawer; horizontally scrollable section tabs or compact sections; single-column/result cards and content-driven heights. Results should appear before an expanded filter form. |
| G07 | P2 | Keyboard/semantics gaps: clickable `li`/`div`/href-less anchors in shell/cards, whole-card buttons containing favorite buttons, unnamed search action, unlabeled checkout selects/textarea, missing map frame title, missing/duplicated page h1s, and global anchor `outline: none`. | Real links/buttons, sibling favorite actions, coherent heading hierarchy, skip link, visible focus, labelled inputs and accessible dialogs with focus return. Audit guest selectors, galleries, account menus, notifications and chat by keyboard. |
| G08 | P2 | Visual system drifts between Bootstrap defaults, local system/Arial fonts, Element Plus styling and hard-coded blues such as `#007bff`/`#0051e3`. Card/control radii and spacing differ from the admin. Footer contrast is about 3.95:1; some white-on-blue CTAs also fail sampled small-text contrast checks. | Guest semantic CSS tokens aligned with the admin, Poppins with Vietnamese glyphs, shared primitives and themed Element Plus states. Recheck real foreground/background pairs, including focus, selected, warning and teleported content. |
| G09 | P2 | Header currency/help controls and most footer links have no working destination. Footer copy claims a Booking Holdings affiliation and displays unrelated brands. Account pages expose implementation language such as “legacy account endpoints” and advertise unavailable settings. | Compact TravelNest footer with genuine routes/contact/legal destinations only. Honest user-facing account copy. Omit unsupported commercial/affiliation claims and nonfunctional controls; a currency selector must not imply conversion that does not exist. |
| G10 | P2 | Language changes reload the whole page; `html lang` is fixed to English and the title does not follow the route. With language `en`, the flag resolver requests `en.png`, which fails. Widget locale is not connected globally. | Reactive en/vi locale, supported-language normalization, text language labels/local flags, reactive document language/titles, Element Plus locale, locale-aware date/money presentation, and draft preservation during language changes. |
| G11 | P2 | Some failed reads look like valid empty states: Bookings catches errors and empties the array; trending sections disappear after failure. Missing media has inconsistent placeholders. | Distinct loading/empty/error/offline/partial states with retry. A failed request must not look like “no bookings”. Use a shared media resolver/fallback and preserve successful data where appropriate. |
| G12 | P3 | First visit opens a promotional login popup automatically and the app requests geolocation during mount. Notifications/chat exist as real features, but header placement and the floating chat can compete with mobile actions. | Let search begin immediately. Request location after a “Near me” action. Make sign-in encouragement contextual; keep real notification/chat functionality, keyboard access and spacing clear of mobile booking controls. |

### Primary source locations

- [Fixed-width search](../../../client/src/components/SearchBar.vue#L371), [inclusive day count](../../../client/src/components/SearchBar.vue#L263), [hotel day count](../../../client/src/views/HotelDetails.vue#L196), [fixed checkout nights](../../../client/src/views/Book.vue#L203).
- [Search-card assertions](../../../client/src/views/SearchResults.vue#L578), [click-only result card](../../../client/src/views/SearchResults.vue#L530), [hard-coded amenities/map](../../../client/src/views/HotelDetails.vue#L783).
- [Booking detail placeholder content and null access](../../../client/src/views/BookingDetails.vue#L39), [available booking-by-code service](../../../client/src/services/booking.service.js), [confirmation list lookup](../../../client/src/views/BookingConfirmation.vue#L50).
- [Header controls](../../../client/src/components/common/BaseHeader.vue#L7), [footer destinations](../../../client/src/components/Footer.vue#L9), [account implementation copy](../../../client/src/locales/en.json#L411).
- [Focus removal/overflow concealment](../../../client/src/assets/main.css#L7), [nested card interaction](../../../client/src/components/home/TrendingHotels.vue#L15), [reload on language change](../../../client/src/components/LanguageSwitch.vue#L6).

## Target design language

| Role | Guest target aligned with admin |
| --- | --- |
| Brand / primary action / hover | `#003B95` / `#0071C2` / `#004779` |
| Background / card / selected surface | `#F5F5F5` / white / `#F0F6FD` |
| Text / secondary text | `#333333` / `#666666` |
| Accent | Restrained `#FFB700`, used for discovery emphasis rather than every form border |
| Feedback | Same semantic success/danger as admin; contrast-tested dark warning text on pale warning surfaces |
| Type | Self-hosted Poppins 400/500/600 including Vietnamese; a consistent system fallback |
| Surfaces | 18–20px card radius, restrained borders/elevation, 24px desktop and 16px mobile inner spacing |
| Controls | 10–12px radius, visible labels, consistent input/button states, at least 44px main touch targets |
| Layout | Approximately 1120–1200px content container, 24–32px desktop gutters and 16px mobile gutters; fluid grids |
| Icons | Consistent line icons with accessible text/names; match admin stroke/size conventions |

Use equivalent roles in both apps. Do not import admin's Nuxt-dependent components or its whole global stylesheet into the Vite app. Start with guest semantic variables and small presentational Vue components; extract a shared token package only once the mapping is proven. Keep Vue 3/Vite/Vuex and existing APIs for this work.

The public guest shell should have a clean white header with the TN/TravelNest identity and blue actions. A restrained blue discovery hero is still appropriate on Home. Account/trip pages can use the same light workspace treatment and optional account navigation; the main guest journey keeps a public-site layout.

## Proposed screen compositions

| Screen | Proposed composition and interaction |
| --- | --- |
| Home | White responsive header; short hero with one h1; prominent rounded search card; recent searches when available; larger image-led hotel/destination cards; compact genuine footer. No forced login popup before exploration. |
| Search | Compact persistent stay summary; result count and active-filter chips; desktop filter rail; responsive hotel cards; clear per-night versus whole-stay amounts/currency and cancellation facts. Mobile opens filters/sort in focused drawers and preserves results/URL state. |
| Hotel Details | Property title/rating/location; responsive gallery; concise sticky section links; desktop booking summary rail; date/guest selector; room cards or accessible comparison region with supported terms. Mobile uses a compact sticky selection summary/CTA that leads to available room choices. |
| Checkout | Distraction-reduced header; named steps (Your stay → Guest details → Payment); desktop stay/price summary beside form; mobile summary disclosure; labelled fields, inline validation plus error summary, visible expiry/recovery only when a hold expiry is available. Preserve Stripe/idempotency/hold lifecycle. |
| Confirmation / booking detail | One clear status heading; real reference number, property, dates, guests, rooms, total/currency, payment/cancellation details; useful next actions such as View booking, Contact property if supported, Print and Cancel when allowed. Load from URL and remain useful after refresh. |
| My bookings | Guest-friendly Upcoming/Past/Cancelled navigation only when supported by server filtering or authoritative loaded data. If only current creation-date filters are supported, retain and accurately label them; do not derive totals/tabs from one page. Consistent booking cards, status pills and View booking links. |
| Saved / Reviews | Reuse hotel/review cards, consistent rating scale, real empty/error states and pagination; no fabricated comparison or sharing features. |
| Account | Present working profile, payment methods and security clearly; remove developer copy; separate unavailable settings from actionable choices. Use the admin's form hierarchy, dirty-state feedback and accessible confirmation patterns. |
| Login / onboarding | Retain Keycloak flows and return destinations. Restyle local entry points and existing onboarding forms without inventing a second login system or rewriting identity-provider behavior in this frontend task. |

## Shared guest components

Create `client/src/components/ui/` for presentational primitives such as `GuestPage`, `SectionCard`, `ActionButton`, `FormField`, `StatusPill`, `RatingBadge`, `MediaImage` and an accessible drawer/dialog wrapper.

Build domain components for `StaySearch`, `StaySummary`, `HotelCard`, `PriceSummary`, `BookingCard`, `GuestHeader` and `GuestFooter`. Reuse and strengthen the existing skeleton, empty/error and pagination components. Keep card navigation as links and favorite/remove actions as separate buttons.

Add shared date-only stay calculation, rating-label and money/date-format helpers. Authoritative monetary values/currency come from existing quote/booking/record contracts. The server's current pricing service explicitly quotes USD; avoid implying that this review proves backend currency conversion is broken. Displayed currency switches require supported conversion behavior and otherwise should be omitted or informational.

## Implementation order

### Phase 0 — contracts and baseline

1. Record the source for every guest-facing fact: room class/bed type, rating, date-based inventory, payment schedule, taxes/fees, cancellation windows, check-in/out times, total/currency and confirmation state.
2. Preserve existing URL search/filter/sort/pagination behavior, auth return paths, hold expiry/release, saved methods and payment idempotency.
3. Add controlled populated/empty/failure/sparse-media and signed-out/signed-in fixtures; capture English/Vietnamese at 375/768/1280/1440px. Exclude devtools from production-facing accessibility scans.

### Phase 1 — foundations plus first pilot

1. Fix P1 truth/recovery/date issues; add focused regressions for fixed night counts, booking URL restoration and absence of invented claims.
2. Establish tokens, typography, document metadata, header/footer, media fallback and accessible control primitives.
3. Rebuild Search Results and Hotel Details together as the pilot. They prove the responsive search, hotel card, filters, room selection, price and policy components.
4. Compare pilot screenshots with the completed admin's visual roles and evaluate keyboard/mobile behavior before migrating the remaining screens. Re-estimate the rest after this checkpoint rather than asserting an unverified completion percentage.

### Phase 2 — booking and payment journey

1. Standardize checkout and authoritative stay/price summary; retain provider integrations and the existing hold/booking/payment sequence.
2. Rebuild confirmation, detail and cancellation with route recovery, honest policies and usable loading/failure/retry behavior.
3. Verify failed/retried payments never create duplicate bookings/charges; test hold expiry and leaving/returning to checkout. Use controlled data and the payment provider's test environment for live integration.

### Phase 3 — discovery and account completion

Migrate Home, Saved Hotels, My Bookings, Reviews, Account, login entry and partner onboarding to the proven components. Keep unavailable account/product features out of the main interaction path. Theme real notifications and chat without inventing new functionality.

### Phase 4 — acceptance and rollout

Run production builds, relevant unit/component tests and journey e2e; assess the visual and accessibility scorecard; exercise real local/staging auth/media/payments with approved test data. Only then mark the redesign accepted. Keep deployment and backend changes out of the initial UI scope.

## Acceptance checklist

- Every primary action, search field and selected value is reachable at 375px; element bounding-box checks catch clipping even when global overflow hides it. No unintended page overflow at all four target widths.
- English/Vietnamese titles, language metadata, labels and widget locale agree; changing language preserves current search/form state where safe.
- 10–13 November consistently means 3 nights; date-only tests include timezone/DST boundaries. Server quote totals remain authoritative.
- No fixed room scarcity, fake PIN/benefits, unconditional payment terms, unrelated hotel/brand names or unsupported amenities appear.
- Hotel photos belong to their documented entity; absent/failed photos have stable, appropriately sized placeholders.
- Bookmark/refresh of a booking or confirmation loads the exact reservation, including records outside the first list page, with appropriate not-found/forbidden/error handling.
- Search filters/sort/page are preserved in URLs/back/refresh. Summary counts and any future trip tabs do not fabricate hotel-wide/account-wide totals from a page of records.
- One clear page h1; semantic links/buttons, non-nested favorite actions, visible focus, labelled inputs, dialog focus containment/return and keyboard-reachable maps/gallery/menus.
- WCAG AA-oriented automated checks plus manual keyboard/touch/contrast review on real rendered states. Include reduced-motion and text-zoom checks; no claim of full conformance from automated scans alone.
- Checkout supports validation, expired holds, failed payment/retry, provider redirects and refresh without duplicate records or charges. Actual provider integration is tested separately from fixture UI checks.
- Loading, truly empty, failure, forbidden and partial-success states are distinct; retry preserves valid user work.

## Proposed first deliverable

A guest foundation and Search/Hotel pilot with the P1 booking trust/date/recovery fixes, matching the admin's visual system. Deliver components, English/Vietnamese text, focused regression tests and before/after screenshots. Review that concrete slice before expanding through checkout and account pages.

This document is the requested review/proposal. No guest UI implementation, backend change, new issue, commit, push or deployment was performed for this review.
