# V — Admin Reviews & Moderation: Review

Date: 2026-10-09 · Environment: local dev stack, owner/support seeded.
Evidence: [`test-results/api.md`](./test-results/api.md), [`test-results/notes.md`](./test-results/notes.md).

## Findings

| # | Sev | Axis | Symptom | Root cause | Evidence | Status |
|---|-----|------|---------|-----------|----------|--------|
| V-F1 | **S2** | Security/authz | **Cross-hotel IDOR on `/admin/reviews/:reviewId`.** An owner of hotel A (own `X-Hotel-Id`) can (a) `GET` hotel B's review → **200**, and (b) `POST /:reviewId/reply` → **201** (a reply was actually created on a foreign review). | Route has no `hotelId`; `requireHotelPermission(REVIEW_READ/REPLY)` resolves the hotel from `X-Hotel-Id` only; `getReview`/`replyToReview` take only the review id — no check that the review's `hotel_id` matches. | api.md V-IDOR-READ/REPLY | ✅ Fixed (M1) |
| V-F2 | S4 | Security/design | The **hotel `owner` role bypasses all hotel-scoped permission checks** — e.g. an owner can set review status (moderate) despite the `owner` role not holding `review.moderate` (`V-API-04` → 200, expected 403). | `hasHotelPermission = hotelRoleName === ROLES.OWNER \|\| permissionNames.some(...)` in `requirePermission`. | api.md V-API-04 | ✅ Fixed (M1) |

## Positives

- **Reply lifecycle works**: create `201`, update `200`, delete `200`.
- **Role gating for non-owners**: `support_agent` (has `review.moderate`) moderates → `200`;
  owners/managers/staff lack `review.moderate` in their role definition.
- Reads: reviews list `200`, summary `200`, get `200`.
- **Foreign hotel `summary` → `403`** (path/query hotel context is checked).
- No token → `401`.

## Notes / limitations

- The owner-override (V-F2) may be **intended** (owner = superuser for their hotel); flagged for a
  product decision. It means permission-level gating is not enforced for owners.
- Cleanup: the IDOR-created reply on the foreign review was deleted; the own review was left
  `published` with no reply.
- **UI not tested** — see `improvements.md`.

## Verdict

**🟡 Partial (S2).** Moderation and reply flows are well-built, but the review routes repeat the
cross-tenant IDOR (V-F1, same root as R-F1/S-F1/T-F1/U-F1). Fix with the shared hotel-ownership
guard; decide on V-F2 (owner override).

---

> **Update — 2026-10-11 (M1–M6):** every finding recorded above is now **✅ fixed** (see the Status column) or **by-design**. The verdict above reflects the **original** review; the current index marks this feature **✅ Ready**.
