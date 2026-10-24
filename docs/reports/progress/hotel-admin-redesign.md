# Hotel admin redesign — first implementation slice

Plan: [issue #151](https://github.com/bk-leducphuong/TravelNest-Hotel_Booking_System/issues/151)

Branch: `codex/hotel-admin-redesign`. Started 24 October 2026.

## Delivered

- Guest-aligned blue theme, white sidebar, neutral canvas, self-hosted Poppins (including Vietnamese), Lucide icons, shared page/card/filter/status/action components and Element Plus overrides.
- One permission-filtered destination list for grouped desktop/mobile navigation and keyboard quick search; Availability stays under Rooms. Hotel context is visible on mobile. Profile menu retains locale switching and logout. No decorative chat/bell, upgrade promotions or dead policy links.
- Login and chart brand styling; chart values remain accessible in text.
- Rooms master/detail list with operational statuses and configured allotment. Room cards use placeholders; only selected-detail room photos are requested/cached. Hotel photos are never assigned to rooms.
- Dedicated room creation page. Create the basic record first, navigate to its retained ID, then manage photos/amenities there. The create request contains only supported room fields; attachment retries never create another room.
- Independent Basic Information / Configuration drafts and PATCH payloads; one save preserves the other section's unsaved inputs. Amenities retains its own save. Failed photo queues retry unfinished files without repeating successful uploads. Media mutations remain immediate.
- Unsaved-change/pending-operation protection for edited room pages, hotel switching and logout. Read responses cannot overwrite another hotel's Rooms list/detail.
- English/Vietnamese keys for new controls, browser fixtures isolated from production, and focused navigation/editor/browser regression tests.
- Fixed the source watcher exclusion that prevented HMR. Added missing admin tooling peers and corrected `typecheck` to actually check application files rather than an empty project-reference root.

## Verification

Passed:

- `yarn workspace @travelnest/admin-client test:unit --run`: 44 tests.
- `yarn workspace @travelnest/admin-client test:nuxt --run`: 7 tests, including independent save and partial upload recovery.
- `yarn workspace @travelnest/admin-client test:browser`: 5 browser workflows, including hotel permissions/stale responses, quick jump, creation, dirty edits, widths 375/768/1280/1440 and Vietnamese. Checks actual computed CTA color to catch Element Plus overrides.
- `yarn workspace @travelnest/admin-client test:e2e`: existing login entry-point test.
- `yarn build:admin`: production build; verified the test session fixture is absent from production JavaScript.
- `git diff --check`.

Known baseline blockers:

- `yarn workspace @travelnest/admin-client lint`: 8 pre-existing errors and 4 warnings (legacy Can component name, useApiFetch, and existing Nuxt tests). The same errors were reproduced on the base commit with the installed toolchain; new files introduce no lint errors.
- `yarn workspace @travelnest/admin-client typecheck`: 37 existing errors. An isolated base-commit application check reported 42 errors; current error signatures introduce none beyond that baseline. Existing issues include useApiFetch, Element Plus table callback types, query filter index signatures, Keycloak string narrowing, and inventory helpers/tests. The previous script returned success without checking these files.
- Existing duplicated `humanize` auto-import and workspace peer warnings remain.

Browser checks use `tests/fixtures/console` and intercepted API responses, never real mutations. The production app still requires its normal Keycloak session and backend. Full authenticated screenshots of all real routes and live booking/refund flows have not been exercised.

## Running the isolated browser checks

Run `yarn workspace @travelnest/admin-client exec playwright install chromium` once, then `yarn workspace @travelnest/admin-client test:browser`. An existing local Chrome can be selected with `CHROME_PATH=/path/to/chrome`. Test-session code is loaded only by the separate fixture Nuxt config.

## Remaining issue scope

This is the foundation and Rooms pilot, not completion of issue #151. Remaining work includes dedicated Dashboard/Bookings/Reservations/Availability/Property/Reviews/Finance/Payouts/Settings compositions, independent property saves, metric scope/currency handling, broader error-state coverage, and full acceptance review. These screens receive global theme styles now but retain their existing layouts and data behavior. No unsupported aggregates, new endpoints or database changes were introduced.
