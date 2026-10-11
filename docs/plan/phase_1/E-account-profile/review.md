# E — Account & Profile: Review

Date: 2026-10-09 · Environment: local dev stack (API :3000, client :5173).
Evidence: [`test-results/api.md`](./test-results/api.md), [`test-results/notes.md`](./test-results/notes.md).

## Findings

| # | Sev | Axis | Symptom | Root cause | Evidence | Status |
|---|-----|------|---------|-----------|----------|--------|
| E-F1 | S3 | UI/UX | **Security settings is stale.** `SecuritySettings.vue` shows a "Change password" form that calls `UserService.updatePassword()` → `PATCH /api/v1/user/password`, which now returns **410 PASSWORD_FLOW_REMOVED**. **Browser-confirmed**: submitting the form fires the request and the toast shows "Password changes are now managed through Keycloak account management." The copy even instructs users to use `PATCH /api/v1/user/password`. | Client not updated after the backend password flow was moved to Keycloak account management. | browser.md, code | Open |
| E-F2 | S3 | Data hygiene | `address` (and other free-text profile fields) accept and store arbitrary HTML (e.g. `<b>probe</b>`), returned raw in JSON. Rendered safely today (Vue interpolation), but there is no server-side sanitisation. | No input sanitisation/normalisation on profile text. | api.md E-API-03b, notes.md | Open |
| E-F3 | S4 | API/contract | `PATCH /user` with only unknown fields returns a **misleading** message: `"At least one field must be provided for update"` even though fields were sent (they were stripped). | Unknown keys are stripped, then `.min(1)` fires. | api.md E-API-08 | Open |
| E-F4 | S4 | API/contract | Empty-body `PATCH /user` error uses an empty field key `""`. | `object.min` message attached to the object (same as B-F4). | api.md E-API-04 | Open |

## Positives

- **Mass-assignment is blocked**: sending `roles`, `id`, `isAdmin`, `emailVerified`,
  `password_hash` → `400`, and the user's roles stayed `["user"]`.
- Auth required on all `/user` routes; no IDOR (self-service only, no user id in the path).
- Validation works for email, phone (E.164 pattern), gender enum; avatar requires a file.
- Profile updates persist and read back correctly.
- **No stored XSS**: profile fields are rendered with `{{ }}` (escaped); no `v-html` in the
  account-settings components.
- `PATCH /user/password` correctly returns `410` (flow delegated to Keycloak).
- **UI (browser-verified)**: the account-settings home and personal-details pages render for
  the signed-in user; editing the phone number saves and persists; an invalid value does not
  persist; the avatar upload modal opens with a file input; no horizontal overflow at 390 px.

## Verdict

**🟡 Partial.** The account API is well-guarded. The one substantive defect is **E-F1** — a
user-facing "change password" flow wired to a removed endpoint, guaranteed to fail. E-F2–E-F4
are hygiene/contract nits. Low risk overall, but E-F1 must be fixed (or the form hidden and
replaced with a link to Keycloak) before production.

> Browser verification (Playwright, authenticated as **Test User**): account-settings home
> renders (6 sections), personal-details fields render, the phone edit saves and persists,
> invalid input does not persist, the avatar modal opens, and the security password form
> returns 410. See [browser.md](./test-results/browser.md).
