# Superadmin redesign — implementation and verification

Updated 31 October 2026 (Asia/Ho_Chi_Minh).
Plan: [Superadmin UI/UX update](../../plan/superadmin-ui-ux-update.md).

## Status

The UI migration covers all 13 existing pages and the new missing-page recovery
route. The earlier first-slice status is superseded. All implementation slices
are delivered; real identity/API integration remains release validation.

The console remains a read-only, cross-hotel workspace using existing
`/api/v1/superadmin/*` contracts and global `platform.*` permissions. No server,
database schema or production infrastructure changes were needed.

## Delivered

| Area                     | Result                                                                                                                                                                                                                                                                        |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Foundations              | Guest/hotel-admin blue palette, locally served Poppins with Vietnamese glyphs, Lucide icons, shared headers/cards/status pills/forms and themed Element Plus overlays.                                                                                                        |
| Shell                    | Grouped light sidebar, permission-aware mobile drawer and keyboard quick-jump, visible all-hotel scope, locale/account controls, skip link, translated titles and HTML language. Longer Vietnamese titles do not wrap the phone toolbar.                                      |
| Overview                 | Loading, missing snapshot, valid zero, initial failure and retained-data refresh failure; all-time/platform scope and explicitly UTC snapshot timestamp. Refresh reads stored data rather than recomputing it.                                                                |
| Hotels                   | Search/status directory, URL pagination and filter restoration; richer contact/location/timezone/class/description details, counts, `/10` rating and team. User links require `platform.user.read`.                                                                           |
| Users                    | Search/status/role directory, profile/access panels, membership links and per-record counts. Personal data remains exactly as returned by the server, including masks. Hotel links require `platform.hotel.read`.                                                             |
| Finance summary          | Four status-specific snapshot sections, currency-separated amounts/counts, missing/loading/error/retained-data states. List filters do not affect all-time summary totals.                                                                                                    |
| Payments/refunds/payouts | Supported status/currency/hotel/UTC-date filters, typed record inspection, full IDs and references, completion/processing times, eligibility, fees and payout periods. Cancelled statuses are included.                                                                       |
| Ledger                   | Currency/hotel/posted-date/direction/event filters, account information, description and copyable returned references. Event options match backend constants.                                                                                                                 |
| Audit                    | Actor/entity/type/action/hotel/date filters; full actor/entity/request references and read-only metadata inspection. Metadata is rendered as text, never HTML.                                                                                                                |
| Recovery                 | EN/VI login and account-error states, provider-start failure recovery, internal-only return destinations, stable forbidden screen and a permitted destination from missing-page recovery.                                                                                     |
| Shared list behavior     | A single load path for applied URL queries; labelled filters, validation before API reads, page-size/Back/reload restoration, request ownership, distinct empty/no-match/error states and explicit out-of-range page recovery.                                                |
| Accessibility            | Native table headings/captions, labelled keyboard-scrollable regions, focus-visible controls, drawer Escape/focus restoration, copy feedback and responsive overflow checks. Record overlays attach to the document body, avoiding page-spacing offsets at the viewport edge. |
| CI/docs                  | Blocking lint/application typecheck, browser/accessibility checks on Node 22, separate fixture/login output directories, current README and retained visual gallery.                                                                                                          |

## Data and behavior guarantees

- **Permissions:** both direct page access and navigation use global permissions;
  first permitted destination is used after login. Staff without page access can
  remain on `/403` without an automatic loop. The API remains the authority.
- **Request ownership:** later filters or detail IDs invalidate earlier reads;
  stale successes/failures cannot replace current state. Session/permission changes
  clear retained data. Inspection closes when its list/query changes.
- **Failure recovery:** initial errors are not rendered as empty results. API
  400/404/429 have distinct copy/recovery. A 401 resets the session; both 401/403
  clear displayed data and navigate to login/forbidden, including HTML proxy errors. Retries are explicit.
- **Snapshots:** nullable `generatedAt` and `stale` match the backend. `stale` means
  a missing snapshot, not an elapsed-age threshold. Missing totals never become
  fabricated zeros; a valid zero snapshot remains displayable.
- **Dates:** calendars use UTC; the end day maps to `23:59:59.999Z`. Payments,
  refunds and payouts filter creation time; ledger filters posting time. Refund
  rows also display requested/processed time, and the creation-date filter label
  makes that distinction explicit.
- **Money:** no assumed USD currency, cross-currency totals or conversion.
  `Intl.NumberFormat` applies each currency's precision and selected locale.
  Decimal strings are formatted without a lossy Number conversion. Missing or
  invalid values show unavailable.
