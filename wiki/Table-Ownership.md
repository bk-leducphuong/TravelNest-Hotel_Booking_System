# Table Ownership

Every MySQL table has exactly **one owning service** that may write to it. Other
services read it through the owner's API or events, or (transitionally) with a
read-only grant. This page exists because Node and the Go services previously
connected with the same database user and wrote each other's tables — a
distributed monolith with no schema contract.

## Current ownership

| Tables | Owner | Notes |
|---|---|---|
| `users`, `auth_accounts`, `roles`, `permissions`, `user_roles`, `role_permissions`, `hotels`, `hotel_users`, `rooms`, `room_inventory`, `amenities`, `hotel_amenities`, `room_amenities`, `hotel_policies`, `hotel_cancellation_rules`, `nearby_places`, `cities`, `countries`, `destinations`, `hotel_search_snapshots` | **Node (core)** | Catalog, identity, property |
| `bookings`, `booking_rooms`, `holds`, `hold_rooms` | **Node (booking)** | |
| `transactions`, `payments`, `invoices`, `refunds`, `ledger_accounts`, `ledger_entries`, `payouts`, `payout_items`, `connected_payment_accounts`, `idempotency_keys`, `webhook_event_logs` | **Node (payment)** | |
| `reviews`, `review_replies`, `review_media`, `review_helpful_votes`, `hotel_rating_summaries` | **Node (review module)** | `modules/review` |
| `audit_logs` | **Node (platform)** | `platform/audit` |
| `images`, `image_variants` | **media (Go)** → target | currently also written by Node |
| `notifications` | **notification (Go)** → target | currently also written by Node |
| `saved_hotels`, `viewed_hotels` | **Node (core)** | |

## Known shared writes (the debt)

The Go services connect as the application user and write tables they do not own:

| Service | Writes | Should become |
|---|---|---|
| media | `images`, `image_variants` | Own them (Node delegates via API/events) |
| media | `users.profile_picture_url`, `rooms.image_urls` | Node updates these in response to a media event |
| notification | `notifications` | Own it (Node publishes notification events) |
| Node | `images`, `image_variants`, `notifications` | Delegate to media/notification |

Until those are resolved, the least-privilege grants below intentionally allow the
cross-writes so nothing breaks. Tighten them as each cross-write is removed.

## Least-privilege accounts

Created by the MySQL init script (`02-app-users.sh`, fresh clusters) or
`deploy/k8s/infra/mysql/app-users.sql` (existing clusters). They reuse the
application password, so no extra secret is required.

| User | Writable | Read-only |
|---|---|---|
| `travelnest_media` | `images`, `image_variants`, `users`, `rooms` (update only) | `users`, `rooms` |
| `travelnest_notification` | `notifications` | `hotels`, `hotel_users`, `user_roles`, `roles`, `users` |

## Cutover checklist

1. Ensure the accounts exist (fresh init, or run `app-users.sql` on an existing
   cluster).
2. Point each service's `MYSQL_DSN` at its account (e.g.
   `travelnest_media:${DB_PASSWORD}@tcp(mysql:3306)/travelnest?parseTime=true`)
   in the service's `secret.template.yaml`, then re-seal secrets
   (`deploy/scripts/secrets/seal-local-secrets.sh` / `seal-prod-secrets.sh`).
3. Restart the service and confirm it still works.
4. Remove the cross-write and tighten the grant to the owned tables only.

## Rules for new tables

- A table is owned by exactly one bounded context (module) or Go service.
- Only the owner runs migrations for it (`server/infra/database/migrations`).
- Cross-context access goes through the owner's public API (`<module>/index.js`)
  or domain events — never a direct query into another owner's tables.
- A service that only reads another owner's table gets a `SELECT`-only grant and
  a documented reason; reads are not a substitute for an API contract.
