# Guest UI redesign — first implementation slice

Updated: 2026-10-25. Branch: `codex/guest-ui-redesign`, created in a separate managed worktree from `origin/master` at `624d956`.

## Status

The shared foundations and the Search → Hotel Details pilot are implemented. Booking details and confirmation now recover from their URL. **The full guest redesign is still in progress.** Checkout, discovery cards, account pages and the remaining guest workflows need subsequent visual passes.

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
| `yarn workspace @travelnest/client test:component` | 43 tests passed in 9 files. |
| `yarn workspace @travelnest/client test:e2e --workers=2 --output=/tmp/travelnest-guest-playwright` | 13 Chromium tests passed. |
| `yarn workspace @travelnest/client lint` | 0 errors, 164 warnings. Baseline before this work: 0 errors, 297 warnings. Remaining warnings include legacy attribute/property ordering and dependency import-parser notices. |
| `git diff --check` | Clean. |

Browser coverage includes 375/768/1440px search layouts, language switching without losing search values, keyboard destination selection, phone filter/gallery dialogs, three-night stays despite a conflicting URL count, decimal room rates, invalidated room selections after date changes, hold request dates/quantities, direct booking links and reloads, confirmation lookup, failed booking fetch recovery and empty checkout recovery.

Eight English WCAG A/AA axe scans cover the home shell, search, hotel details and booking record at 375px and 1440px. No violations or page errors were found in those fixture states. The Vite development toolbar is excluded; it does not ship in production. Vietnamese search text and document language are checked separately. This is not a claim of full-app accessibility conformance.

The new browser suite intercepts API responses and the development auth module inside Playwright. It introduces no production fixture switch or authentication bypass. Production output was checked for the fixture user/property/hold markers. Live Keycloak, inventory, Stripe, real media storage and cancellation/refund integration were not exercised in this pass.

## Visual evidence

These screenshots use synthetic property and reservation data with an existing repository hotel photo. They illustrate UI states, not live inventory or a real reservation.

| Page | Desktop (1440px) | Mobile (375px) |
| --- | --- | --- |
| Search | [Screenshot](./guest-ui-redesign/search-desktop.png) | [Screenshot](./guest-ui-redesign/search-mobile.png) |
| Hotel Details | [Screenshot](./guest-ui-redesign/hotel-desktop.png) | [Screenshot](./guest-ui-redesign/hotel-mobile.png) |
| Booking Details | [Screenshot](./guest-ui-redesign/booking-desktop.png) | [Screenshot](./guest-ui-redesign/booking-mobile.png) |

To regenerate the captures with the fixture suite:

```bash
GUEST_CAPTURE_DIR=/tmp/travelnest-guest-captures yarn workspace @travelnest/client test:e2e guest-redesign --workers=2 --output=/tmp/travelnest-guest-playwright
```

## Remaining work

1. **Checkout and cancellation:** migrate the full forms, price/policy review, validation and payment states; verify hold expiry, retry, payment success/failure and cancellation charges with the real stack.
2. **Discovery and saved stays:** redesign home discovery sections, carousel/card interactions, destination entry states and saved-property layouts around the new foundations. The home shell is updated; its content components still use legacy layouts.
3. **Trips and account:** migrate the bookings list, reviews, profile, security, notification and payment settings pages. The booking-list error handling is improved, but its complete visual migration remains pending.
4. **Authentication and partner entry:** carry the card/typography/form patterns through guest login and property onboarding while preserving Keycloak and admin handoffs.
5. **Broader release checks:** populated and sparse data, English/Vietnamese on every route, keyboard/screen-reader checks, additional browsers and live provider/media checks.

No production deployment was performed.
