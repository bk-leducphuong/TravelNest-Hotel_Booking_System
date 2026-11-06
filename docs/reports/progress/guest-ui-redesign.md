# Guest UI redesign — implementation and validation

Updated: 2026-10-25. Branch: `codex/guest-ui-redesign`, created in a separate managed worktree from `origin/master` at `624d956`.

## Status

The visual migration now covers the shared foundations, search, hotel details, checkout, cancellation, discovery, saved stays, trips, reviews, account settings, login, partner entry, onboarding presentation and not-found recovery. Draft PR: [#155](https://github.com/bk-leducphuong/TravelNest-Hotel_Booking_System/pull/155), targeting `master`.

**The local UI implementation is complete for this pass; release validation remains pending.** The local API health request (`curl --max-time 3 http://127.0.0.1:3000/health`) failed to connect. No live payment, refund, authentication or inventory mutations were attempted. Unavailable account capabilities remain clearly labelled; this redesign does not implement missing backend features.

## Implemented

| Area | Result |
| --- | --- |
| Visual foundations | Admin-aligned blue palette, Poppins typography, white cards, consistent buttons, focus outlines, spacing, responsive header and footer. |
| Navigation and language | Real links, skip link, keyboard notification trigger, functional registration entry, EN/VI language switching without a reload, translated widgets and document titles. Removed unavailable rewards entries and false footer affiliations. |
| Search | Flexible fields replace the fixed-width search bar. Mobile filters open in a drawer. Result links and favorite controls are separate. Sorting, filters, pagination and destination IDs retain their existing URL/API behavior. Local name searches can show zero matches. |
| Honest result cards | Real property class, score-based rating label and API stay price. Removed hard-coded room types, bed details, prepayment promises, fee claims and scarcity messages. Cancellation availability explicitly directs guests to the room policy. |
| Hotel Details | Responsive gallery, overview, actual amenities/policies/check-in times, real map coordinates, date-aware room cards, selected-rate summary and functional room-selection anchor. Gallery and review dialogs support keyboard dismissal. Review filters, pagination, replies and helpful votes remain available. |
| Booking correctness | Calendar night calculations exclude checkout and retain decimal prices. Availability must match current dates/guest counts before selecting a room. Late responses are guarded. Existing hold/quote flow supplies the final booking price and policies. |
| Booking details / confirmation | Fetch the buyer-scoped booking endpoint using the URL code, including after reload. Show real status, reference, property, dates, rooms, currency and total. Explicit loading/retry/not-found states. Removed fake PIN, property, rewards and placeholder actions. Print now opens the browser print flow. |
| Recovery | Opening checkout without a selected stay shows a recovery path. Booking-list failures have a retry state rather than appearing as an empty list. Missing media has a translated fallback. |
| First-visit experience | Removed the automatic promotional popup and mount-time location permission request. |

The public pricing contract currently supplies USD. Search `min_price_for_dates` is the API's minimum stay total for one room; room selection displays combined nightly rates until the hold returns the final quote. No invented taxes, payment terms or cancellation guarantees are added.

## Verification

| Command | Result |
| --- | --- |
| `yarn build:guest` | Passed. Existing Sass deprecation and bundle-size notices remain. |
| `yarn workspace @travelnest/client test:unit` | 24 tests passed in 7 files. |
| `yarn workspace @travelnest/client test:component` | 44 tests passed in 10 files. |
| `yarn workspace @travelnest/client test:e2e --workers=2 --output=/tmp/travelnest-guest-playwright` | 20 Chromium tests passed. |
| `yarn workspace @travelnest/client lint` | 0 errors, 97 warnings. Baseline before this work: 0 errors, 297 warnings. Remaining warnings include legacy attribute/property ordering and dependency import-parser notices. |
| `git diff --check` | Clean. |

Browser coverage includes 375/768/1440px search layouts, language switching without losing search values, keyboard destination selection, phone filter/gallery dialogs, three-night stays despite a conflicting URL count, decimal room rates, invalidated room selections after date changes, hold request dates/quantities, direct booking links and reloads, confirmation lookup, failed booking fetch recovery and empty checkout recovery.

77 WCAG A/AA axe scans passed: the original eight English pilot scans, 17 remaining-route states at phone and desktop sizes in English/Vietnamese (68 scans), and the checkout payment-initialization failure state. No violations or page errors were found in those fixture states. The Vite development toolbar is excluded; it does not ship in production. This is not a claim of full-app accessibility conformance.

The follow-up browser tests also cover edited checkout contact details, explicit cancellation acknowledgement/refund request, hold expiry, Stripe initialization recovery, and keyboard dismissal of avatar and saved-card dialogs. Component tests verify a failed payment reuses its booking, entered contact details reach the API, initialization failure prevents submission, and incomplete payment never appears as success.

The new browser suite intercepts API responses and the development auth module inside Playwright. It introduces no production fixture switch or authentication bypass. Production output was checked for the fixture user/property/hold markers. Live Keycloak, inventory, Stripe, real media storage and cancellation/refund integration were not exercised in this pass.

## Visual evidence

These screenshots use synthetic property and reservation data with an existing repository hotel photo. They illustrate UI states, not live inventory or a real reservation.

| Page | Desktop (1440px) | Mobile (375px) |
| --- | --- | --- |
| Search | [Screenshot](./guest-ui-redesign/search-desktop.png) | [Screenshot](./guest-ui-redesign/search-mobile.png) |
| Hotel Details | [Screenshot](./guest-ui-redesign/hotel-desktop.png) | [Screenshot](./guest-ui-redesign/hotel-mobile.png) |
| Booking Details | [Screenshot](./guest-ui-redesign/booking-desktop.png) | [Screenshot](./guest-ui-redesign/booking-mobile.png) |

Additional retained views:

| Area | Evidence |
| --- | --- |
| Discovery | [Desktop](./guest-ui-redesign/home-desktop.png), [mobile](./guest-ui-redesign/home-mobile.png) |
| Checkout / cancellation | [Checkout mobile](./guest-ui-redesign/checkout-mobile.png), [cancellation mobile](./guest-ui-redesign/cancellation-mobile.png) |
| Trips / saved | [Trips mobile](./guest-ui-redesign/trips-mobile.png), [saved stays desktop](./guest-ui-redesign/saved-desktop.png) |
| Account | [Overview desktop](./guest-ui-redesign/account-desktop.png), [profile mobile](./guest-ui-redesign/profile-mobile.png) |
| Reviews / onboarding | [Reviews desktop](./guest-ui-redesign/reviews-desktop.png), [onboarding mobile](./guest-ui-redesign/onboarding-mobile.png) |

To regenerate the captures with the fixture suite:

```bash
GUEST_CAPTURE_DIR=/tmp/travelnest-guest-captures yarn workspace @travelnest/client test:e2e guest-redesign --workers=2 --output=/tmp/travelnest-guest-playwright
```

## Follow-up implementation

| Area | Result |
| --- | --- |
| Checkout | Responsive two-step guest/contact and payment layout. Editable, labelled, validated contact fields reach the booking API. Dates and quote come from the reserved stay. Expired holds have a recovery path. Unsupported parking/arrival/special-request controls and false service guarantees are removed. |
| Payment recovery | Inline provider initialization failure and retry. Stable idempotency key, created booking and guest contact persist in session state. Card declines retry the same booking. Incomplete confirmation cannot navigate to success. Saved-card and additional-authentication paths resume the same payment intent. Card elements are destroyed on unmount. |
| Cancellation | Real buyer-scoped booking lookup, policy snapshot, explicit acknowledgement and optional eligible-refund request. No fabricated zero fee or guaranteed refund. The success state distinguishes a submitted refund from a cancellation without an automatic refund. |
| Discovery / saved stays | Shared responsive property cards, image fallbacks and independent favorite controls. Native card links replace click-only containers and cramped carousels. Recent-search removal updates its own list. Destination entry supplies usable dates. Saved-list failures provide recovery. |
| Trips / reviews | Responsive trips list with existing server pagination and date filters. Review tabs are keyboard controls; request failures have retry states. Review form uses labelled native rating controls and submits only supported criteria; unused anonymous and unsupported rating controls are removed. Failed submission preserves the draft. |
| Account | Matching card foundations, working language preference, responsive section selector, guest-facing copy, keyboard-managed avatar and payment dialogs. Existing profile/payment/security actions remain; missing self-service capabilities remain explicitly unavailable. |
| Login / partner / onboarding | Matching typography, cards, responsive layouts and working navigation. Keycloak redirects and the existing property-registration stages remain. A not-found page provides a real home link. |

## Release checks still needed

- Run with the local/preview API, Keycloak, media storage and Stripe test configuration. Confirm real sign-in, hold expiry, booking/payment recovery across reload, saved-card authentication, cancellation/refund outcomes and media upload.
- Complete the entire partner-registration workflow with valid location, room and property data. The automated visual scans cover the entry stage and shared presentation, not a real registration submission.
- Check keyboard and screen-reader use with real provider dialogs/iframes and additional browsers. Automated axe scans cover the retained fixture states, not full accessibility conformance.
- Unsupported account privacy/export/deletion/preferences require separate product/backend work before they can become functional.

No production deployment was performed.
