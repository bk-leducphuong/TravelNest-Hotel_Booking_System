# TravelNest — Deployment Test Report

**Date:** 2026-10-13
**Environment:** Hetzner VPS + k3s (`travelnest` namespace, Argo CD GitOps), Cloudflare-tunnelled public endpoints
**Method:** `curl` API testing + Playwright manual browser testing + pod log inspection over SSH (`hetzner` → `sudo kubectl -n travelnest`)
**Tester:** automated agent

---

## Verdict

**NOT production-ready.** Two P0 breakages make the platform unusable beyond anonymous browsing:

1. **Every authenticated API request fails** (Keycloak JWT signature verification is broken), so no user can stay logged in on the guest app and no authenticated feature works.
2. **The Admin console and Superadmin console both render a `500 Internal Server Error` page** to every visitor.

The previously stated final state — *"Auth: token → api accepted ✅"* — is **not reproducible**. A valid Keycloak token is rejected with `INVALID_TOKEN`.

Public/anonymous browsing (homepage, search, hotel detail, images) works.

---

## Severity summary

| # | Severity | Area | Issue |
|---|----------|------|-------|
| F1 | 🔴 P0 | API / Auth | All bearer-token requests rejected (`INVALID_TOKEN`); login never persists |
| F2 | 🔴 P0 | Admin + Superadmin | Both consoles return HTTP 500 page to unauthenticated users |
| F3 | 🟠 P1 | API / Infra | Intermittent Cloudflare `502` / "CORS Network Error" on trending endpoints |
| F4 | 🟠 P1 | API / Infra | API pod crash-loops when MySQL restarts |
| F5 | 🟡 P2 | Keycloak | OIDC discovery advertises `http://` endpoints |
| F6 | 🟡 P2 | Guest UI | Hotel detail: reviewer avatars render with empty `src` (3 broken images) |
| F7 | 🟡 P2 | Guest UI | Hotel detail: review score label hardcoded to "Tuyệt hảo" regardless of score |
| F8 | 🟡 P2 | Guest UI | `silent-check-sso.html` sandbox allows scripts + same-origin (escape warning) |
| F9 | 🔵 P3 | Guest UI | Hotel detail: amenity label truncated ("tân 24 giờ") |
| F10 | 🔵 P3 | Guest UI | Search box shows raw slug ("ha-noi") instead of pretty city name |
| F11 | 🔵 P3 | API | `/api-docs.json` + `/api-docs` publicly exposed |

---

## 🔴 F1 — All authenticated API requests fail (Keycloak token verification broken)

### Symptom
After a successful Keycloak login the user is **never** shown as logged in. Any request that carries the access token is rejected:

```
GET https://api.deployserver.work/api/v1/user
Authorization: Bearer <valid Keycloak access token>
→ 401
{"success":false,
 "message":"error:1E08010C:DECODER routines::unsupported",
 "error":{"code":"INVALID_TOKEN","message":"error:1E08010C:DECODER routines::unsupported"}}
```

`GET /api/v1/auth/session` returns **HTTP 200 but anonymously**, which is why the front-end silently treats the user as logged out:

```json
{"success":true,"data":{"session":{"id":null,"user":null,"context":null,"authProvider":"keycloak"},"isAuthenticated":false}}
```

The OAuth callback also leaves the `#code=…` fragment in the URL (keycloak-js consumed the code, but the follow-up `/auth/session` call fails, so the client resets to anonymous).

### Root cause (confirmed)
`error:1E08010C:DECODER routines::unsupported` is an OpenSSL error raised while verifying the JWT signature against an **invalid public key**.

The API resolves the signing key from `KEYCLOAK_ISSUER`-derived JWKS, and **falls back to a static PEM on failure**. In production the JWKS fetch is blocked and the fallback PEM is a placeholder:

```
# pod log — travelnest/api
{"level":40,"error":"JWKS request failed: HTTP 403",
 "msg":"JWKS fetch failed; falling back to static PEM"}
{"level":40,"error":"error:1E08010C:DECODER routines::unsupported",
 "msg":"Optional authentication failed"}
```

* `KEYCLOAK_PUBLIC_KEY_PEM` is literally the placeholder **`unused`** (`deploy/k8s/.env.prod:64`, sops secret too small to hold a real PEM).
* The JWKS URL (`https://keycloak.deployserver.work/realms/travelnest/protocol/openid-connect/certs`) is **challenged by Cloudflare** for requests coming from the server's IP:

