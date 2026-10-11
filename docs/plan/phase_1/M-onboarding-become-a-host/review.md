# M — Onboarding / Become a Host: Review

Date: 2026-10-09 · Environment: local dev stack, authenticated as Test User.
Evidence: [`test-results/api.md`](./test-results/api.md), [`test-results/browser.md`](./test-results/browser.md).

## Findings

| # | Sev | Axis | Symptom | Root cause | Evidence | Status |
|---|-----|------|---------|-----------|----------|--------|
| M-F1 | **S2** | Data/API | A **valid** join submission returns `500 INTERNAL_ERROR`. Server log: `Incorrect time value: '14:00-22:00' for column 'check_in_time' at row 1`. | `join.service.js` passes `checkInTime: "${checkInFrom}-${checkInTo}"` (a range) to `catalogModule.upsertHotel`, but `hotels.check_in_time` is a MySQL `TIME` (single value). | api.md M-API-06, server error.log | Open |
| M-F2 | **S2** | UI/UX | The wizard's final step posts to **legacy `/api/join`** and **`/api/join/upload-photos`** (no `/v1`) → **404**. The working `/api/v1/join` is never called. | `Form6.vue` uses raw `axios` + `VITE_SERVER_HOST}/api/join…` (post-refactor drift). | browser.md | Open |
| M-F3 | S3 | Security/UX | `/join` requires authentication (`router.use(authenticate)`), but "Become a host" is a **public** page; an anonymous prospective host gets `401` and cannot apply, and the page doesn't prompt login. | Public onboarding gated behind auth. | api.md M-API-01, browser.md | Open |
| M-F4 | S4 | API/contract | Response envelope `{data}` (join) vs `{success,message,data}` (media) vs `{error}` — inconsistent (same class as A-F1). | No shared envelope. | api.md | Open |

## Positives

- **Validation is solid**: no token → `401` (both routes); invalid body → `400` with detailed
  per-field errors; photos missing ids → `400`; photos with no files → `400 NO_FILES_UPLOADED`.
- The **UI renders**: the public `/join` landing (VI) and the 6-step `/join/become-a-host` wizard.
- `/join` is behind the write rate limiter.
- Photo upload caps at 30 files and reuses the media pipeline.

## Notes

- No hotel was created (the happy path 500s before any write), so there was nothing to clean up.

## Verdict

**🟡 Partial (S2 blockers).** The onboarding flow **cannot be completed**: the client calls a dead
endpoint (M-F2) and the backend crashes on a valid payload (M-F1). Auth/validation are fine, but
the core outcome — a new host registering a property — does not work. M-F1 + M-F2 must be fixed
before production; M-F3 needs a product decision (require login first, or make the flow public).
