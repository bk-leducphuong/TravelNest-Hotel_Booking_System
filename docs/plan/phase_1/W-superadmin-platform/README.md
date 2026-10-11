# W — Superadmin Platform (console + API)

> Part of [Phase 1 — Feature Test & Production-Readiness Review](../TEST-REVIEW-PLAN.md).
> **Status:** 🟡 Partial — reviewed; 4 findings (1×S2) · **Tier:** 0
> **Scope:** the cross-tenant monitoring console added on `feat/superadmin`
> (backend `server/modules/superadmin`, frontend `superadmin-client`). _Supersedes the dropped
> “Internal Superadmin API” placeholder — that `/internal/superadmin` surface was removed._
> Plan executed: [`SUPERADMIN_TEST_PLAN.md`](../../../SUPERADMIN_TEST_PLAN.md).

## Scope

- **API:** `GET /api/v1/superadmin/{me,overview,hotels,hotels/:id,users,users/:id,audit,
  finance/{overview,payments,refunds,payouts,ledger}}` — all read-only, gated by `platform.*`
  permissions.
- **UI:** `superadmin-client` (Nuxt) — overview, hotels, users (PII), finance (5 views), audit,
  `/403`, Keycloak PKCE login.
- **Risk focus:** cross-tenant exposure, PII masking + unmask auditing, RBAC, snapshot freshness,
  read-only guarantee, rate limiting.

## Review axes

- [x] UI/UX
- [x] API/contract
- [x] Security/authz
- [x] Data integrity
- [x] Error/edge
- [x] Performance (snapshot read path)
- [x] Observability (PII-access audit)
- [x] Infra dependency

## Test cases

| # | Case | Type | Expected | Actual | Pass | Evidence |
|---|------|------|----------|--------|------|----------|
| API-01..06 | `/me` admin/support/owner/none/malformed; `/overview` no token | Auth | 200 own session; 401 otherwise | ✅ 200/200/200/401/401/401 | ✅ | [api.md](./test-results/api.md) |
| API-10..13 | overview admin/support/non-platform; snapshot freshness | API | 200 / 403; `stale`,`generatedAt` | ✅ 200/200/403; `stale:false`, fresh `generatedAt` | ✅ | api.md |
| API-20..29 | hotels list/detail/filters/validation/masking | API | 200 + `meta`; 400/404 as appropriate | ✅ all as expected (limit=500→400, bogus→400, unknown query→400, unknown id→404, bad uuid→400) | ✅ | api.md |
| API-30..38 | users list/detail PII masking (admin vs support) | Security | admin raw, support masked | ✅ `te•••@…`/`•••67`/`•••` vs raw | ✅ | api.md |
| **API-33** | `users?role=<role>` | API | 200, filtered | ❌ **500 `Unknown column 'roles.role_id'`** | ❌ | api.md, server log |
| API-40..44 | audit list/filters/non-platform | API | 200 newest-first; 403 | ✅ | ✅ | api.md |
| API-50..60 | finance overview + 4 lists, filters, masking | API | 200 + `meta`; 400 on bad currency | ✅ (currency=usd→USD; US→400) | ✅ | api.md |
| API-70..73 | pagination validation, defaults, unknown route | API | 400 / default 20 / 404 | ✅ | ✅ | api.md |
| API-72 | rate limit | Infra | 3×200 then 429 | ✅ 429 `Too many monitoring requests…` | ✅ | api.md |
| **UI-UX1** | console errors | UI | none | ❌ 3× Keycloak `parseCallbackUrl` | ❌ | [ui.md](./test-results/ui.md) |
| UI-01..14 | login, admin/support/owner, overview, hotels, users, finance, audit, masking, nav | UI | render correctly | ✅ all (owner → `/403`) | ✅ | ui.md |
| DATA-O1 | snapshot counts == live DB | Data | exact | ✅ hotels 12600, users 83, bookings 441740 (after recompute) | ✅ | api.md |
| DATA-O2 | recompute replaces, not appends | Data | constant rows | ✅ 10 → 10 | ✅ | api.md |
| DATA-A1 | PII read audited for admin, not support | Observability | audit row | ✅ 37 `platform.pii.read` rows; support reads add none | ✅ | api.md |
| SEC-1..7 | token+permission on every route; support read-only; internal token rejected; legacy route gone; no primary-table aggregation on read path | Security | as stated | ✅ (snapshot-only read path; `/internal/superadmin` → 404) | ✅ | api.md |
| REG-01..10 | cross-hotel admin IDOR (path-hotel fix) | Security | 403 cross, 200 same | ✅ all | ✅ | api.md |
| **API-26** | hotel detail `owner` | API | owner present | ⚠️ always `null` (list path works) | ⚠️ | api.md |

## Verdict

- **Status:** 🟡 Partial
- **Open findings:** S1 _0_ · S2 _1_ · S3 _2_ · S4 _1_ — see [`review.md`](./review.md)

## Files

- [`review.md`](./review.md) — findings & verdict detail
- [`improvements.md`](./improvements.md) — remediation work
- [`test-results/`](./test-results/) — API matrix + UI evidence
