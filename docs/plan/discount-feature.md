# Discount feature implementation plan

Status: proposed; no application changes implemented.

Proposed ERD: [preview](../diagrams/travelnest-discount-erd.png), [editable draw.io source](../diagrams/travelnest-discount-erd.drawio), and [SVG](../diagrams/travelnest-discount-erd.svg). The diagram distinguishes existing context, proposed tables, and booking extensions.

## 1. Recommended first release

Build two hotel-funded promotion modes with one shared pricing engine: automatic sale offers shown on hotel listings and promo codes entered at checkout. Hotel administrators manage both for hotels they are authorized to manage. Start with one applied promotion per booking and USD checkout, matching the current pricing flow.

| Capability | First release |
| --- | --- |
| Discount type | Percentage or fixed USD amount |
| Scope | One hotel; automatic offers may target all rooms or selected rooms; codes cover all rooms |
| Activation | Automatic best eligible offer, or guest-entered code before booking creation |
| Eligibility | Booking window, optional stay window, minimum eligible room subtotal, minimum nights, optional minimum advance-booking days |
| Limits | Codes: total uses and uses per authenticated guest; both modes: optional maximum percentage-discount amount |
| Listing display | Original and sale prices, savings badge, offer name, and eligibility summary |
| Combination | One promotion per booking; choose the best eligible offer without stacking |
| Administration | Create draft, edit draft, activate, pause, list usage |
| History | Preserve discount terms and amounts on each booking |

Defer stacking, room-specific codes, member-only automatic rates, limited-use automatic campaigns, platform-funded campaigns, first-booking offers, loyalty benefits, multi-currency discounts, and discounts on manual bookings. Public automatic offers have no total/per-user redemption limit in this release, so listing prices do not depend on guest identity or a scarce coupon allocation. Existing manual total overrides remain a separate mechanism and cannot combine with promotions.

The agreed scope includes both automatic listing offers and checkout codes without stacking. Funding, fee calculation, cancellation reuse policy, and the detailed eligibility defaults below remain proposed decisions to confirm before implementation.

## 2. What the repository already provides

- `server/modules/booking/application/pricing.service.js` computes room-night subtotals, tax, service fees, commission, and USD totals from inventory.
- `server/modules/booking/application/hold.service.js` creates a 15-minute hold with a price breakdown.
- `server/modules/booking/application/guest/createBookingFromHold.js` recalculates pricing and creates the booking, booking rooms, and pending payment transaction inside a database transaction. It supports an `Idempotency-Key`.
- `server/modules/booking/application/guest/createPaymentIntentForBooking.js` charges the stored booking total. Discount changes must finish before this point.
- Bookings already store `price_breakdown` and cancellation-policy snapshots, but have no discount columns.
- `server/modules/payment/application/webhooks/handlePaymentSucceeded.js` confirms bookings and posts ledger entries. Failure, cancellation, and expiry use separate paths.
- `server/modules/payment/application/guest/createPaymentIntent.js`, exposed through the payment guest routes, is an additional checkout entry point that must be reviewed for compatibility.
- `client/src/views/Book.vue` displays checkout prices. Guest, hotel-admin, and superadmin clients are separate applications.
- `server/modules/search/infrastructure/queries/room-offers.query.js` aggregates inventory prices and applies price constraints; `domain/offers.js` normalizes room offers and `application/search-pipeline.js` selects offers for each hotel. Promotion-aware prices must be computed before price constraints and offer selection.
- `client/src/views/SearchResults.vue` displays the minimum stay price for the requested rooms; `client/src/components/map/MapComponent.vue` also displays search prices. Neither currently renders automatic sale prices.
- No discount, coupon, or promotion engine was found in the application code; the notification enum includes a promotion type only.

Follow the current `server/modules/*/{api,application,domain,infrastructure}` structure and module public interfaces. Some older guide paths and the service-extraction saga document describe different arrangements; verify runtime wiring rather than assuming that future event-based flow is active.

## 3. Pricing contract

Keep the original room subtotal unchanged for comparison and auditing. Add an explicit discount and discounted subtotal:

