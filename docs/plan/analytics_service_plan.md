# Go Analytics Service Plan

## Goal

Implement the first Go microservice for TravelNest analytics using NATS JetStream and MongoDB.

The service should replace the current BullMQ analytics workers first, then gradually take over analytics read APIs.

## Current Node Behavior To Replace

Workers:

- `server/workers/searchLog.worker.js`
- `server/workers/hotelViewEvent.worker.js`

Mongo repositories:

- `server/repositories/mongodb/search_log.repository.js`
- `server/repositories/mongodb/hotel_view_event.repository.js`
- `server/repositories/mongodb/hotel_daily_views.repository.js`

Mongo collections:

- `search_logs`
- `hotel_view_events`

## Service Directory

```text
services/analytics/
  cmd/api/main.go
  internal/config/
  internal/events/
  internal/http/
  internal/model/
  internal/mongo/
  internal/service/
  Dockerfile
  go.mod
```

## Runtime Dependencies

- Go
- NATS JetStream
- MongoDB

Environment variables:

```text
HTTP_ADDR=:8081
NATS_URL=nats://nats:4222
NATS_STREAM=TRAVELNEST_ANALYTICS
MONGODB_URI=mongodb://mongodb:27017
MONGODB_DATABASE=travelnest_analytics
LOG_LEVEL=info
```

## NATS Subjects

Initial subjects:

```text
analytics.search.performed.v1
analytics.hotel.viewed.v1
```

Initial stream:

```text
TRAVELNEST_ANALYTICS
subjects:
  analytics.>
```

Durable consumers:

```text
analytics-search-writer
analytics-hotel-view-writer
```

## Search Event Payload

```json
{
  "eventId": "uuid",
  "occurredAt": "2026-06-01T10:30:00Z",
  "userId": "user-id-or-null",
  "destinationId": "destination-id-or-null",
  "destinationType": "city",
  "checkInDate": "2026-07-01",
  "checkOutDate": "2026-07-04",
  "adults": 2,
  "children": 0,
  "rooms": 1
}
```

Write behavior:

- Store `eventId` as `searchId`.
- Parse check-in/check-out dates.
- Calculate `nights`.
- Set `isDeleted=false`.
- Set `searchTime=occurredAt`.
- Duplicate `searchId` means already processed and should be acked.

## Hotel View Event Payload

```json
{
  "eventId": "uuid",
  "occurredAt": "2026-06-01T10:30:00Z",
  "hotelId": "hotel-id",
  "userId": "user-id-or-null",
  "sessionId": "session-id",
  "ipAddress": "127.0.0.1",
  "userAgent": "browser"
}
```

Write behavior:

- Store `eventId` as `eventId`.
- Store `hotelId`, `userId`, `sessionId`, `ipAddress`, `userAgent`.
- Set `viewedAt=occurredAt`.
- Duplicate `eventId` means already processed and should be acked.

## Mongo Models

Search log document:

```go
type SearchLog struct {
    SearchID        string     `bson:"searchId"`
    UserID          *string    `bson:"userId"`
    DestinationID   *string    `bson:"destinationId"`
    DestinationType string     `bson:"destinationType"`
    SearchTime      time.Time  `bson:"searchTime"`
    Adults          int        `bson:"adults"`
    Children        int        `bson:"children"`
    Rooms           int        `bson:"rooms"`
    CheckInDate     *time.Time `bson:"checkInDate"`
    CheckOutDate    *time.Time `bson:"checkOutDate"`
    Nights          int        `bson:"nights"`
    IsDeleted       bool       `bson:"isDeleted"`
    CreatedAt       time.Time  `bson:"createdAt"`
    UpdatedAt       time.Time  `bson:"updatedAt"`
}
```

Hotel view event document:

```go
type HotelViewEvent struct {
    EventID   string    `bson:"eventId"`
    HotelID   string    `bson:"hotelId"`
    UserID    *string   `bson:"userId"`
    SessionID string    `bson:"sessionId"`
    ViewedAt  time.Time `bson:"viewedAt"`
    IPAddress string    `bson:"ipAddress"`
    UserAgent string    `bson:"userAgent"`
    CreatedAt time.Time `bson:"createdAt"`
    UpdatedAt time.Time `bson:"updatedAt"`
}
```

## Mongo Indexes

Create indexes on startup.

`search_logs`:

- unique `searchId`
- `userId`, `isDeleted`, `searchTime desc`
- `destinationId`, `destinationType`, `isDeleted`, `searchTime desc`
- `checkInDate`, `destinationId`, `destinationType`, `isDeleted`
- TTL on `searchTime`, 730 days

`hotel_view_events`:

- unique `eventId`
- `hotelId`, `viewedAt desc`
- TTL on `viewedAt`, 90 days

## HTTP API

Initial endpoints:

```text
GET /healthz
GET /analytics/trending/hotels?limit=10&days=2
GET /analytics/trending/destinations?limit=5&days=30
GET /analytics/search/demand?nextDays=90&limit=50
GET /analytics/users/:userId/search-summary
GET /analytics/users/:userId/searches?limit=10
```

Response shape for trending hotels:

```json
[
  { "hotelId": "hotel-id", "views": 120 }
]
```

Response shape for trending destinations:

```json
[
  {
    "destinationId": "destination-id",
    "destinationType": "city",
    "searchCount": 100,
    "uniqueUsers": 25
  }
]
```

Node can enrich returned IDs with existing MySQL hotel/destination data to keep frontend responses unchanged.

## Consumer Processing Rules

Each consumer should:

- Pull messages from JetStream.
- Decode event envelope and payload.
- Validate required fields.
- Reject unsupported event versions.
- Insert the analytics document.
- Ack after successful insert.
- Ack duplicate-key errors.
- Retry temporary Mongo/NATS errors.
- Log invalid payloads with enough context.
- Send poison messages to a dead-letter subject after max delivery attempts.

## Node Integration Steps

1. Add a Node NATS publisher module.
2. Publish `analytics.search.performed.v1` when hotel search completes.
3. Publish `analytics.hotel.viewed.v1` when hotel detail is viewed.
4. Keep Redis hotel-view deduplication in Node initially.
5. Run old BullMQ workers and Go consumers together briefly for comparison.
6. Disable `searchLog.worker.js` and `hotelViewEvent.worker.js`.
7. Switch analytics reads to Go HTTP endpoints.
8. Remove old BullMQ analytics queues after stable behavior.

## Testing

Unit tests:

- Date parsing and `nights` calculation.
- Event validation.
- Mongo document mapping.
- Duplicate-key handling.

Integration tests:

- Publish search event to NATS, verify Mongo `search_logs` insert.
- Publish hotel view event to NATS, verify Mongo `hotel_view_events` insert.
- Re-publish same event, verify no duplicate document.
- Query trending hotels from inserted hotel view events.
- Query trending destinations from inserted search logs.

Manual smoke test:

- Run Node API, Go analytics service, NATS, MongoDB.
- Search hotels from frontend.
- View hotel details.
- Confirm events appear in MongoDB.
- Confirm old frontend responses still work.

