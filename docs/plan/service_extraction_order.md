# Service Extraction Order

## 1. Analytics Service

Extract first.

Owns:

- Search logs
- Hotel view events
- Trending hotel IDs
- Trending destination IDs
- Search demand summaries
- User search summaries

Why first:

- Current behavior is already async through BullMQ workers.
- Data is append-heavy and stored in MongoDB.
- Low coupling with checkout/payment.
- Excellent first Go + NATS learning target.

Replaces:

- `server/workers/searchLog.worker.js`
- `server/workers/hotelViewEvent.worker.js`
- Mongo analytics repository reads over time

## 2. Media Service

Owns:

- Image upload metadata
- MinIO object access
- Image variant generation
- `/api/v1/images`

Why second:

- Mostly standalone.
- CPU/resource-heavy image processing benefits from independent scaling.
- Failure does not need to block booking/payment.

Migration approach:

- Keep Node upload route initially.
- Move processing worker first.
- Later move image APIs to Go and proxy from Node.

## 3. Notification Service

Owns:

- Notifications
- Email jobs
- Email templates
- Notification read APIs
- Later, realtime notification delivery

Why third:

- Side-effect oriented.
- Naturally event-driven.
- Can consume booking/payment/review events without owning those domains.

Replaces:

- `server/workers/notification.worker.js`
- `server/workers/email.worker.js`
- Eventually `/api/v1/notifications`

## 4. Search Service

Owns:

- `/api/v1/search`
- Elasticsearch search queries
- Hotel search snapshots/projections
- Recent searches
- Search indexing consumers

Why fourth:

- Search can tolerate eventual consistency.
- There is already snapshot/indexing logic.
- More complex than analytics because it needs MySQL availability data.

Migration approach:

- Move indexing/projection consumers first.
- Keep Node search route initially.
- Then proxy `/api/v1/search` to Go.

## 5. Catalog Service

Owns:

- Hotels
- Rooms
- Amenities
- Policies
- Nearby places
- Property/admin hotel management

Why fifth:

- Search and media will already have been separated.
- Catalog events can feed search projections.

Publishes:

- `hotel.created.v1`
- `hotel.updated.v1`
- `room.updated.v1`
- `amenity.changed.v1`

## 6. Booking/Inventory Service

Owns:

- Holds
- Room inventory
- Bookings
- Booking rooms
- Booking expiry
- Booking cancellation

Why later:

- Current code performs coupled transactional writes across holds, inventory, bookings, transactions, idempotency, and ledger.
- Needs a deliberate consistency model.

Publishes:

- `hold.created.v1`
- `hold.expired.v1`
- `booking.created.v1`
- `booking.confirmed.v1`
- `booking.cancelled.v1`
- `booking.expired.v1`

## 7. Payment/Ledger Service

Owns:

- Stripe payment intents
- Webhooks
- Payments
- Transactions
- Refunds
- Payouts
- Ledger accounts and entries

Why after booking:

- Payment currently mutates booking state directly.
- It should consume booking events and publish payment results after the booking domain boundary exists.

Publishes:

- `payment.succeeded.v1`
- `payment.failed.v1`
- `refund.created.v1`
- `payout.created.v1`

## 8. Identity/User Service

Owns:

- Users
- Auth accounts
- Sessions/JWT
- Roles
- Permissions
- Saved hotels
- Viewed hotels, if not fully analytics-owned

Why last:

- Auth touches almost every route.
- Extracting it early increases coordination overhead.

