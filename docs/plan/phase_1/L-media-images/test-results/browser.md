# L — Media / Images: Browser evidence & notes

Authenticated as **Test User**, 2026-10-09.

## L-UI-01 — image display ✅

Hotel images render with pre-signed URLs and variants (verified in feature C: 3 hotel images,
room images). `GET /images/hotel/:id` returns `count:3` with `medium_webp` variants.

## L-UI-02 — avatar upload modal ⚠️ harness limitation

- `/account-settings/personal-information` → "Change" opens the modal `.modal-overlay` with
  `.modal-card input[type=file]` (verified: `overlay:1, fileInput:1`).
- **Could not complete the file-select → save flow in the harness**:
  - `browser_file_upload` → `"can only be used when there is related modal state present"`.
  - `setInputFiles('/tmp/opencode/L/ok.png')` set the file but `avatarFile` never registered
    (`preview:0`, save button still disabled); a later attempt **timed out (30s)** on the
    Element Plus input.
- The upload **API** is fully verified: `POST /images/user_avatar/<self>` → `201` (`processing`),
  then `DELETE /images/<id>` → `200`.

So: modal present ✅, end-to-end UI upload **not verified** (harness), API ✅.

## Authz (from api.md)

```
POST   /images/hotel/<id>          (no token)      -> 401
POST   /images/hotel/<id>          (guest)         -> 403
POST   /images/user_avatar/<self>  (guest)         -> 201
POST   /images/user_avatar/<other> (guest)         -> 403
DELETE /images/<id>                (no token)      -> 401
DELETE /images/<unknown>           (guest)         -> 404
DELETE /images/<own avatar>        (guest)         -> 200
```
