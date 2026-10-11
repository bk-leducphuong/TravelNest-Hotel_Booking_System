# E — Account & Profile: Browser evidence (Playwright)

Authenticated session (**Test User**, `test@travelnest.com`) against `http://localhost:5173`,
2026-10-09. Screenshots: `account-settings-home.png`, `personal-information.png`,
`security-settings.png`, `password-410.png`, `avatar-modal.png`, `account-settings-mobile.png`.

## Pages & flow

| Check | Result |
|---|---|
| `/account-settings` (guarded) | ✅ loads; 6 sections — Personal details (Available), Customisation preferences (Soon), Security settings (Available), Privacy and data (Soon), Email preferences (Soon), Payment methods (Soon) |
| `/account-settings/personal-information` | ✅ renders name, email, phone, DOB, address, country, nationality, gender + "Change" (avatar) / "Edit" buttons |
| Stored `<b>probe</b>` address | ✅ shown as **literal text** (`12 E2E Street <b>probe</b>`) — escaped, no XSS |
| Edit phone → `+84901234567` → Save | ✅ "Phone number updated"; persists (API `phone_number = '+84901234567'`) |
| Edit phone → `abc` → Save | ✅ not persisted (API value unchanged) |
| Avatar "Change" | ✅ opens modal "Update avatar" with `input[type=file]` |
| Responsive 390 px | ✅ no horizontal overflow |

## E-F1 — password flow (browser-confirmed)

`/account-settings/security-settings` → "Change password" opens a 3-field form whose copy
says "Change your password using `PATCH /api/v1/user/password`."

Submitting it:

```
[PATCH] http://localhost:3000/api/v1/user/password => [410] Gone
toast: "Password changes are now managed through Keycloak account management."
```

So the form can never succeed — it is wired to a removed endpoint.

## Console

3–4 errors per load: 3× Keycloak `parseCallbackUrl` "Invalid URL" (see D-F2/A-F9) plus the
`410` request above. Page title remains `Vite App`.