```text
roomSubtotal       = sum(pricePerNight × roomQuantity for every booked night)
eligibleSubtotal   = sum(original room-night amounts covered by this promotion)
discountAmount     = fixed booking amount or rounded percentage of eligibleSubtotal
discountAmount     = min(discountAmount, percentage cap if configured, eligibleSubtotal)
discountedSubtotal = roomSubtotal - discountAmount
taxAmount          = round(discountedSubtotal × taxRate)
serviceFeeAmount   = round(discountedSubtotal × serviceFeeRate)
totalPrice         = discountedSubtotal + taxAmount + serviceFeeAmount
```

Use integer cents for discount arithmetic and deterministic rounding; percentage values should use basis points or an equivalent exact representation. Convert database DECIMAL strings at explicit boundaries. Allocate the discount proportionally across room lines with a deterministic remainder rule, so line amounts sum exactly to booking amounts.

Evaluate each eligible automatic offer independently against original prices. Apply a fixed amount once per booking, not once per room or night; percentage discounts apply only to eligible room-night amounts. Allocate only to eligible lines and leave other lines unchanged. Require every occupied night to meet the offer's stay window in this release; partial-stay promotions are deferred. Minimum spend uses the eligible original subtotal, not tax, fees, or already-discounted amounts. Resolve targeted room IDs within the promotion's hotel; room type selections in admin are materialized to explicit room IDs at activation.

Select the eligible promotion with the lowest final payable total; break equal totals by stable promotion ID. Without a code, choose the best automatic offer. With a valid code, compare it against the best automatic offer and apply only the better one; prefer the automatic offer on an equal total to avoid consuming a code unnecessarily. Explain when a sale already gives the better price. An invalid or exhausted submitted code returns an error without replacing the currently displayed offer. Removing the code restores the best automatic offer. Never combine different automatic promotions across rooms in the same booking.

Proposed tax and service-fee basis is the discounted room subtotal. Treat this as a product/accounting decision to confirm, rather than a tax-law assumption. Reject discounted totals below the payment provider's configured minimum; do not introduce a free-booking flow in this release. Validate that minimum using the supported provider/currency configuration during implementation.

**Commission needs an explicit resolution:** pricing currently computes commission from room subtotal, while `ledger.service.js` computes it from the payment transaction amount. Choose and snapshot one policy before enabling discounts. Recommended first release: preserve the ledger's collected-total basis, use it consistently in pricing and reports, and reverse the original allocated fees on refunds. Do not silently recalculate historical bookings with new settings.

Quote/booking responses should expose `subtotal`, `discountAmount`, `discountedSubtotal`, `taxAmount`, `serviceFeeAmount`, `totalPrice`, `currency`, and a safe promotion summary including ID, mode, name, version, and code where applicable. Keep internal usage counts and actor details out of guest responses. Carry the selected promotion identity in the pricing fingerprint, including when an equal-price offer replaces another.

### Listing and search pricing

Use the same pure eligibility, money, allocation, and selection rules in search, room details, holds, preview, and booking creation. Search invokes these rules with inventory-backed offers and public automatic promotions only; codes never alter public search results.

1. Filter candidates by location, dates, occupancy, inventory availability, and other non-price conditions.
2. Batch-load active automatic promotions and room targets for candidate hotels; avoid one query per hotel/room. Retain original stay totals and calculate eligible sale totals for the requested dates and room quantity.
3. Apply price constraints to discounted prices using the existing filter's per-room/per-night basis. Select the cheapest qualifying room offer per hotel using the discounted requested-stay total. Apply price ordering and any price-derived ranking features to the same discounted basis, then paginate. Price facets and map markers must use that basis too.
4. Return original and discounted requested-stay totals, original and discounted average nightly amounts, currency, savings, safe promotion metadata, and the existing room/date context. Keep existing search price fields as effective payable room-price fields and add explicit original-price fields with a documented response version/compatibility contract. Search room totals exclude tax/service fees as today; disclose that basis and do not compare them against tax-inclusive totals.

Current base-price SQL HAVING filters must be moved or replaced with promotion-aware predicates. In particular, an undiscounted room above the budget may qualify after its sale. Do not preselect the cheapest base-price room or paginate hotels before evaluating sale prices. Keep non-price filters in SQL; implement a bounded batch pipeline or SQL promotion-aware read model that evaluates all candidates relevant to a result page with correct global ordering/counts. Define and benchmark representative large searches before choosing the final execution strategy; truncating candidates is not an acceptable optimization.

