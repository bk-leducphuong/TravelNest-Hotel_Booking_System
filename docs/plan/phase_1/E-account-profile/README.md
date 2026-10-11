# E — Account & Profile

> Part of [Phase 1 — Feature Test & Production-Readiness Review](../TEST-REVIEW-PLAN.md).
> **Status:** 🟡 Partial · **Owner:** _TBD_ · **Tier:** 0

## Scope

- **Entry points:** `GET /user`, `PATCH /user`, `PATCH /user/password`, `PATCH /user/avatar`. UI: `AccountSettings`, `SettingDetails` (Personal information, Security, Preferences…).
- **Risk focus:** mass-assignment, stored-XSS via profile fields.
- **Environment:** local dev stack (API :3000, client :5173), 2026-10-09.

## Review axes

- [x] UI/UX
- [x] API/contract
- [x] Security/authz
- [x] Data integrity
- [x] Error/edge
- [ ] Performance _(single-user reads; N/A)_
- [x] Observability
- [ ] Infra dependency

_(Rubric: see [plan §3](../TEST-REVIEW-PLAN.md#3-review-rubric--the-axes-applied-to-every-feature).)_

## Test cases

| # | Case | Type | Expected | Actual | Pass | Evidence |
|---|------|------|----------|--------|------|----------|
| E-API-01 | GET /user (auth) | API | 200 profile | 200 | ✅ | [api.md](./test-results/api.md) |
| E-API-02 | GET /user no token | Security | 401 | 401 | ✅ | api.md |
| E-API-03/03b | PATCH address + readback | API | persistence | 200, stored | ✅ | api.md |
| E-API-03c | PATCH name | API | 200 | 200 | ✅ | api.md |
| E-API-04 | PATCH empty body | API | 400 | 400 (**empty field key**) | ⚠️ | api.md |
| E-API-05 | PATCH invalid email | API | 400 | 400 | ✅ | api.md |
| E-API-06 | PATCH invalid phone | API | 400 | 400 | ✅ | api.md |
| E-API-07 | PATCH invalid gender | API | 400 | 400 | ✅ | api.md |
| E-API-08 | **mass-assignment** (`roles`,`id`,`isAdmin`,`password_hash`) | Security | rejected | 400; roles stayed `["user"]` | ✅ | api.md |
| E-API-09 | PATCH /user/password | API | (delegated) | **410 PASSWORD_FLOW_REMOVED** | ✅ | api.md |
| E-API-10 | PATCH /user/avatar no file | API | 400 | 400 | ✅ | api.md |
| E-API-11 | PATCH /user no token | Security | 401 | 401 | ✅ | api.md |
| E-SEC-01 | stored-XSS: address `<b>probe</b>` | Security | escaped on render | stored raw, rendered escaped | ✅ | notes.md |
| E-UI-01 | Security "Change password" form | UI/UX | works or hidden | **form submits → `PATCH /user/password` 410 Gone**, error toast | ❌ | [browser notes](./test-results/browser.md) |
| E-UI-02 | account-settings home renders (auth guard) | UI/UX | 6 sections | 6 sections, 2 available | ✅ | browser.md |
| E-UI-03 | personal details fields render; stored `<b>probe</b>` | UI/UX/Sec | escaped | rendered as **literal text** (escaped) | ✅ | browser.md |
| E-UI-04 | edit phone via UI | UI/UX | saves | saved `+84901234567`, persists | ✅ | browser.md |
| E-UI-05 | invalid phone via UI | UI/UX | rejected | not persisted (API unchanged) | ✅ | browser.md |
| E-UI-06 | avatar modal | UI/UX | opens w/ file input | opens, file input present | ✅ | browser.md |
| E-UI-07 | responsive 390px | UI/UX | no overflow | none | ✅ | browser.md |

## Verdict

- **Status:** 🟡 Partial — the API is well-guarded (auth, validation, no mass-assignment,
  no XSS), but the **Security settings UI is stale**: it still offers a password-change
  form bound to the removed endpoint (E-F1). Not production-ready until that UI is updated.
- **Open findings:** S1 _0_ · S2 _0_ · S3 _2_ · S4 _2_
- Detail: [review.md](./review.md) · Remediation: [improvements.md](./improvements.md)

## Files

- [`review.md`](./review.md) — findings & verdict detail
- [`improvements.md`](./improvements.md) — remediation work
- [`test-results/`](./test-results/) — raw evidence (api.md, notes.md, browser.md, screenshots)