```
$ ssh hetzner 'curl -sS -D - -o /dev/null https://keycloak.deployserver.work/realms/travelnest/protocol/openid-connect/certs'
HTTP/2 403
cf-mitigated: challenge
server: cloudflare
…body: "<title>Just a moment...</title>"   # Cloudflare JS challenge
```

The same URL returns **200 from a different source IP** (test machine), so the block is IP/reputation-specific to the server egress.

### Proof of mechanism (reproduced locally)
```js
// verify with the real JWKS key
verifier.verify(createPublicKey({key: jwk, format:'jwk'}), sig)  → true
// verify with the placeholder fallback
createPublicKey("-----BEGIN PUBLIC KEY-----\nunused\n-----END PUBLIC KEY-----")
  → ERR_OSSL_UNSUPPORTED  error:1E08010C:DECODER routines::unsupported
```

### Impact
* Guest app: signed-in state, bookings, saved hotels, notifications, account, reviews, booking/checkout — **all unusable**.
* Admin console & Superadmin console APIs — unusable (in addition to F2).
* Only anonymous read paths work.

### Fix (options, best first)
1. **Serve JWKS from inside the cluster** — set `KEYCLOAK_JWKS_URI` to the in-cluster Keycloak service, bypassing Cloudflare entirely, e.g.
   `http://keycloak.travelnest.svc.cluster.local:8080/realms/travelnest/protocol/openid-connect/certs`.
   `getJwksUri()` in `server/utils/jwt.util.js` already prefers `KEYCLOAK_JWKS_URI` when set.
2. Or add a **Cloudflare WAF skip rule** for `/realms/*/protocol/openid-connect/certs` (and the whole `/realms/*/protocol/*` path).
3. Or set a **real** `KEYCLOAK_PUBLIC_KEY_PEM` (fragile — breaks on key rotation).
4. Fail fast at boot: validate `KEYCLOAK_PUBLIC_KEY_PEM`/JWKS reachability instead of returning a confusing crypto error at request time.

---

## 🔴 F2 — Admin & Superadmin consoles return HTTP 500

### Symptom
Both consoles render a Nuxt error page instead of the login screen:

```
https://admin.deployserver.work/       → 500  "Internal Server Error
https://superadmin.deployserver.work/  → 500   Timeout when waiting for 3rd party check iframe message."
```

Reproduced consistently across reloads.

### Evidence
```
[nuxt] error caught during app initialization
  ia: Timeout when waiting for 3rd party check iframe message.
```
The rejection comes from `keycloak-js` `init({ onLoad: "check-sso", silentCheckSsoRedirectUri })` (`admin-client/services/keycloak.ts:94`). The hidden `silent-check-sso.html` iframe never posts its result back within the timeout (the embedded Keycloak `prompt=none` request is third-party and/or Cloudflare-challenged), and the app does not catch the rejection, so Nuxt renders its 500 error page.

Both `silent-check-sso.html` files exist and return 200, so the problem is the iframe/cookie/challenge path, not a missing asset.

### Impact
Admin and Superadmin are **completely inaccessible** — no login form is ever shown.

### Fix
* Catch/recover from the `init()` rejection (treat timeout as "not authenticated") instead of letting it bubble into Nuxt's error boundary.
* Avoid `silentCheckSso` for these apps (or make it non-fatal / configurable).
* Ensure the Keycloak redirect URI / SSO frame isn't blocked by Cloudflare for the app origins.

---

## 🟠 F3 — Intermittent `502` / "CORS Network Error" on trending endpoints

### Symptom
`/hotels/trending` and `/search/destinations/trending` intermittently fail. In the browser this surfaces as a misleading CORS error:

```
Access to XMLHttpRequest at 'https://api.deployserver.work/api/v1/hotels/trending?limit=10&days=30'
from origin 'https://deployserver.work' has been blocked by CORS policy:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
AxiosError: Network Error
```

### Root cause
The endpoint depends on the Go **analytics** service. When it is slow/unavailable the API waits ~2s (`ANALYTICS_SERVICE_TIMEOUT_MS=2000`) and returns a 502; around the same time Cloudflare returns **its own 502 page**, which has no CORS headers:

