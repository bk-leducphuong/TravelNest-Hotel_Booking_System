# Hotel admin redesign — implementation and acceptance

Updated 25 October 2026 (Asia/Ho_Chi_Minh). Branch: `codex/hotel-admin-redesign`.
Plan: [#151](https://github.com/bk-leducphuong/TravelNest-Hotel_Booking_System/issues/151).
Implementation: [PR #154](https://github.com/bk-leducphuong/TravelNest-Hotel_Booking_System/pull/154).
Review addressed: [5638733468](https://github.com/bk-leducphuong/TravelNest-Hotel_Booking_System/pull/154#pullrequestreview-5638733468).

## Status

The UI implementation covers every existing hotel-admin screen and the new room creation route. The earlier “Rooms pilot only” description is superseded. Controlled workflow, responsive and accessibility checks cover the full console; live authenticated integration remains an explicit release check, not an implementation-completion claim.

No backend endpoints or database schemas changed. Housekeeping and supply-stock Inventory remain excluded by #151. Existing room Availability remains supported under Rooms.

## Delivered

- Guest blue tokens, white grouped sidebar, self-hosted Poppins (including Vietnamese glyphs), Lucide icons, soft forms, status pills, rounded cards, shared headers and footer, and themed teleported Element Plus controls.
- Permission-aware desktop/mobile navigation and keyboard quick jump, visible mobile hotel context, profile locale/logout controls, skip link, and reactive translated document title and HTML language.
- Dashboard summary cards, booking trend, occupancy composition, recent bookings and status counts. Booking lists/details, reservation board/calendar, availability selection/bulk updates, property catalog/detail, review cards/detail/replies, payments/refunds/transactions, payouts/accounts, settings/team all use the shared composition.
- Independent property information/location/stay-policy saves preserve drafts in other sections. Room basic/configuration/amenity saves remain independent. Dirty edits and pending operations protect navigation, hotel switching and logout; requests reject superseded hotel results.
- Create a room once, retain its ID in the detail URL, then manage photos and amenities. Partial upload retry skips successful files and never repeats room creation. Failed navigation can reopen the retained record.
- Room list cards distinguish operational status/allotment from date-based availability. Room photos are loaded/cached only for a visible selected preview, never per card or for a hidden mobile panel.
- All admin image surfaces resolve object keys against `NUXT_PUBLIC_MEDIA_BASE`. Absolute/CDN URLs are preserved; missing configuration and failed image decoding degrade to placeholders. Docker and image CI forward the public bucket URL, matching the guest bucket by default.
- Element Plus locale follows the selected language. Booking-list/calendar labels are distinct in Vietnamese. All known amenity categories/codes have English/Vietnamese labels; future/custom amenities preserve their API label and unknown categories have a readable fallback.
- Fixed faint Availability/chart text, warning tag/alert contrast, unlabeled bulk inputs, and inline-link affordances. Ratings use one visible `/10` suffix.
- Lint/typecheck are now mandatory CI gates; the isolated browser/accessibility suite runs on the Node 22 CI leg. Lint/typecheck baseline failures fixed, admin ESLint aligned with its current Nuxt peers, and duplicate `humanize` auto-import removed. Fixture-generated `.nuxtrc` is ignored.

## Review resolution

| Review finding | Resolution |
| --- | --- |
| Broken room media from relative object keys | Shared URL resolver, public media runtime/build configuration, image decode fallback; browser checks verify real decoding and HTML-fallback failure. Applied to room preview/editor, property photos and review media/avatar surfaces. |
| Preview fetch runs when hidden on mobile | Media query matches the 1280px preview breakpoint; no image read until visible, with cache and stale-response protection. |
| Double back arrow | Translation owns the single arrow on room create/detail. |
| Unreachable creation success UI | Removed the transient success alert; automatic detail navigation remains, with a retained-ID retry if opening the record fails. |
| Bed-type placeholder / untranslated Element Plus | Explicit translated placeholder and global reactive Element Plus locale provider. |
| Raw amenity categories/names | Translated known category/code labels with API/humanized fallback for custom values. |
| Ambiguous deactivate text / already inactive rooms | Explicit danger button and record-specific accessible name; action omitted for inactive rooms. Status can be changed in the editor. |
| Duplicate Vietnamese booking navigation | “Lịch đặt phòng” and “Danh sách đặt phòng”. |
| Creation title/button mismatch | “Add room” / “Thêm loại phòng” consistently across navigation, heading and creation action. |
| Fixture `.nuxtrc` output | Ignored in the admin package. |
| ESLint peer warning | Admin uses ESLint 10, satisfying the installed Nuxt ESLint dependency tree. Unrelated workspace warnings are recorded below. |

## Data contracts and intentional adaptations

| UI | Source and display rule |
| --- | --- |
| Booking totals / arrivals / departures | Existing booking stats endpoint; hotel-wide counts, today's events explicitly labelled UTC to match backend semantics. List filters/pagination do not change the summary scope. |
| Booking trend | Existing 14-day booking-count trend; labelled as created bookings, not cashflow. Chart has an accessible values table. |
| Occupancy | Returned start/end dates and room-night units; booked/held/available form the displayed whole. Missing inventory is unavailable, not zero occupancy. |
| Payments / payouts | Existing hotel-wide status counts and count distributions. Ambiguous aggregate monetary amounts are omitted because the summary contract has no currency; individual records retain their returned amount/currency. No unsupported conversion. |
| Reviews | Published-review average on the canonical 1–10 scale, total/reply counts. Individual criteria use returned record values; missing values display “—”. No unsupported hotel-wide rating distribution or category averages. |
| Room cards | Operational status and configured allotment only. Availability/prices live in the date-aware Availability page; hotel photos are never assigned to rooms. |

Unsupported cashflow/expense charts, month-over-month comparisons, invoice tax/line items, top-rated room types, fake badges, notifications and promotional controls are deliberately omitted. A transaction detail is the supported invoice-style counterpart; it does not pretend to issue a tax invoice.

## Acceptance evidence

The isolated browser app uses `tests/fixtures/console` and intercepted responses. It cannot affect real bookings, refunds, property records or media. Production bundles are checked separately for fixture leakage.

- Responsive smoke and screenshots: every supported route, English and Vietnamese, at 375/768/1280/1440px. Wide data regions scroll within labelled, keyboard-focusable containers; there is no page-level horizontal overflow.
- Automated accessibility: all 20 authenticated screens, English desktop and Vietnamese mobile, WCAG 2 A/AA and 2.1 AA rules. These automated checks supplement the keyboard/focus and visual review; they are not a certification.
- Workflow regressions: permission changes/stale responses; read-only users; forbidden routes/no-hotel states; independent room/property saves; pending-operation and unsaved-edit guards; room creation/partial-upload retry/reload; availability bulk edit/reload; booking status/refund/reply payloads; summary scope/error/retry; image decoding/fallbacks; quick-search keyboard dismissal/focus return.
- API failures and genuinely empty lists are distinct, with successful retry coverage on Rooms, Bookings, Reviews and Payments.

### Visual review scorecard

“Pass” below describes the fixture-backed adaptation to existing data contracts, not a pixel-diff percentage. Guest blue replaces the mockup lime palette. The reference set is the supplied `docs/design/hotel_admin/*.png`.

| Supported counterpart | Shell | Type / spacing | Information hierarchy | Controls / tables | Responsive | States / keyboard / contrast | Intentional difference |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Dashboard / Bookings / Reservations ↔ Reservation | Pass | Pass | Pass | Pass | Pass | Pass | Supported booking/occupancy statistics; no fabricated average-stay or room-ranking metrics. Board/calendar retained. |
| Rooms ↔ Rooms | Pass | Pass | Pass | Pass | Pass | Pass | Neutral card placeholders, selected room media only; operational statuses/allotment replace unsupported live availability claims. |
| Add room / Room detail ↔ New Room | Pass | Pass | Pass | Pass | Pass | Pass | Creation first, independent editor sections afterward; no unsupported pricing/description fields or second media Save. |
| Payments / Payouts ↔ Finance | Pass | Pass | Pass | Pass | Pass | Pass | Count summaries/distributions replace unsupported cashflow/expense and ambiguous monetary aggregates. |
| Transaction detail ↔ Invoice | Pass | Pass | Pass | Pass | Pass | Pass | Amount/currency banner, supported record and refund details; no invented invoice line items/tax. |
| Reviews ↔ Reviews | Pass | Pass | Pass | Pass | Pass | Pass | Summary cards and review cards; canonical `/10`, no unsupported top-room/time-series/category summaries. |
| Property / Availability / Settings / Team | Pass | Pass | Pass | Pass | Pass | Pass | Adaptations of shared foundations; no direct reference PNG for these existing workflows. |

Screenshots are saved under the ignored `admin-client/test-results/` by the browser command. Representative retained evidence is linked from [the screenshot gallery](./hotel-admin-redesign/gallery.md).

## Verification

Passed on the completed implementation:

- `yarn workspace @travelnest/admin-client lint`: no errors or warnings.
- `yarn workspace @travelnest/admin-client typecheck`: clean application check.
- `yarn workspace @travelnest/admin-client test:unit --run`: 48 tests / 10 files.
- `yarn workspace @travelnest/admin-client test:nuxt --run`: 7 tests / 3 files.
- `yarn workspace @travelnest/admin-client test:browser`: 73 tests, including 20 route smoke/screenshots and 20 accessibility tests (40 language/viewport scans).
- `yarn build:admin`: production build passed. The login e2e harness also rebuilt production successfully.
- `yarn workspace @travelnest/admin-client test:e2e`: 1 login entry-point test passed.
- `git diff --check`: clean.
- Production JavaScript contains none of the fixture session/email/media-host markers.

The original report's 8 lint errors / 4 warnings and 37 application type errors no longer describe this branch. Non-blocking upstream sourcemap/module-annotation and terminal color warnings remain during builds/tests.

## Running checks

From the repository root:

```bash
yarn workspace @travelnest/admin-client lint
yarn workspace @travelnest/admin-client typecheck
yarn workspace @travelnest/admin-client test:unit --run
yarn workspace @travelnest/admin-client test:nuxt --run
yarn workspace @travelnest/admin-client test:browser
yarn build:admin
yarn workspace @travelnest/admin-client test:e2e
```

Install Chromium once with `yarn workspace @travelnest/admin-client exec playwright install chromium`, or set `CHROME_PATH=/usr/bin/google-chrome` when using an existing compatible Chrome. Avoid simultaneous production builds: the login e2e harness also builds the app. The isolated console fixture has its own build directory.

## Release validation and limits

- The local API (`localhost:3000`), Keycloak (`localhost:8080`) and MinIO (`localhost:9000`) were unavailable during this pass. Full live owner/read-only/platform-admin authentication, actual media storage and booking/refund integration must be smoke-tested when that stack is running. No production writes or deployments were attempted.
- Current tests validate controlled workflows and UI contracts, not provider success at Stripe/Keycloak/MinIO. The earlier linked human review verified real-session shell/permissions on the first slice; it is not evidence for the entire final console.
- All retained screenshots use synthetic fixtures, including deliberate absent media and sparse lists. Provider credentials, guest data and secrets are excluded.
- Cross-workspace dependency peer warnings remain in the guest/server/superadmin packages. They do not block the admin checks; changing those unrelated packages is outside this redesign.
- The original full set of per-route before screenshots was not captured. The retained original admin overview is the available baseline; after/reference comparison and the adaptations above are the current visual evidence.

The implementation can be reviewed as a complete frontend change. Keep live release sign-off separate until the unavailable integration checks have been exercised.