Keep inventory prices and `hotel_search_snapshots` as base data. Do not overwrite them with a temporary sale price. Any derived-price cache must include dates, room/guest criteria, currency, pricing version, and promotion generation/version; invalidate on activation/pause/archive, room-target changes, inventory changes, and expiry. Cache TTL must not cross the next booking-window or advance-booking eligibility transition, using the hotel timezone where applicable. If full search responses are cached, invalidate every response whose ordering/counts could change, including when a formerly absent hotel becomes eligible.

Show crossed-out prices only for an actual positive discount on the same available room offer, stay, room quantity, occupancy, currency, and fee basis. Derive the badge from actual savings after caps; avoid misleading nominal percentages. For searches without sufficient date/occupancy context, show a general offer label without a guaranteed sale amount. Listing prices remain advisory; any change on room selection or booking requires a refreshed quote and guest review.

## 4. Data model

### Promotions

Create `promotions` with:

- UUID ID, hotel ID, mode (`automatic` or `code`), nullable normalized code, name, optional description, lifecycle state (`draft`, `active`, `paused`, `archived`).
- Discount type, fixed amount or percentage basis points, currency, optional maximum discount.
- Booking start/end timestamps; optional stay start/end dates; minimum nights, eligible original room subtotal, and optional minimum advance-booking days.
- Optional total-use limit and per-user limit for codes only; reserved and redeemed counts if used for atomic capacity enforcement. Automatic offers reject these limits in this release.
- Version, creator/updater IDs, and timestamps.

Use a unique `(hotel_id, normalized_code)` key. Normalize ASCII codes consistently (trim and uppercase), constrain length and characters, and do not reuse archived codes. Require bounded percentage values, positive fixed amounts, coherent windows, and nonnegative constraints through Joi plus database constraints where supported.

Require a non-null code for code mode and a null code for automatic mode. Add `promotion_rooms` with unique `(promotion_id, room_id)` entries for selected-room automatic offers and an explicit `room_scope` (`all` or `selected`) on promotions; reject empty selected-room scopes. Add indexes supporting hotel/mode/state/booking-window lookups and room-target joins. Verify MySQL nullable unique-key behavior in migration tests.

After activation, freeze economic and eligibility fields; allow pause/archive and create a replacement promotion for changed terms. Record administrative actions using the existing audit mechanism if available, otherwise add a promotion audit table. Pausing blocks new reservations and honors already-created pending bookings.

Booking windows use UTC instants with inclusive start and exclusive end. Stay windows use hotel-local dates: every occupied night must qualify; checkout is excluded. Minimum nights means stay duration, not nights multiplied by room quantity.

Minimum advance days is the difference between the hotel's local booking date and check-in date. Identify a reliable hotel IANA timezone field or add one, with an explicit fallback policy, before enabling this rule. Make current time injectable for boundary tests.

### Redemptions and capacity

Create `promotion_redemptions` with promotion ID, booking ID, buyer ID, hotel ID, status (`reserved`, `redeemed`, `released`), discount amount, currency, promotion version/snapshot, reservation deadline, and lifecycle timestamps/reason.

Record both promotion modes for reporting and immutable booking history. Only limited code promotions need capacity enforcement; automatic offers still follow the same idempotent lifecycle without reserving a scarce use.

- Unique booking ID enforces one promotion per booking.
- Index `(promotion_id, buyer_id, status)` and `(status, reservation_expires_at)`.
- If enforcing per-user limits through counters, add `promotion_user_usage` with a unique `(promotion_id, buyer_id)` key and reserved/redeemed counters.
- Enforce capacity with locked rows or conditional atomic updates in MySQL. Redis is not the source of truth.
- Lock the booking/hold first and promotion and user-usage rows in a consistent documented order. Handle concurrent creation of user-usage rows through the unique key and bounded retry.

### Booking snapshots

Add `discount_amount` defaulting to zero and nullable `promotion_id` to bookings. Store original subtotal, discounted subtotal, promotion mode/name, nullable code, discount type/value/cap, eligibility/target snapshot, funding source, allocation by room, pricing version, and fee policy in `price_breakdown`. Preserve existing snapshots when promotions change or expire.

