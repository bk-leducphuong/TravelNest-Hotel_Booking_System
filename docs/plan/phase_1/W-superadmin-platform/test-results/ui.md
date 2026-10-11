# W — Superadmin Platform: UI evidence

> 2026-10-11 · `http://localhost:8100` (Nuxt console) · Keycloak client `travelnest-superadmin`
> (public, PKCE) · Playwright MCP. Identities: `admin@travelnest.local` (admin, PII),
> `support@travelnest.local` (support_agent, masked), `owner@travelnest.local` (non-platform).

| ID | Scenario | Result | Evidence |
|----|----------|--------|----------|
| UI-01 | Login page (`/login`) | ✅ heading **“TravelNest Platform”**, button **“Sign in with TravelNest”** | rendered |
| UI-02 | Admin sign-in | ✅ lands on `/`; sidebar **Overview · Hotels · Users · Finance · Audit log**; header `admin@travelnest.local` + `admin` tag | rendered |
| UI-03 | Support sign-in | ✅ same nav; role tag `support_agent`; masked PII | rendered |
| UI-04 | Non-platform (owner) | ✅ redirected to `/403` — “Access denied … Ask an administrator to grant you the admin or support_agent role. Sign out” | rendered |
| UI-05 | Overview | ✅ KPI cards **HOTELS 12600 / USERS 83 / BOOKINGS 441740** + status breakdowns (hotels active/inactive/pending/suspended; users active/banned/inactive) + `generatedAt`; **Refresh** present | rendered |
| UI-06 | Hotels list | ✅ table Name · City · Country · Class · Status · **Owner** · Created; 20 rows; search + status filter | rendered |
| UI-07 | Hotel detail | ✅ “The Poplar Road Inn”, status tag, count cards **ROOMS 8 / BOOKINGS 41 / REVIEWS 26 / RATING 7.74**, **Team** table (owner/manager/staff + primary-owner flag + joined) | rendered |
| UI-08 | Users list | ✅ table Email · Name · Status · Global roles · Joined · Last login; 20 rows; filters | rendered |
| UI-09 | User detail | ✅ Profile (phone/DOB/address/joined/last login/email verified) + Access (global roles, bookings 174) + Hotel memberships | rendered |
| UI-10 | PII masking | ✅ support `/users` → `te•••@travelnest.com`, `•••67`; admin → `test@travelnest.com`, `+84901234567` | rendered |
| UI-11 | Finance overview | ✅ `/finance` KPIs + sub-nav (Overview/Payments/Refunds/Payouts/Ledger) | rendered |
| UI-12 | Finance lists | ✅ `/finance/payments` (Date·Hotel·Buyer·Amount·Method·Status; buyer masked for support) and `/finance/ledger` (Posted·Account·Event·Direction·Amount·Hotel) | rendered |
| UI-13 | Audit | ✅ table When · Action · Entity · Actor · Reason; 50 rows; first row `platform.pii.read · hotel · 01a105dc · 01a105e0` | rendered |
| UI-14 | Nav gating | ✅ `SUPERADMIN_NAV` is permission-filtered; admin & support both hold all `platform.*.read` so the nav is full for both | code + rendered |
| UI-15 | Session expiry | ⬜ not force-tested (logout → `/login` works; 401 handling is in the auth store) | — |
| UI-16 | Empty/fresh DB | ⬜ not tested (would need a cold snapshot table) | — |

## UX acceptance

| ID | Criterion | Result |
|----|-----------|--------|
| UI-UX1 | No console errors | ❌ **3 errors** — the Keycloak `parseCallbackUrl` error (see **W-F3**); same class as guest **A-F9/D-F2**, not applied to `superadmin-client/services/keycloak.ts` |
| UI-UX2 | Empty states, no crashes | ✅ all tables render an empty state (e.g. finance/overview with no rows; user memberships “No hotel memberships”) |
| UI-UX3 | Masking visibly differs support vs admin | ✅ verified (UI-10) |
| UI-UX4 | `/403` reachable, no loop | ✅ verified (UI-04) |

## Notes

- The console is **read-only** — every page is a table/KPI view; no write controls exist (matches scope).
- The `travelnest-superadmin` Keycloak client **now exists** (public, PKCE), so plan limitation **D6** is resolved.
- Amounts render as currency (`$383.59`, `$349.96`); dates render locale-formatted.
