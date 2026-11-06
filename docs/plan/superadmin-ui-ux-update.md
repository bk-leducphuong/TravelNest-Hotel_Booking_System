# Superadmin UI/UX review and update plan

Reviewed 31 October 2026 (Asia/Ho_Chi_Minh), against local HEAD `5a8d4d1`.
Status: all UI implementation slices are delivered, including the directory,
finance, audit and recovery migrations. Live identity/API integration and release
validation remain separate. See [implementation evidence and remaining release checks](../reports/progress/superadmin-ui-redesign.md).

## Recommendation

Bring the platform console onto the guest/hotel-admin visual foundations, with a denser layout suited to cross-hotel investigation. Prioritize mobile navigation, reliable list filtering, snapshot honesty, and record inspection alongside the visual migration. Keep the current read-only platform API and global permission model.

Use the hotel-admin implementation as the closest reference because both consoles use Nuxt, Pinia, Tailwind and Element Plus. Adapt its presentational patterns; retain superadmin's own auth, API client, navigation and permission checks. Hotel context is a list filter here, never an active tenant or an `X-Hotel-Id` header.

## Review basis and limits

- [PR #154](https://github.com/bk-leducphuong/TravelNest-Hotel_Booking_System/pull/154), merged 25 October, commit `25c4caf`: hotel-admin redesign. Its PR description still describes an early slice; the final [implementation report](../reports/progress/hotel-admin-redesign.md) and merged source document the wider delivery and supersede that scope description.
- [PR #155](https://github.com/bk-leducphuong/TravelNest-Hotel_Booking_System/pull/155), merged 26 October, commit `8333918`: guest redesign, including commits `792b523`, `45d333c`, `13593ce`, `ac68d71`. Its body/report retain draft-era language; GitHub metadata confirms it is merged. See [guest implementation report](../reports/progress/guest-ui-redesign.md).
- Inspected retained hotel-admin dashboard and guest search screenshots, all 13 superadmin page files, layout/navigation, auth middleware/store, HTTP client, API types, validators, relevant server serializers/repositories, tests and CI workflow.
- This is a source/contract review with existing visual references, not a fresh authenticated browser audit. Current superadmin contrast, keyboard behavior, breakpoints and runtime behavior still require browser validation during implementation.
- Existing untracked design/report files and other working-tree changes were left untouched. No production access or mutations were performed.

## Findings

Paths below are repository-relative.

| Priority | Finding and evidence                                                                                                                                                                                                                       | Planned outcome                                                                                                                                                   |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0       | `superadmin-client/layouts/default.vue` hides the entire sidebar below `md` with no alternative navigation.                                                                                                                                | Mobile menu/drawer with the same permitted destinations, focus management and visible platform context.                                                           |
| P0       | Overview cards use `?? 0` before success and after failure. Server overview services return `stale: true` and `generatedAt: null` when no snapshot exists, but both frontend overview types omit `stale` and declare a non-null timestamp. | Separate loading, failed, snapshot-unavailable and valid-zero states. Show snapshot generation time and make Refresh's scope explicit.                            |
| P0       | List pages assign every completed request to current state, without a request version guard. Resetting `page` and calling `load()` can also duplicate a request because `watch(page, load)` runs.                                          | A single query-driven load path; superseded responses cannot overwrite current results/errors/loading state.                                                      |
| P1       | Current shell uses dark slate/indigo, default typography and generic Element Plus surfaces; no superadmin theme stylesheet, font setup or locale module.                                                                                   | Blue palette, Poppins, light grouped sidebar, consistent cards/controls/icons, EN/VI support and themed overlays.                                                 |
| P1       | List search/filter/page state lives only in component refs. Detail pages load on mount but do not watch their record ID.                                                                                                                   | URL-backed filters/pagination, Back/reload restoration and record-ID-aware detail fetching.                                                                       |
| P1       | Navigation filters by permission, but `middleware/auth.global.ts` checks only the global staff role for page access. API endpoints correctly require granular permissions. `/403` currently redirects all platform staff to `/`.           | Permission-aware route access and links, plus a stable forbidden state for staff missing a page permission. Preserve server enforcement and avoid redirect loops. |
| P1       | Finance list contracts support `hotelId`, `currency`, `from`, `to`; most controls are absent. Audit supports actor, entity ID, hotel and date filters beyond its two current text inputs.                                                  | Expose supported investigation filters and validate them before sending requests.                                                                                 |
| P1       | Finance tables omit record IDs and useful returned fields; audit truncates actor/entity IDs without an inspection surface for metadata/request IDs.                                                                                        | Read-only, keyboard-accessible record drawers using returned list data, full IDs and clear cross-links where a permitted route exists.                            |
| P1       | Errors clear list rows and totals while tables remain rendered, so a failure can also look empty. Filters mostly rely on placeholder text rather than persistent labels.                                                                   | Explicit error/retry versus empty/no-match states, labelled controls, readable status labels and accessible table regions.                                        |
| P1       | `utils/format.ts` hard-codes money locale to `en-US`, defaults currency to USD, and forces at most two fractional digits.                                                                                                                  | Locale-aware dates/money, explicit timezone, record currency and currency-specific precision; missing/invalid data displays unavailable.                          |
| P1       | Authenticated browser coverage is absent: current e2e only checks login; unit coverage covers permission/format helpers and Nuxt tests cover login. CI allows lint/typecheck failure.                                                      | Isolated authenticated fixture suite, responsive/a11y/permission/race tests and blocking CI checks after baseline fixes.                                          |
| P2       | README still says only Overview exists and links a removed `SUPERADMIN_PLAN.md`; deploy TODOs describe infrastructure already present.                                                                                                     | Update actual routes, scope, commands, test setup and deployment references.                                                                                      |

P0 means address in the first functional slice; P1 is required for the completed migration; P2 is supporting cleanup.

## Design direction

Match the existing foundations in `admin-client/assets/css/main.css` and `admin-client/tailwind.config.ts`:

| Foundation   | Target                                                                                                                                                           |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Brand/action | `#003b95` / `#0071c2`; retain existing semantic success/warning/danger colors and verify contrast.                                                               |
| Surfaces     | `#f5f5f5` canvas, white panels, subtle borders, roughly 20px panel radius.                                                                                       |
| Typography   | Self-hosted Poppins with Vietnamese glyphs; tabular numbers for amounts/counts and monospace for IDs.                                                            |
| Navigation   | White icon sidebar, soft blue active states; Platform / Directory / Finance / Governance grouping.                                                               |
| Density      | Clear page header, compact labelled filter toolbar, readable tables; retain enough width for investigation rather than the present fixed `max-w-6xl` everywhere. |
| Scope        | Visible “Platform workspace · All hotels” context; selected hotel filters stay local to their list URL.                                                          |
| Responsive   | Collapsible mobile navigation, stacked filters, compact pagination, contained keyboard-scrollable tables; no page-level horizontal overflow.                     |
| States       | Shared skeleton/loading, error/retry, unavailable snapshot, empty dataset, no matches, forbidden and not-found compositions.                                     |

Navigation outline:

```text
TravelNest · Platform workspace
  Overview
Directory
  Hotels
  Users
Finance
  Summary · Payments · Refunds · Payouts · Ledger
Governance
  Audit log
Top bar: current page · Go to… · language · account/sign out
```

The quick-jump searches permitted destinations only. It does not promise platform-wide record search. Avoid tenant switching, decorative notification counts and hotel-management controls in this workspace.

Initially adapt small presentational components locally under `superadmin-client/components/ui/`. Use the hotel-admin `PageHeader`, `SectionCard`, `StatCard`, `StatusPill`, `FilterBar`, `EmptyState` and icon-button patterns. Keep auth-aware shell components platform-specific. A monorepo UI-package extraction can follow separately if actual duplication warrants it; it is not a prerequisite for this redesign.

## Route-by-route scope

All 11 authenticated screens plus login and forbidden recovery are included.

| Route               | Proposed composition and behavior                                                                                                                         | Available data / limit                                                                                                                                                                                                        |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                 | Three KPI cards, hotel/user status distributions with accessible values, snapshot timestamp, refresh/retry and permitted directory shortcuts.             | Existing counts only. Do not label this infrastructure health or add time-series, growth or occupancy without new contracts.                                                                                                  |
| `/hotels`           | Directory table with name/location, status, class, owner and created date; search/status filters, result count, clear filters and URL pagination.         | Search/status/page/limit supported. `cityId` exists, but a friendly city selector requires confirming an authorized lookup source; omit it from the first slice. Do not show `minPrice` as money without a currency contract. |
| `/hotels/:hotelId`  | Identity/status header; contact/location/timezone/description; room/booking/review counts; rating `/10`; owner/team with permitted user links.            | Existing detail fields, including `rating.total`. No room editor, approve/suspend button or live availability claims. Avoid fetching user records per team row.                                                               |
| `/users`            | Account directory with search/status/role filters, translated role/status pills and joined/last-login columns.                                            | Current server-side filters and masked PII. Counts describe the filtered result, not platform totals.                                                                                                                         |
| `/users/:userId`    | Identity/profile/access panels, booking count and hotel-membership table with permission-aware hotel links.                                               | Returned profile/global-role/membership fields only. Explain restricted personal data from current permission context; no reveal toggle or role editor.                                                                       |
| `/finance`          | Four summary sections: completed gross payments, succeeded refunds, paid payouts and pending payouts; currency-grouped values/counts, snapshot timestamp. | Keep currencies separate. These are snapshot totals with status scope; list date filters do not change them. No net-profit/growth chart.                                                                                      |
| `/finance/payments` | Labelled status/currency/hotel/date filters; amount/status/date/party table; record drawer with ID, booking reference, method and completion time.        | Existing list payload. Include `cancelled`, which is accepted by the API but absent from the current dropdown. No payment-detail fetch route or mutation.                                                                     |
| `/finance/refunds`  | Same filter pattern; reason/eligibility, requested/processed time and references in the drawer.                                                           | Existing payload. Date filtering currently uses `created_at`, not `requested_at`; label the filter as creation date unless a separate contract change aligns it. No approve/refund action.                                    |
| `/finance/payouts`  | Same filter pattern; owner/hotel/amount/fee/status, payout period and paid time in drawer.                                                                | Include server-supported `cancelled`. Do not offer retry/release actions.                                                                                                                                                     |
| `/finance/ledger`   | Currency/hotel/posted-date/direction/event filters; account/event/direction/amount table; description and returned references in drawer.                  | Event options from `server/constants/ledger.js`; full references can be copied, but booking/payment detail URLs do not exist in this console.                                                                                 |
| `/audit`            | Action/entity/actor/hotel/date filters; actor/event/entity/time/reason table; drawer with full IDs, request ID and formatted metadata.                    | Already-returned metadata only. Render as text, never HTML; preserve server redaction. Dates use the audit creation timestamp.                                                                                                |
| `/login`            | Matching branded sign-in card, EN/VI, clear pending and actionable account-error states.                                                                  | Preserve Keycloak redirect/PKCE flow and the existing deleted/inactive-account loop prevention. Provider theme already exists as `travelnest-platform`; verify visual continuity before changing it.                          |
| `/403`              | Matching recovery panel with sign out and a permitted home/destination when available.                                                                    | Distinguish non-platform identity from missing page permission. No automatic loop back into a forbidden overview.                                                                                                             |

## Data and interaction rules

1. **Snapshot truth:** add `stale: boolean` and `generatedAt: string | null` to both overview contracts. The server currently uses `stale` for a missing snapshot, not an age threshold. Never claim real-time freshness. Refresh re-fetches the snapshot; it does not recompute it. Show a retained successful snapshot as previous data if refresh fails, with an explicit error.
2. **One applied query:** maintain draft search/filter inputs separately where Apply is used. Serialize validated applied filters, page and page size into the URL. Back/Forward/reload restores the same results. Apply/Clear changes query once and resets page once. Language changes preserve it.
3. **Request ownership:** version or cancel list/detail requests; only the current request may commit rows, error or loading state. Clear record drawers on query changes. Watch detail IDs; avoid displaying the previous person's/property's data while a new detail request loads. Clear sensitive data on sign-out/session change.
4. **Pagination:** respect API limits (100 for directory/finance, 200 for audit). Use returned totals. A page becoming empty after data changes must offer recovery to an existing page without a fetch loop. Retain list query in detail/back links.
5. **Time/currency:** display timezone explicitly; convert a chosen calendar range into instants consistently, including the selected end date. Payments/refunds/payouts filter creation time; ledger filters posting time. Validate range order, UUIDs, currency codes and enums. Do not send empty optional query values. Preserve decimal amounts and separate currencies; do not sum visible rows into a platform total.
6. **Permissions/PII:** server responses remain authoritative. Gate routes, sidebar, quick-jump and cross-links with matching global permissions. Explain masked PII without attempting to reconstruct it. Avoid storing response bodies/PII in local storage, URL queries or telemetry. Search text may contain an email; keep it to the explicit list URL and do not add analytics capture.
7. **Inspection:** finance/audit drawers inspect the selected returned row. Close on route change, support Escape and restore focus. Direct, reloadable finance/audit detail links are deferred because no individual-record endpoint exists. Copy buttons must use a real returned value and announce success/failure.
8. **Failure recovery:** distinguish validation (400), unauthenticated (401), forbidden (403), missing detail (404), rate-limited (429), offline/server failure and a successful empty result. Retry preserves filters. Do not repeatedly auto-retry sensitive reads or trigger Keycloak redirect loops.

## Ordered implementation slices

Estimates are indicative engineering days for one developer, including review and automated verification; live identity/service setup can extend them.

| Slice                                    | Deliverables / main files                                                                                                                                                                                                                                                                                                                  | Completion gate                                                                                                                                           | Estimate |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 0 — Baseline and fixture                 | Install pinned dependencies; capture current 13 routes with synthetic admin/support sessions; record lint/typecheck/build/test baseline; create isolated console fixture and browser configuration using hotel-admin's fixture approach. Check `typecheck` actually targets `.nuxt/tsconfig.app.json`, as the hotel-admin script now does. | Reproducible authenticated UI without a production auth bypass; baseline failures documented accurately.                                                  | 1 day    |
| 1 — Foundations and first vertical slice | Local tokens/Tailwind/font/icon setup; EN/VI config and Element Plus locale; default layout/sidebar/topbar/footer; mobile drawer; permitted quick-jump; page permission mapping; shared states; correct overview contract and `/` migration.                                                                                               | Overview works for snapshot missing/zero/error/retry, both languages and mobile; navigation/forbidden behavior covers partial permissions.                | 2–3 days |
| 2 — Directories                          | Shared URL-query/request-version behavior; hotels/users lists and details; labelled filters; accessible tables; query restoration; masked-data messaging and cross-links.                                                                                                                                                                  | Back/reload/filter/page and rapid-change workflows pass; same-component ID navigation loads correct data; admin/support fixtures preserve server masking. | 2–3 days |
| 3 — Finance                              | Migrate all five screens and `FinanceNav`; date/currency/hotel filters; enum options; record inspection drawers; locale/currency helpers; snapshot scope and unavailable states.                                                                                                                                                           | Multi-currency, missing values, creation/posting date semantics, filters, race handling and drawer focus tests pass. No unsupported actions.              | 2–3 days |
| 4 — Audit and recovery                   | Audit filters/metadata inspection; login and 403 styling/copy; unknown-route recovery; stable document titles/HTML language; update README.                                                                                                                                                                                                | All 13 existing routes covered, plus unknown-route recovery; no permission or authentication redirect loops.                                              | 1–2 days |
| 5 — Acceptance and CI                    | Responsive/keyboard/axe checks and retained screenshots; meaningful unit/Nuxt regressions; build artifact fixture-leak check; add browser CI job and make lint/typecheck blocking after resolving baseline.                                                                                                                                | Commands below pass; fixture evidence and remaining live release checks are recorded separately.                                                          | 1–2 days |

Expected total: approximately **9–14 engineering days**, sequenced as above. Each slice can be a reviewable PR; later slices depend on the shared foundations. The first implementation PR should deliver slices 0–1, including a working overview, rather than stopping at a globally recolored shell.

## Acceptance and verification

### Automated and manual coverage

- All 13 routes in English and Vietnamese at 375, 768, 1280 and 1440px; confirm readable wrapping, mobile navigation and contained wide tables. Capture representative screenshots with synthetic data and review against the retained hotel-admin reference.
- Keyboard navigation through menu, filters, quick-jump, table links, pagination and drawers. Visible focus, skip link, page-level heading, persistent form labels, Escape dismissal/focus return and clear accessible names. Run axe A/AA checks on every route in desktop/mobile states; supplement with manual contrast and keyboard review.
- Roles: admin, masked support agent, non-platform user, staff with partial permissions and staff with no permitted destination. Hidden nav is not the authorization test: direct URL access and server denial handling must also be covered.
- List behavior: Apply/Clear once, page reset, URL/back/reload restoration, zero results versus error, invalid query recovery, out-of-order success/failure, filter changes during loading and retry after rate limiting.
- Overview/finance: absent snapshot, valid zero, successful snapshot, failed initial read, failed refresh of retained data; timestamp language/timezone and unchanged snapshot after refresh. Mixed currency and zero/three-decimal currency formatting.
- Directory details: missing record, route ID changes, membership links with restricted destination permissions and server-masked PII. No per-row detail requests.
- Record drawers: full IDs, missing references, audit metadata safely rendered, focus restoration and query-change cleanup. No client request for an unsupported detail endpoint.
- Authentication: deleted/inactive account errors, expired session, sign out, forbidden page recovery and no redirect loops. Production build contains no fixture identity, test session hook or test API host.

### Commands

Existing commands, from repository root:

```bash
yarn install --immutable
yarn workspace @travelnest/superadmin-client lint
yarn workspace @travelnest/superadmin-client typecheck
yarn workspace @travelnest/superadmin-client test:unit --run
yarn workspace @travelnest/superadmin-client test:nuxt --run
yarn build:superadmin
yarn workspace @travelnest/superadmin-client test:e2e
git diff --check
```

Add `test:browser` and an isolated Playwright config in slice 0, then gate it in CI as hotel-admin does. Avoid simultaneous builds against the same output directory: current login e2e builds production itself. If backend contracts need changes, isolate those changes and add focused server tests rather than treating fixture coverage as integration evidence.

### Baseline attempted during this review

The following three commands were attempted; all stopped before their checks started with `Couldn't find the node_modules state file`:

- `yarn workspace @travelnest/superadmin-client test:unit --run`
- `yarn workspace @travelnest/superadmin-client lint`
- `yarn workspace @travelnest/superadmin-client typecheck`

No dependency installation was performed for this planning-only review. There is no verified passing/failing application baseline yet. Source inspection also shows the superadmin `typecheck` script differs from the corrected hotel-admin script, so its coverage must be verified before treating a future green exit as meaningful.

### Live release checks

After fixture acceptance, verify real Keycloak sign-in/out, token expiry, admin/support masking, allowed/denied API reads, real snapshot timestamps, pagination and cross-hotel finance/audit filters in an authorized environment. Unmasked reads can create PII-access audit entries, so prefer synthetic fixture evidence for broad screenshot capture. Record live checks separately from fixture results. Production deployment follows the existing Argo CD process and project approval requirements.

## Deferred product/backend work

Separate proposals are needed for hotel approval/suspension, account/role mutations, refund execution, payout retry, impersonation, global record search, server-wide exports, notifications, historical trend metrics and reloadable finance/audit detail routes. Do not add decorative controls for them during the migration. The current endpoints provide monitoring and inspection, and that scope is sufficient for this update.

## Implementation references

- Foundations: `admin-client/assets/css/main.css`, `admin-client/tailwind.config.ts`, `admin-client/components/ui/`, `admin-client/layouts/default.vue`, `admin-client/app.vue`, `admin-client/i18n/locales/`.
- Existing race handling and fixture patterns: `admin-client/composables/useRequestVersion.ts`, `admin-client/tests/fixtures/console/`, `admin-client/playwright.console.config.ts`.
- Current superadmin integration: `superadmin-client/services/http.ts`, `superadmin-client/services/api/`, `superadmin-client/stores/auth.ts`, `superadmin-client/middleware/auth.global.ts`, `superadmin-client/utils/navigation.ts`.
- Backend truth: `server/modules/superadmin/api/superadmin.schema.js`, `server/modules/superadmin/api/superadmin.routes.js`, `server/modules/superadmin/application/`, `server/modules/superadmin/infrastructure/finance.repository.js`, `server/constants/payment.js`, `server/constants/ledger.js`.
- Validation/deployment pipeline: `.github/workflows/superadmin-client.yml`; compare `.github/workflows/admin-client.yml` for mandatory checks and isolated browser testing.