Old bookings remain readable with zero discount. Do not backfill historical amounts from current inventory or current promotions. Holds need no reserved promotion in this design: preview prices are advisory until booking creation.

## 5. Guest checkout and lifecycle

1. Guest sees the best automatic offer for the requested search context, chooses rooms, and obtains the existing room hold with the best automatic offer recalculated for the full selected basket. Include its price breakdown and fingerprint in hold responses. If a mixed-room selection changes eligibility or savings, show that before the guest proceeds.
2. Guest optionally enters a code and requests a server preview using the hold ID. Verify authentication, hold ownership/status/deadline, hotel, dates, and eligibility. Read rooms and dates from the hold; ignore client-provided monetary amounts. Evaluate automatic offers and the submitted code without stacking. Preview does not consume usage.
3. Return a pricing breakdown, stable pricing fingerprint, promotion version, and preview expiration. Explain that availability is confirmed on booking creation.
4. Booking creation receives optional `promotionCode` and the accepted pricing fingerprint for both modes. Lock/revalidate the active hold, recalculate the best applicable offer, lock/revalidate any code capacity, and record/reserve the selected promotion in the same transaction as booking/inventory/payment-transaction creation. Serialize activation/pause races with reservation validation; never reserve a code that was merely submitted but lost to a better automatic offer.
5. If pricing or terms changed, return `PRICE_CHANGED` with a fresh quote and require the guest to review it. Do not silently remove an invalid code or charge a higher total. A fingerprint detects changes; it is not authority for client prices.
6. Persist the full price snapshot. The existing booking payment-intent path charges only that stored total. The code cannot change after booking creation; cancel the pending booking and restart checkout to change it.
7. On successful payment, change `reserved → redeemed` atomically with booking confirmation. Duplicate callbacks do nothing. Verify provider amount, currency, payment intent, and booking identity against stored payment context before confirming.
8. On unpaid cancellation or expiry, change `reserved → released` atomically with the terminal booking transition and release counters exactly once.

An ordinary card decline can be retried until the existing booking payment deadline. Current failure handling marks bookings `payment_failed`, while the booking intent path accepts only `pending_payment`: resolve this mismatch by treating retriable failures as payment-attempt failures while keeping the booking payable. Keep the redemption reserved during that window. Terminal failures release both inventory and promo capacity through one terminal transition.

Payment arriving after expiry or cancellation must never confirm the booking or redeem released capacity. Route it through refund/reconciliation handling. Test cancellation explicitly: the existing success handler checks expired bookings, so this needs more than a discount counter update.

Proposed reuse policy: release capacity for unpaid terminal bookings; a successfully paid booking consumes its usage permanently, including after full or partial refunds. This avoids cancellation-based reuse and makes campaign limits predictable. Refund only the amount actually paid, using stored discounted amounts and the original fee allocation; never refund a discount as cash.

Include optional code and accepted quote identity in request hashing. Retrying the same booking request replays the existing booking and redemption; changing the code under the same key returns the existing idempotency conflict. Replay must preserve the originally selected automatic offer even if a better sale has since activated. Test concurrent conversion of the same hold with different keys as well.

Add a reconciliation job to identify overdue reservations, missing terminal transitions, and counter drift. It must inspect booking/payment state through owning module interfaces before releasing capacity, and must not independently release a still-payable booking merely because a timestamp passed.

## 6. API and module boundaries

Add `server/modules/promotion/` with pure eligibility/calculation rules, application use cases, repositories/models, Joi schemas, controllers, routes, and a public `index.js`. Keep Sequelize access in repositories. Register models, aliases, routes, jobs, and any permissions following the current module registry conventions.

Proposed routes below are relative to the existing API prefix; confirm exact mounts during implementation:

| Route | Purpose |
| --- | --- |
| Existing search and room-detail endpoints | Extend with automatic promotion prices and safe offer metadata |
| Existing hold endpoints | Return automatically discounted breakdown and quote fingerprint |
| `POST /promotions/preview` | Authenticated `{ holdId, code? }`; returns best automatic/code quote; absent code removes a submitted code |
| `POST /bookings` | Extend existing body with optional code and accepted quote fingerprint |
| `GET /admin/hotels/:hotelId/promotions` | Paginated list and filters |
| `POST /admin/hotels/:hotelId/promotions` | Create draft |
| `PATCH /admin/hotels/:hotelId/promotions/:promotionId` | Edit draft with version conflict protection |
| `POST /admin/hotels/:hotelId/promotions/:promotionId/activate` | Validate and activate |
| `POST /admin/hotels/:hotelId/promotions/:promotionId/pause` | Block new redemptions |
| `POST /admin/hotels/:hotelId/promotions/:promotionId/archive` | Retain historical records |
| `GET /admin/hotels/:hotelId/promotions/:promotionId/redemptions` | Paginated authorized usage history |

