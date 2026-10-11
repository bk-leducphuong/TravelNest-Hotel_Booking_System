# Phase 1 — Feature Review Folders

> Index for [`TEST-REVIEW-PLAN.md`](./TEST-REVIEW-PLAN.md). One folder per feature (A–Z).
>
> **Implementation:** [`IMPLEMENTATION-PLAN.md`](./IMPLEMENTATION-PLAN.md) — the prioritized plan to
> fix the recorded findings (WP0–WP7, milestones M1–M5).
> Each folder: `README.md` (scope + test cases), `review.md` (findings/verdict), `improvements.md` (remediation), `test-results/` (raw evidence).

| ID | Feature | Tier | Status | S1 | S2 | S3 | S4 |
|----|---------|------|--------|----|----|----|----|
| [A](./A-public-discovery/) | Public Discovery & Content | 2 | 🟡 Partial | | | 3 | 0 |
| [B](./B-search/) | Search | 2 | 🟡 Partial | | | 1 | 0 |
| [C](./C-hotel-details-rooms/) | Hotel Details, Rooms & Policies | 2 | 🟡 Partial | | | 1 | 0 |
| [D](./D-authentication-session/) | Authentication & Session | 0 | 🟡 Partial | | | 1 | 2 |
| [E](./E-account-profile/) | Account & Profile | 0 | 🟡 Partial | | | | 1 |
| [F](./F-favorites-saved-hotels/) | Favorites / Saved Hotels | 2 | ✅ Ready | | | | |
| [G](./G-holds/) | Holds | 1 | ✅ Ready | | | | |
| [H](./H-bookings-guest/) | Bookings (Guest) | 1 | 🟡 Partial | | | 1 | 0 |
| [I](./I-payments-guest-webhook/) | Payments (Guest) & Stripe Webhook | 1 | 🟡 Partial | | 2 | | |
| [J](./J-reviews-guest/) | Reviews (Guest) | 2 | ✅ Ready | | | | |
| [K](./K-notifications-realtime/) | Notifications & Realtime | 2 | 🟡 Partial | | | | 1 |
| [L](./L-media-images/) | Media / Images | 4 | 🟡 Partial | | | | 2 |
| [M](./M-onboarding-become-a-host/) | Onboarding / Become a Host | 4 | 🟡 Partial | | | | 1 |
| [N](./N-analytics-guest/) | Analytics (Guest) | 4 | ✅ Ready | | | | |
| [O](./O-admin-auth-session-rbac/) | Admin Auth, Session & RBAC | 0 | 🟡 Partial | | | | 1 |
| [P](./P-admin-dashboard/) | Admin Dashboard | 3 | ✅ Ready | | | | |
| [Q](./Q-admin-properties-catalog/) | Admin Properties / Catalog | 3 | ✅ Ready | | | | |
| [R](./R-admin-inventory-availability/) | Admin Inventory / Availability | 1 | 🟡 Partial | | | | 1 |
| [S](./S-admin-bookings/) | Admin Bookings | 1 | ✅ Ready | | | | |
| [T](./T-admin-payments-refunds/) | Admin Payments & Refunds | 1 | ✅ Ready | | | | |
| [U](./U-admin-payouts-stripe-connect/) | Admin Payouts & Stripe Connect | 1 | 🟡 Partial | | | 1 | |
| [V](./V-admin-reviews-moderation/) | Admin Reviews & Moderation | 3 | 🟡 Partial | | | | 1 |
| [W](./W-internal-superadmin-api/) | Internal Superadmin API | 0 | ⬜ | | | | |
| [X](./X-search-infrastructure/) | Search Infrastructure | 5 | ⬜ | | | | |
| [Y](./Y-microservices-eventing/) | Microservices & Eventing | 5 | ⬜ | | | | |
| [Z](./Z-platform-infra-ops/) | Platform, Infra & Ops | 0 | ⬜ | | | | |

> Tier = execution order from plan §7 (0 = foundations, 1 = money/inventory, 2 = guest core, 3 = admin core, 4 = content/support, 5 = platform services).

## Coverage notes

- **Admin UI (Playwright) coverage is partial.** Features **O** and **P** were driven in the admin
  client browser (as guest, then as owner). **Q, R, S, T** were reviewed **API-only** — the admin
  UI pages were **not** exercised; each of those folders' `improvements.md` has a
  **"⚠️ Test-coverage gap (admin UI not exercised)"** section with the pages to re-run.
- **I (Payments guest + Stripe webhook)** is **🟡 Partial — unblocked & fully verified** (Stripe CLI
  available on 2026-10-11). The webhook round-trip was exercised; **2 S2 endpoint bugs found & fixed**
  (I-F1 lookup-by-booking 500, I-F2 lookup-by-transaction 403), and the **in-browser payment element
  (I-UI-01) was driven end-to-end** (card → Pay → `/book/complete`; booking `confirmed`, payment
  `succeeded`). See [`I-payments-guest-webhook/`](./I-payments-guest-webhook/).
- **M4 regression (K-F5) fixed**: the JWKS change made `verifyJwt` async, breaking every
  authenticated WebSocket namespace until the socket middleware was given its missing `await`.
  Surfaced during the feature-I UI run.
- **Systemic security pattern** (cross-hotel IDOR on entity-scoped admin routes): **✅ FIXED in
  M1** — the shared `requireEntityInHotel` guard now closes **R-F1, S-F1, T-F1, U-F1, V-F1**.
  See [`IMPLEMENTATION-PLAN.md`](./IMPLEMENTATION-PLAN.md#progress).
- **Systemic client drift** (legacy `/api/<x>` calls that 404 in H, J, M): **✅ FIXED in M3** —
  cancellation, review submission and partner onboarding now use the `services/*` layer
  (`/api/v1`).
- **Systemic contract issues**: broken `any.custom` validation message (B/C/E/G) — **✅ FIXED in
  M1**; inconsistent response envelopes (A/C/D/L/M) — **✅ unified additively in M6** (`success:true`
  injected for `/api/v1` bodies that only carried `data`; auth failures now also carry
  `error:{code,message}`) — no client changes required.
- **M1 also fixed**: JSON 404 for bad params (A-F2/C-F4), malformed-JWT message (D-F1),
  timezone/Sequelize 500→400 (Q-F1), non-image upload 500→400 (L-F1), guest admin-catalog access
  (O-F1).
