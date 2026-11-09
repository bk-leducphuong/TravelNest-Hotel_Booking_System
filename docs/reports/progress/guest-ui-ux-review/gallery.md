# Guest UI/UX — current-state screenshots

These are current UI screenshots, not proposed mockups. Captured with synthetic API responses and a repository-provided room image. Protected screens use a test-only Vuex session; no real Keycloak, bookings, charges or uploads were exercised. First-visit marketing popup was suppressed for the main journey captures.

[Review and proposed implementation plan](../guest-ui-ux-review.md).

| Screen | Route | Desktop, 1440px | Mobile, 375px |
| --- | --- | --- | --- |
| home | `/` | [Desktop](./home-1440.png) | [Mobile](./home-375.png) |
| search | `/search` | [Desktop](./search-1440.png) | [Mobile](./search-375.png) |
| hotel | `/hotels/:hotel_id` | [Desktop](./hotel-1440.png) | [Mobile](./hotel-375.png) |
| bookings | `/bookings` | [Desktop](./bookings-1440.png) | [Mobile](./bookings-375.png) |
| booking-detail | `/bookings/:bookingCode` | [Desktop](./booking-detail-1440.png) | [Mobile](./booking-detail-375.png) |
| saved | `/saved-hotels` | [Desktop](./saved-1440.png) | [Mobile](./saved-375.png) |
| account | `/account-settings` | [Desktop](./account-1440.png) | [Mobile](./account-375.png) |
| checkout | `/book (guest details step)` | [Desktop](./checkout-1440.png) | [Mobile](./checkout-375.png) |

The mobile images expose clipping that `#app { overflow-x: hidden }` conceals from document-width-only tests. The floating development-tools handle is development-only and is excluded from product findings.