```
$ curl -sD - -H 'Origin: https://deployserver.work' \
    'https://api.deployserver.work/api/v1/hotels/trending?limit=10&days=30'
HTTP/2 502
content-type: text/plain; charset=UTF-8
server: cloudflare
# NO access-control-allow-origin
error code: 502
```

API-side log from the same period:
```
"errorCode":"ANALYTICS_SERVICE_UNAVAILABLE","statusCode":502,
"msg":"GET /api/v1/hotels/trending?limit=10&days=30 502 - 2006ms"
```

Because the `502` lacks `Access-Control-Allow-Origin`, the browser reports it to the app as a CORS/network error, hiding the real cause.

### Impact
Homepage "Trending Hotels" and trending destinations intermittently fail; the front-end cannot distinguish this from a CORS misconfiguration.

### Fix
* Speed up / harden the analytics call (circuit breaker, cache trending results).
* Keep origin responses under the Cloudflare/tunnel timeout; return a fast, CORS-complete error from the API rather than letting CF time out.
* Front-end: show a friendly "temporarily unavailable" state and retry.

---

## 🟠 F4 — API pod crash-loops when MySQL restarts

### Symptom
`api` pods show repeated restarts (3–4 within ~22h). Around the MySQL restart the API exit was:

```
{"level":50,"error":{"name":"SequelizeConnectionRefusedError",
 "parent":{"code":"ECONNREFUSED","address":"10.43.102.149","port":3306}},
 "msg":"Failed to start server"}
```

### Root cause
`createApp()` (`server/app.js`) calls `await db.sequelize.authenticate()` with no retry/backoff. If MySQL is briefly unavailable, the process **exits** (`Failed to start server`).

### Impact
Availability gap on every MySQL restart/maintenance window; cascading restarts of dependent pods.

### Fix
Add connection retry/backoff (and/or a startup probe that tolerates DB warm-up) before exiting.

---

## 🟡 F5 — OIDC discovery advertises `http://` endpoints

Keycloak's discovery document mixes schemes:

```
issuer:                  https://keycloak.deployserver.work/realms/travelnest
authorization_endpoint:  https://…/protocol/openid-connect/auth
token_endpoint:          http://…/protocol/openid-connect/token      ← http
jwks_uri:                http://…/protocol/openid-connect/certs      ← http
userinfo_endpoint:       http://…     introspection_endpoint: http://
end_session_endpoint:    https://…
```

Keycloak runs with `KC_HOSTNAME_STRICT=false` + `KC_HOSTNAME_BACKCHANNEL_DYNAMIC=true`. Standards-compliant clients that follow the discovery document will be sent to insecure `http://` URLs. Sets `KC_HOSTNAME_STRICT=true` / correct `X-Forwarded-Proto` (or pin `KC_HOSTNAME_URL`).

---

## 🟡 F6 — Hotel detail: reviewer avatars render with empty `src`

On `/hotels/<id>` the "Đánh giá của khách" section renders **3 broken images**. The elements have `src=""`, which the browser resolves to the page URL (HTML, not an image):

```html
<img data-v-488472ed src="" alt="">   <!-- reviewer avatar -->
```

**Cause:** `client/src/views/HotelDetails.vue:919` and `:1010` bind `:src="review.profile_picture_url"` with no fallback; the field is null/empty for these reviews.
**Fix:** `v-if` guard or a default avatar fallback.

---

## 🟡 F7 — Hotel detail: review score label hardcoded to "Tuyệt hảo"

A hotel with **overall rating 6.27** is displayed as:

```
6.27 Tuyệt hảo - 10 đánh giá
```

"Tuyệt hảo" (Excellent) is hardcoded in `client/src/views/HotelDetails.vue:820` and `:979`, so it is shown regardless of the actual score (6.27 should map to "Dễ chịu"/"Tốt", not "Tuyệt hảo"). Replace with a score→label mapping.

---

## 🟡 F8 — `silent-check-sso.html` iframe sandbox warning

Console warning on every guest page load:

```
An iframe which has both allow-scripts and allow-same-origin for its sandbox
attribute can escape its sandboxing.
@ https://deployserver.work/silent-check-sso.html#error=login_required…
```

