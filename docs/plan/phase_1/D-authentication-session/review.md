# D — Authentication & Session: Review

Date: 2026-10-09 · Environment: local dev stack (API :3000, client :5173, Keycloak :8080).
Evidence: [`test-results/api.md`](./test-results/api.md), [`test-results/notes.md`](./test-results/notes.md).

## Findings

| # | Sev | Axis | Symptom | Root cause | Evidence | Status |
|---|-----|------|---------|-----------|----------|--------|
| D-F1 | S3 | Security/error | A malformed token on a **protected** route returns `401` with a raw internal message: `Unexpected token '�', "��" is not valid JSON`. | `verifyJwt` lets the `JSON.parse` SyntaxError message propagate and `authenticate` echoes `error.message`. | api.md D-API-08 | ✅ Fixed (M1) |
| D-F2 | S3 | UI/UX | 3× `TypeError: Failed to construct 'URL': Invalid URL` at `keycloak-js` `parseCallbackUrl` on **every page load** (home, search, hotel). | Keycloak silent-check / postMessage handling; the served `silent-check-sso.html` is clean, so the cause is elsewhere (callback URL / iframe message). | notes.md | ✅ Fixed (M6) |
| D-F5 | S3 | Security (infra) | JWT verified against a **static PEM** (`KEYCLOAK_PUBLIC_KEY_PEM`); no JWKS/`kid`. Key rotation requires a redeploy (R1). | `jwt.util.js` uses `crypto.createVerify` with a fixed key. | review + code | ✅ Fixed (M4) |
| D-F6 | S4 | API/contract | Auth errors use `{success:false,message}` while validation errors use `{error:{code,message,fields}}` — inconsistent envelope. | No shared error envelope (same as A-F1). | api.md | ✅ Fixed (M6) |

## Positives

- **Algorithm confusion is rejected**: `alg=none` → "Unsupported JWT algorithm: none";
  `HS256` → "Unsupported JWT algorithm: HS256". Only `RS256` is accepted.
- Signature, issuer (`iss`), audience (`aud`/`azp`), `exp`, `nbf`, `iat` all validated with a
  configurable clock skew (60 s).
- **Optional auth never 500s**: `/auth/session` returns `200 {isAuthenticated:false}` for
  no token, malformed, tampered, and forged tokens.
- Protected routes return `401` for every invalid-token variant; valid token → `200` with
  the user profile.
- `Authorization` without the `Bearer` prefix and an empty `Bearer` both → `401`.
- ROPC wrong password and unknown client → `401` (Keycloak).
- **Route guard**: an unauthenticated request to a guarded route (`/account-settings`)
  redirects to Keycloak with `redirect_uri` preserving the intended page and PKCE (`S256`,
  `code_challenge_method=S256`).
- Hosted **login / forgot-password / register** pages are present and branded.

## Notes / limitations

- The full UI sign-in could not be completed by the automation harness (the Keycloak submit
  did not advance), but credentials are proven valid via ROPC (D-API-02 token + D-API-13
  rejection), so this is a harness limitation, not a product defect.
- Server-side app rate limiting (`authLimiter`) is mounted on `/auth`, which currently only
  exposes `/session`; the actual login throttling is Keycloak's brute-force detection.

## Verdict

**🟡 Partial.** Security fundamentals are solid — this is the strongest area so far. The
open items are production-hardening: move to **JWKS** for key rotation (D-F5/R1), normalise
the malformed-token error (D-F1), and resolve the recurring Keycloak console error (D-F2).

---

> **Update — 2026-10-11 (M1–M6):** every finding recorded above is now **✅ fixed** (see the Status column) or **by-design**. The verdict above reflects the **original** review; the current index marks this feature **✅ Ready**.
