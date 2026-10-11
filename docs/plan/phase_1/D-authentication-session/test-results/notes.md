# D — Authentication & Session: Supplementary evidence

Captured 2026-10-09 against the local stack (Keycloak :8080, API :3000, client :5173).

## Crafted tokens (rejected as expected)

| Token | Protected route result |
|---|---|
| no token | 401 `Authentication required.` |
| `not.a.jwt` (malformed) | 401 `Unexpected token '�', "��" is not valid JSON` ← **D-F1 leak** |
| valid token, tampered signature | 401 `Invalid JWT signature` |
| forged `alg=none` (admin claims) | 401 `Unsupported JWT algorithm: none` |
| forged `HS256` | 401 `Unsupported JWT algorithm: HS256` |
| `Authorization: <token>` (no Bearer) | 401 `Authentication required.` |
| `Authorization: Bearer ` (empty) | 401 `Authentication required.` |

Session endpoint (`/auth/session`, optional auth) returned `200` for all of the above with
`isAuthenticated:false`; valid token → `isAuthenticated:true` with the user + roles.

## Route guard

`GET http://localhost:5173/account-settings` (unauthenticated) →
`http://localhost:8080/realms/travelnest/protocol/openid-connect/auth`
with `redirect_uri=http://localhost:5173/account-settings`, `response_type=code`,
`code_challenge_method=S256`. Hosted page shows Sign In / Forgot Password? / Register.

## Keycloak console error (D-F2)

`TypeError: Failed to construct 'URL': Invalid URL`
`  at Keycloak.parseCallbackUrl_fn (keycloak-js.js:1138)`
`  at Keycloak.parseCallback_fn (keycloak-js.js:1104)`
`  at messageCallback (keycloak-js.js:1087)` — **×3 per page load**.

`client/public/silent-check-sso.html` (served clean, `publicDir: 'assets'`):

```html
<!doctype html><html lang="en"><body><script>
  parent.postMessage(location.href, location.origin)
</script></body></html>
```

Config: `VITE_KEYCLOAK_SILENT_CHECK_SSO_REDIRECT_URI=http://localhost:5173/silent-check-sso.html`,
`checkLoginIframe: false`, `onLoad: 'check-sso'`.