Low exploitability (own origin asset) but a genuine hardening item; the same pattern is what feeds F2.

---

## 🔵 F9 — Amenity label truncated on hotel detail

The amenity list renders `tân 24 giờ` instead of `Lễ tân 24 giờ` (CSS overflow/clipping). Cosmetic.

---

## 🔵 F10 — Search box shows raw slug

Navigating to `/search?location=ha-noi…` renders the literal slug **`ha-noi`** in the "Where are you going?" box instead of the resolved city name ("Ha Noi"). Cosmetic/UX.

---

## 🔵 F11 — API docs publicly exposed

`https://api.deployserver.work/api-docs.json` and `/api-docs` return 200 with no auth. Consider gating them in production.

---

## ✅ What works

| Check | Result |
|-------|--------|
| `deployserver.work` / `admin.` / `superadmin.` / `api.` reachable | 200 (admin/superadmin render 500 app page) |
| `keycloak.deployserver.work` reachable | 302 (login), issuer = `…/realms/travelnest` |
| API `/health`, `/health/live`, `/health/ready` | 200 — MySQL, Redis, MinIO, Elasticsearch, analytics all healthy |
| `GET /hotels/trending`, `/search/destinations/trending` | 200 (intermittent 502 — F3) |
| `GET /search/hotels?city=…&checkIn&checkOut&adults` | 200 — e.g. "Ha Noi" → 200 hotels with prices/ratings |
| `GET /search/destinations/autocomplete?query=ha` | 200 — returns cities |
| Hotel detail `/hotels/:id` | 200, images render, rooms/rates/reviews shown |
| Images CDN `storage.deployserver.work` | 200, 0 broken images in gallery/search |
| Auth guard (no token) | `/user`, `/bookings`, `/notifications`, `/admin/*`, `/superadmin/*` → 401 ✅ |
| Input validation | Missing/invalid params → 400 with field-level errors ✅ |
| Malformed bearer token | 401 `Malformed JWT` ✅ |
| SQL-ish search input | handled, no error ✅ |
| Security headers | HSTS, `X-Content-Type-Options`, `X-Frame-Options`, Referrer-Policy present ✅ |
| Rate limiting | `ratelimit-limit: 300;w=900` active ✅ |
| Keycloak login itself | succeeds; token returned (`aud/azp = travelnest-web`) ✅ |

Guests can browse and search anonymously. Everything requiring a login is blocked by **F1**.

---

## Appendix — key reproduction commands

```bash
# F1 — token rejected
curl -s -H "Authorization: Bearer <keycloak-access-token>" \
     https://api.deployserver.work/api/v1/user
# → 401 {"error":{"code":"INVALID_TOKEN", ... "DECODER routines::unsupported"}}

# F1 — JWKS challenged from the server
ssh hetzner 'curl -sS -D - -o /dev/null \
  https://keycloak.deployserver.work/realms/travelnest/protocol/openid-connect/certs'
# → HTTP/2 403, cf-mitigated: challenge

# F1 — pod logs
ssh hetzner 'sudo kubectl -n travelnest logs deploy/api --since=1h | grep -i JWKS'

# F3 — Cloudflare 502 without CORS
curl -sD - -o /dev/null -H 'Origin: https://deployserver.work' \
  'https://api.deployserver.work/api/v1/hotels/trending?limit=10&days=30'
# → HTTP/2 502, server: cloudflare, no access-control-allow-origin

# F4 — MySQL outage crash
ssh hetzner 'sudo kubectl -n travelnest logs deploy/api --previous | tail -20'

# F5 — discovery schemes
curl -s https://keycloak.deployserver.work/realms/travelnest/.well-known/openid-configuration \
  | grep -E 'token_endpoint|jwks_uri|userinfo_endpoint|issuer'
```

**Config references**
- `server/utils/jwt.util.js` — `getJwksUri()`, `resolvePublicKey()`, `verifyJwt()`
- `deploy/k8s/apps/api/overlays/prod/configmap.yaml` — `KEYCLOAK_ISSUER`, `KEYCLOAK_AUDIENCE`
- `deploy/k8s/.env.prod:64` — `KEYCLOAK_PUBLIC_KEY_PEM=unused`
- `client/src/services/keycloak.service.js`, `admin-client/services/keycloak.ts` — `initializeKeycloak()`