Check authorization against the promotion's persisted hotel and targeted room hotel, not only the URL/body. Guests can see safe public automatic-offer summaries through search/detail responses, but cannot enumerate private codes, management records, or other guests' usage data. Rate-limit previews and normalize error handling without logging payment secrets or guest details.

Provide stable errors such as `PROMOTION_NOT_AVAILABLE`, `PROMOTION_NOT_ELIGIBLE`, `PROMOTION_LIMIT_REACHED`, `PROMOTION_USER_LIMIT_REACHED`, and `PRICE_CHANGED`, with English/Vietnamese messages in clients. Preserve existing hold and idempotency errors.

Booking orchestration calls the promotion module's public reservation/release/redeem methods and passes the existing transaction. Payment triggers these transitions through booking-owned public methods; do not import promotion or booking repositories across module boundaries. If asynchronous extraction is already enabled for a runtime path, use its existing transactional outbox and idempotent consumers rather than assuming a shared transaction across separate services.

Review the legacy `POST /payments` checkout path. Automatic discounts now affect holds without an explicit code, so rejecting code fields alone is insufficient. Route all discounted holds through canonical booking creation and stored snapshots, or reject them with an actionable transition to the canonical checkout. Keep existing non-promo compatibility intentional and tested; it must never create a second discounted booking or trust a modified hold total.

## 7. User interfaces

**Guest listing and room selection:** update `SearchResults.vue`, hotel room offers in `HotelDetails.vue`, and map markers to use server-calculated effective prices. Show original/sale prices, actual savings, offer name, and relevant conditions. Example: the same room offer goes from USD 100 to USD 80 per night under a 20% summer sale; a three-night single-room search shows USD 300 → USD 240 before the same taxes/fees. On cards use the requested-stay amount already displayed by the current UI. Show automatic offers on room selection and explain that one offer applies per booking. Home cards without date context may show a general sale label only.

**Guest checkout:** add an accessible promo-code input with Apply/Remove, loading/error states, and a savings line in `Book.vue`. Automatic savings appear without typing a code. Explain when an entered code is beaten by the current sale. Use server responses for all totals. Invalidate previews when the hold, rooms, dates, or code change; discard stale preview responses. Removing the code requests the best automatic quote. Show the applied offer/code and saved amount on confirmation, booking details, cancellation previews, and receipts. Preserve selection through refresh only while it still belongs to the same valid checkout context. Update English and Vietnamese locales.

**Hotel admin:** add promotion list with automatic/code filters, draft editor, activate/pause/archive actions, eligibility summary, and reserved/redeemed/released counts. The editor selects promotion mode, room scope for automatic offers, windows, minimum stay/spend, advance-booking rule, discount/cap, and code limits where applicable. Display a sample listing and guest-total preview, explain best-offer selection/no stacking and who funds the discount. Add discount lines and mode/name to booking/payment details and relevant exports; split campaign usage and savings reports by mode. Reuse current hotel authorization, navigation, form, date, currency, and error conventions.

**Superadmin:** first release needs visibility into original price, discount, paid amount, and fee/payout totals in existing finance/detail views where those amounts appear. Platform-wide campaign authoring is deferred.

Public listings include automatic offers only. Code-dependent or personalized prices must not leak into shared search caches or base hotel search snapshots.

## 8. Delivery sequence

