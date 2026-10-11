# Phase 1 — Feature Review Folders

> Index for [`TEST-REVIEW-PLAN.md`](./TEST-REVIEW-PLAN.md). One folder per feature (A–Z).
>
> **Implementation:** [`IMPLEMENTATION-PLAN.md`](./IMPLEMENTATION-PLAN.md) — the prioritized plan to
> fix the recorded findings (WP0–WP7, milestones M1–M5).
> Each folder: `README.md` (scope + test cases), `review.md` (findings/verdict), `improvements.md` (remediation), `test-results/` (raw evidence).

| ID | Feature | Tier | Status | S1 | S2 | S3 | S4 |
|----|---------|------|--------|----|----|----|----|
| [A](./A-public-discovery/) | Public Discovery & Content | 2 | 🟡 Partial | | | 7 | 2 |
| [B](./B-search/) | Search | 2 | 🟡 Partial | | 2 | 3 | 3 |
| [C](./C-hotel-details-rooms/) | Hotel Details, Rooms & Policies | 2 | 🟡 Partial | | 1 | 6 | 1 |
| [D](./D-authentication-session/) | Authentication & Session | 0 | 🟡 Partial | | | 3 | 2 |
| [E](./E-account-profile/) | Account & Profile | 0 | 🟡 Partial | | | 2 | 2 |
| [F](./F-favorites-saved-hotels/) | Favorites / Saved Hotels | 2 | 🟡 Partial | | | 4 | 1 |
| [G](./G-holds/) | Holds | 1 | 🟡 Partial | | | 1 | 0 |
| [H](./H-bookings-guest/) | Bookings (Guest) | 1 | 🟡 Partial | | 2 | 3 | 1 |
| [I](./I-payments-guest-webhook/) | Payments (Guest) & Stripe Webhook | 1 | ⏸ Blocked | | | | |
| [J](./J-reviews-guest/) | Reviews (Guest) | 2 | 🟡 Partial | | 2 | 2 | 0 |
| [K](./K-notifications-realtime/) | Notifications & Realtime | 2 | 🟡 Partial | | | 2 | 2 |
| [L](./L-media-images/) | Media / Images | 4 | 🟡 Partial | | | 1 | 2 |
| [M](./M-onboarding-become-a-host/) | Onboarding / Become a Host | 4 | 🟡 Partial | | 2 | 1 | 1 |
| [N](./N-analytics-guest/) | Analytics (Guest) | 4 | ✅ Ready | | | | |
| [O](./O-admin-auth-session-rbac/) | Admin Auth, Session & RBAC | 0 | 🟡 Partial | | | 1 | 2 |
| [P](./P-admin-dashboard/) | Admin Dashboard | 3 | 🟡 Partial | | | 1 | 0 |
| [Q](./Q-admin-properties-catalog/) | Admin Properties / Catalog | 3 | 🟡 Partial | | | 2 | 0 |
| [R](./R-admin-inventory-availability/) | Admin Inventory / Availability | 1 | 🟡 Partial | | 1 | | 1 |
| [S](./S-admin-bookings/) | Admin Bookings | 1 | 🟡 Partial | | 1 | | |
| [T](./T-admin-payments-refunds/) | Admin Payments & Refunds | 1 | 🟡 Partial | | 1 | 1 | |
| [U](./U-admin-payouts-stripe-connect/) | Admin Payouts & Stripe Connect | 1 | 🟡 Partial | | 1 | 1 | |
| [V](./V-admin-reviews-moderation/) | Admin Reviews & Moderation | 3 | 🟡 Partial | | 1 | | 1 |
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
- **I (Payments guest + Stripe webhook)** is **⏸ Blocked** — Stripe CLI unavailable (see
  `I-payments-guest-webhook/BLOCKED.md`).
- **Systemic security pattern**: admin routes scoped by entity id (`/rooms/:roomId`,
  `/bookings/:bookingId`, `/payments/transactions/:transactionId`) authorize against the
  `X-Hotel-Id` header only and do **not** verify the entity belongs to that hotel →
  cross-hotel IDOR in **R-F1**, **S-F1**, **T-F1**. Recommend one shared ownership guard.
- **Systemic client drift**: legacy `/api/<x>` calls that now 404 (H, J, M).
- **Systemic contract issues**: inconsistent response envelopes (A/B/C/D/L/M/T) and the broken
  `any.custom` validation message (B/C/E/G).