- **PII:** masks are preserved. No unmask toggle, client reconstruction, persistent
  response-body storage or added analytics logging. An explicitly applied name/
  email search is present in that list's URL as designed.
- **Inspection:** drawers use returned list data; no invented single-record
  endpoints or reloadable finance/audit detail URLs. Hotel/user links appear only
  with permission. Unsupported booking/payment reference routes are not linked.

## Baseline and supporting repairs

Before migration, the existing 16 tests and production build passed. Lint could
not start because the workspace lacked an ESLint declaration. The original
project-reference-wrapper typecheck did not establish an application baseline.
The updated script checks `.nuxt/tsconfig.app.json` and exposed existing missing
template-helper imports, query typing and a fragment-stripper type error; focused
repairs resolved those. Tooling/font/icon/i18n dependencies align with hotel-admin.

## Verification

| Check                                                                                                      | Result                                                                                                                |
| ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `yarn workspace @travelnest/superadmin-client lint`                                                        | Passed, no warnings/errors.                                                                                           |
| `yarn workspace @travelnest/superadmin-client typecheck`                                                   | Passed against application sources.                                                                                   |
| `yarn workspace @travelnest/superadmin-client test:ci`                                                     | 38 tests across 6 files: formatting/query/permission/navigation helpers, Nuxt login and record-key request ownership. |
| `CHROME_PATH=/usr/bin/google-chrome yarn workspace @travelnest/superadmin-client test:browser --workers=2` | 58 browser tests passed, including 63 axe A/AA scans across page and overlay states.                                  |
| `CHROME_PATH=/usr/bin/google-chrome yarn workspace @travelnest/superadmin-client test:e2e`                 | Production build and login smoke passed.                                                                              |
| Production JavaScript scan                                                                                 | No fixture identity, email or API-host markers.                                                                       |
| `git diff --check`                                                                                         | Passed.                                                                                                               |

The browser suite uses synthetic fixtures, including populated hotel/user details,
multi-currency finance records and audit metadata. It covers every route in both
languages at 375/768/1280/1440px. Axe A/AA checks cover phone/desktop pages in both
languages, open navigation/quick-jump and populated record drawers. These checks
supplement keyboard/focus and visual review; they are not a full accessibility
conformance claim.

Workflow regressions cover URL/pagination/Back/reload, one request per filter
application, stale responses, invalid dates/UUIDs/currencies/options/pages, empty
versus failure, page recovery, snapshot recovery, support display, permission
cross-links, session revocation, non-JSON errors, manual 429 retry, complete-ID
copying, safe metadata text and internal login return destinations.

Builds retain upstream sourcemap/VueUse annotation and terminal-color warnings.
CI also checks that production JavaScript excludes fixture identity/API markers.
Yarn reports unrelated workspace peer warnings. CI changes have been verified
locally; no remote workflow was triggered in this session.

## Visual evidence

Retained screenshots contain synthetic records, not real platform or personal
data. [The gallery](./superadmin-ui-redesign/gallery.md) links English desktop and
Vietnamese phone views of every page, plus representative record drawers.
The layouts were checked against the existing hotel-admin visual foundations.

To regenerate:

```bash
CHROME_PATH=/usr/bin/google-chrome yarn workspace @travelnest/superadmin-client test:browser --workers=2
```

The isolated Nuxt app runs on 8115 and writes to
`superadmin-client/test-results/console/`. Its session plugin is registered only
in the fixture configuration. Login e2e builds production and uses 8100 with a
separate `test-results/e2e/` directory. Avoid concurrent production builds.

## Release validation and intentional limits

- Real Keycloak login/logout/token refresh, server permissions/PII masking,
  snapshot jobs and cross-hotel finance/audit reads still need an authorized
  live environment. Fixtures prove frontend behavior, not backend enforcement.
- Friendly city/hotel lookup selectors require an authorized lookup contract;
  hotel filters currently use validated full IDs. `minPrice` is omitted because
  the platform hotel contract has no currency. Provider-owned login styling
  remains the existing `travelnest-platform` theme.
- New mutation workflows, impersonation, exports, global record search,
  notifications, historical metrics and independent finance/audit detail routes
  remain separate product/backend proposals, as scoped in the plan.
- Additional browsers and manual screen-reader/provider checks remain release
  QA. No production deployment or live mutations were performed.

Existing user-owned working-tree changes were preserved.
