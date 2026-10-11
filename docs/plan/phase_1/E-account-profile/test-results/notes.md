# E — Account & Profile: Supplementary evidence

Captured 2026-10-09 against the local stack (API :3000, client :5173).

## Mass-assignment probe (blocked)

```
PATCH /user
{ "roles":["admin"], "id":"hack", "isAdmin":true, "emailVerified":true, "password_hash":"x" }
-> 400 {"error":{"code":"VALIDATION_ERROR","fields":{"":"At least one field must be provided for update"}}}
```

Follow-up `GET /user` → `"roles":["user"]` (unchanged). Unknown keys stripped, no privilege
escalation.

## Stored field accepts HTML (no sanitisation)

```
PATCH /user { "address": "12 E2E Street <b>probe</b>" } -> 200
GET  /user -> "address":"12 E2E Street <b>probe</b>"   (raw)
```

Rendering: `PersonalInformation.vue` uses `{{ profile.address || 'Add your address' }}` and
there is **no `v-html`** anywhere in `components/user` or `views/account-settings` → safe.

## E-F1 — stale password UI

- `client/src/services/user.service.js`: `updatePassword() => http.patch('/user/password', …)`.
- `client/src/components/user/account-settings/SecuritySettings.vue`: renders a "Change
  password" form and calls `UserService.updatePassword(this.passwordForm)`; header copy says
  "Change your password using `PATCH /api/v1/user/password`".
- Backend: `PATCH /user/password` → **410 PASSWORD_FLOW_REMOVED** ("Password changes are now
  managed through Keycloak account management.").

So the form always fails with "Unable to update password".