| Phase | Deliverables | Completion gate |
| --- | --- | --- |
| 1. Contract | Confirm both modes, room targeting, best-offer policy, pricing/fee basis, date/timezone boundaries, refunds and limits; map runtime routes and module registration | Search-to-checkout examples and lifecycle cases agreed |
| 2. Data and engine | Additive migrations, room targets, repositories, shared evaluator, best-offer selection, exact arithmetic, allocations, snapshots | Eligibility, selection, and money tests pass; old bookings still readable |
| 3. Lifecycle integration | Preview, transactional reservation, booking hashing, immutable totals, webhook/cancellation/expiry integration, reconciliation, legacy-path guard | Real MySQL concurrency and payment lifecycle tests pass |
| 4. Hotel management | Authorized draft/activation APIs, audit, admin forms and usage views | Cross-hotel access tests and admin checks pass |
| 5. Search integration | Batch promotion loading, effective offer prices, filters/facets/sorting/ranking/pagination, detail/hold consistency, cache invalidation | Correct global ordering/counts and representative performance benchmarks pass |
| 6. Guest and reporting | Listing/room sale displays, map prices, checkout apply/remove/review UI, locales, details/receipts, finance consistency | Search-to-payment E2E and amount reconciliation pass |
| 7. Rollout | Feature flags for both modes, staging scenarios, operational metrics, limited hotel activation | No oversubscription, stale sale ordering, or pricing/ledger mismatch |

Keep commits/PRs aligned with these phases. Author additive migrations first; deploy consumers that tolerate absent discounts before enabling campaign creation. Production deployment follows the existing Argo CD process and requires the project's production approval rules.

Rollout flags must govern search, detail, hold, preview, and booking consistently for each promotion mode. Rollback by disabling new offer application/previews/reservations/administration and invalidating sale caches while continuing to honor and process already-created discounted bookings, refunds, and expiry. Pending holds are repriced with guest review if their previously displayed offer becomes unavailable. Do not drop redemption records or reset counters as a rollback step.

## 9. Verification and acceptance

- Pure tests: fixed/percentage values, caps, eligible subtotal, minimum spend/nights/advance days, timezone/date boundaries, room targeting, mixed-room allocation, fixed amounts once per booking, best-offer/tie selection, no stacking, zero/minimum-payable totals, currency mismatch, and normalization.
- Search tests: a room above the base-price budget qualifies after discount; a more expensive base-price room becomes the cheapest sale offer; correct global sorting, price facets, counts and pagination; requested quantity and map/detail consistency; activation/pause/expiry and local-midnight cache invalidation; anonymous guests see only public automatic offers. Benchmark query count and latency at representative candidate/offer volumes.
- Transaction tests against MySQL: two guests competing for the final use; one guest using multiple checkouts at a per-user limit; same hold converted twice; failed booking transaction leaves no reservation/counter change; repeated release/redeem calls do nothing.
- Payment tests: retries and declines, duplicate/out-of-order success/failure events, amount/currency mismatch, success racing cancellation/expiry, late payment refund handling, partial/full refunds, and balanced ledger/owner payable amounts.
- Security tests: hold ownership, cross-hotel management, paused/expired campaigns, stale fingerprints, unauthorized endpoints, and client amount tampering.
- UI tests: accurate same-offer crossed-out prices and cap-adjusted badges, automatic application, apply/remove/invalid code, better-sale messaging, mixed-room selections, listing-to-detail-to-checkout totals, changed price review, stale responses, refresh, expired hold, mobile layout, and both languages.
- Regression tests: undiscounted bookings, manual bookings, old booking details, both checkout entry points, and finance exports.

Run the relevant root-workspace commands: server `test:unit` and `test:integration`; guest `test:unit`, `test:component`, and checkout `test:e2e`; admin `test:unit` and `typecheck`; applicable superadmin scripts after checking its package; root `yarn lint` for the cross-package change. Report any unavailable integration services explicitly.

Acceptance: automatic sale prices are calculated consistently across search, room details, hold and checkout for the same context; price filters/sorting/pagination use effective prices; any intervening change requires guest review; only one promotion applies per booking; preview totals equal the guest-approved booking totals; stored booking, transaction, provider charge, receipt, and ledger reconcile; concurrent requests cannot exceed limits; campaign edits never alter existing bookings; unpaid expiry releases usage exactly once; unrelated hotels cannot manage or inspect each other's campaigns.

Track automatic/code selection outcomes, search latency/query counts, stale-cache or listing/quote mismatches, preview outcomes, reservation conflicts, redeemed discounts by mode, overdue reservations, counter discrepancies, and payment/ledger mismatches. Avoid logging raw guest information. No tests were run for this planning-only document.
