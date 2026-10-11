# L — Media / Images: Review

Date: 2026-10-09 · Environment: local dev stack (API :3000, media :8082, MinIO).
Evidence: [`test-results/api.md`](./test-results/api.md), [`test-results/browser.md`](./test-results/browser.md).

## Findings

| # | Sev | Axis | Symptom | Root cause | Evidence | Status |
|---|-----|------|---------|-----------|----------|--------|
| L-F1 | S3 | Error/edge | Uploading a **non-image** file returns `500 INTERNAL_ERROR` instead of `400`. | `config/multer.config.js` `fileFilter` throws a plain `Error('Not an image…')`; it is not converted to a 4xx by the error handler. | api.md L-API-07 | ✅ Fixed (M1) |
| L-F2 | S4 | API/contract | Image endpoints use a third envelope `{success, message, data}` — different from the catalog `{data}` and error `{error:{code,…}}` shapes used elsewhere. | Module-local response style (same class as A-F1). | api.md | ✅ Fixed (M6) |
| L-F3 | S4 | API/contract | An **invalid entity type** (`/images/foo/…`) returns `403` (authz) rather than the service's `400 INVALID_ENTITY_TYPE`. The service validation is unreachable for non-admins. | `authorizeImageEntityWrite` runs before entity-type validation. | api.md L-API-08 | ✅ Fixed (M6) |

## Positives

- **Authz is strong and complete** (the historical "anyone can upload/delete any image" bug is fixed):
  - upload: no auth `401`; hotel image as guest `403`; **self avatar `201`**; **another user's avatar `403`**.
  - delete: no auth `401`; **unknown image `404`** (no existence leak); own image `200`.
  - set-primary: no auth `401`; non-owner `403`.
  - `authorizeImageEntityWrite`/`authorizeImageDelete` resolve the owning hotel for `hotel`/`room`/`review`, allow platform admins, restrict catalog imagery to admins, and restrict avatars to self.
- **Reads** are public and return pre-signed URLs plus processed variants (`medium_webp`, etc.).
- No file → `400 NO_FILE_PROVIDED`; multer enforces image mimetype + 5 MB limit.
- Media service healthy; uploads are queued (`status: "processing"`) and processed asynchronously.

## Notes / limitations

- The **avatar upload UI** (file select → save) could **not be driven** in the automation harness:
  the file chooser was not detectable and `setInputFiles` timed out on the Element Plus input.
  The modal itself opens with a `input[type=file]` (verified), and the upload **API** is verified
  (`L-API-05` `201`). This is a harness limitation, not a confirmed product defect.

## Verdict

**🟡 Partial.** Media is in good shape — authz is comprehensive and correct, reads work, and the
storage pipeline is wired. Only a non-image upload returning `500` (L-F1) plus two cosmetic
contract issues remain. No S1/S2.

---

> **Update — 2026-10-11 (M1–M6):** every finding recorded above is now **✅ fixed** (see the Status column) or **by-design**. The verdict above reflects the **original** review; the current index marks this feature **✅ Ready**.
