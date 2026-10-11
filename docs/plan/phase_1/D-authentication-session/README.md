# D — Authentication & Session

> Part of [Phase 1 — Feature Test & Production-Readiness Review](../TEST-REVIEW-PLAN.md).
> **Status:** 🟡 Partial · **Owner:** _TBD_ · **Tier:** 0

## Scope

- **Entry points:** `GET /auth/session`; Keycloak bearer verification (`middlewares/auth.middleware.js`, `utils/jwt.util.js`); client Keycloak (`keycloak.service.js`), route guards, hosted login/register/forgot-password. Auth is delegated to Keycloak (`travelnest` realm, `travelnest-web` client, PKCE S256).
- **Risk focus:** auth failure returning 401 not 500, redirect loops, JWT key management (R1).
- **Environment:** local dev stack (API :3000, client :5173, Keycloak :8080), 2026-10-09.

## Review axes

- [x] UI/UX
- [x] API/contract
- [x] Security/authz
- [x] Data integrity
- [x] Error/edge
- [x] Performance
- [x] Observability
- [ ] Infra dependency _(JWKS not used — R1)_

_(Rubric: see [plan §3](../TEST-REVIEW-PLAN.md#3-review-rubric--the-axes-applied-to-every-feature).)_

## Test cases

| # | Case | Type | Expected | Actual | Pass | Evidence |
|---|------|------|----------|--------|------|----------|
| D-API-01 | session no token | API | 200 isAuth false | 200 false | ✅ | [api.md](./test-results/api.md) |
| D-API-02 | session valid token | API | 200 isAuth true + roles | 200 true | ✅ | api.md |
| D-API-03 | session malformed token | Security | 200 false (no 500) | 200 false | ✅ | api.md |
| D-API-04 | session tampered signature | Security | 200 false | 200 false | ✅ | api.md |
| D-API-05 | session alg=none forged | Security | 200 false | 200 false | ✅ | api.md |
| D-API-06 | protected no token | Security | 401 | 401 | ✅ | api.md |
| D-API-07 | protected valid token | API | 200 | 200 | ✅ | api.md |
| D-API-08 | protected malformed | Security | 401 | 401 (**raw JSON err msg**) | ⚠️ | api.md |
| D-API-09 | protected tampered sig | Security | 401 | 401 "Invalid JWT signature" | ✅ | api.md |
| D-API-10 | alg=none forged | Security | 401 | 401 "Unsupported JWT algorithm: none" | ✅ | api.md |
| D-API-11 | HS256 forged | Security | 401 | 401 "Unsupported JWT algorithm: HS256" | ✅ | api.md |
| D-API-12/12b | Bearer prefix missing / empty | Security | 401 | 401 | ✅ | api.md |
| D-API-13 | ROPC wrong password | Security | 401 | 401 invalid_grant | ✅ | api.md |
| D-API-14 | unknown client | Security | 401 | 401 invalid_client | ✅ | api.md |
| D-UI-01 | guard: unauth → guarded route | Security/UX | redirect to login | → Keycloak, redirect_uri preserved, PKCE S256 | ✅ | notes.md |
| D-UI-02 | login page + forgot password + register | UI/UX | hosted pages | present | ✅ | notes.md |
| D-UI-03 | console cleanliness | UI/UX | clean | **3× Keycloak parseCallbackUrl errors** | ❌ | notes.md |
| D-SEC-01 | JWT alg confusion | Security | reject | rejected | ✅ | api.md |
| D-SEC-02 | expired token | Security | 401 JWT expired | 401 "JWT expired" (observed B-API-06) | ✅ | api.md |

## Verdict

- **Status:** 🟡 Partial — the security fundamentals are strong (alg-confusion rejected,
  signature/iss/aud/exp enforced, optional-auth never 500s, guard + PKCE correct). Remaining
  work is production hardening: **JWKS/key rotation (R1)**, a raw-error leak (D-F1), and the
  persistent Keycloak console error (D-F2).
- **Open findings:** S1 _0_ · S2 _0_ · S3 _3_ · S4 _2_
- Detail: [review.md](./review.md) · Remediation: [improvements.md](./improvements.md)

## Files

- [`review.md`](./review.md) — findings & verdict detail
- [`improvements.md`](./improvements.md) — remediation work
- [`test-results/`](./test-results/) — raw evidence (api.md, notes.md)
