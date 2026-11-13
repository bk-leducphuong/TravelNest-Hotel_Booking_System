# Database Schema

TravelNest uses multiple data stores. Here's an overview of each.

---

## MySQL (Primary — Sequelize ORM)

47+ models powering the core application.

### User & Auth

```
User
├── id (PK)
├── email
├── password_hash
├── full_name
├── phone
├── avatar_url
├── locale
├── is_verified
└── timestamps

AuthAccount          Role
├── id (PK)          ├── id (PK)
├── user_id (FK)     └── name
├── provider
└── provider_id

UserRole             RolePermission     Permission
├── user_id (FK)     ├── role_id (FK)   ├── id (PK)
└── role_id (FK)     └── perm_id (FK)   └── name
```

### Hotel & Property

```
Hotel
├── id (PK)
├── name
├── description
├── city_id (FK)
├── country_id (FK)
├── location (lat/lng)
├── star_rating
├── status
├── is_active
└── timestamps

Room                           RoomInventory
├── id (PK)                    ├── id (PK)
├── hotel_id (FK)              ├── room_id (FK)
├── name                       ├── date
├── max_guests                 ├── total_rooms
├── price_per_night            ├── booked_rooms
├── currency                   └── price_override
└── is_active

HotelAmenity          HotelPolicy           HotelCancellationRule
├── hotel_id (FK)     ├── hotel_id (FK)      ├── hotel_id (FK)
└── amenity_id (FK)   └── policy_text        ├── days_before
                                             └── refund_percent
```

### Booking & Payments

```
Booking
├── id (PK)
├── user_id (FK)
├── hotel_id (FK)
├── check_in / check_out
├── status (pending/confirmed/cancelled/completed)
├── total_amount
├── currency
└── timestamps

BookingRoom          Payment
├── booking_id (FK)  ├── id (PK)
├── room_id (FK)     ├── booking_id (FK)
├── price             ├── amount
└── quantity          ├── stripe_payment_intent_id
                      ├── status
                      └── timestamps

Refund               Payout               Transaction
├── payment_id (FK)  ├── user_id (FK)     ├── source_id
├── amount           ├── amount           ├── source_type
└── reason           └── status           ├── amount
                                          └── type

LedgerAccount        LedgerEntry
├── user_id (FK)     ├── account_id (FK)
├── balance           ├── amount
└── currency          └── balance_after
```

### Reviews

```
Review               ReviewMedia          ReviewReply
├── id (PK)          ├── id (PK)          ├── id (PK)
├── user_id (FK)     ├── review_id (FK)   ├── review_id (FK)
├── hotel_id (FK)    └── image_url        ├── user_id (FK)
├── rating                                     └── content
├── title
├── content
└── timestamps
```

### Geography

```
Country              City                 Destination
├── id (PK)          ├── id (PK)          ├── id (PK)
├── code             ├── country_id (FK)  ├── city_id (FK)
├── name             ├── name             ├── type
└── phone_code       ├── lat/lng          └── is_active
                     └── is_active
```

---

## Analytics Events (MySQL)

Owned by the Go analytics service. Rows are written from NATS events and
expired by a batched purge loop (730 days for searches, 90 days for views).

```
analytics_search_logs
├── search_id (PK, uuid)
├── user_id (optional)
├── destination_id / destination_type
├── latitude / longitude / radius (optional)
├── search_time
├── adults / children / rooms
├── check_in_date / check_out_date / nights
├── is_deleted
└── created_at / updated_at

analytics_hotel_view_events
├── event_id (PK, uuid)
├── hotel_id
├── user_id (optional)
├── session_id
├── viewed_at
├── ip_address / user_agent
└── created_at / updated_at
```

---

## Hotel Search (MySQL)

Search uses MySQL only; there is no search index to keep in sync.

```
hotel_search_snapshots (read model, one row per hotel)
├── hotel_id (PK, FK hotels.id)
├── hotel_name
├── hotel_name_normalized   -- lowercase, accent-stripped
├── hotel_name_compact      -- alphanumeric-only key
├── city_id / country_id    -- candidate filtering
├── latitude / longitude    -- bounding box + haversine
├── avg_rating / review_count
├── hotel_class
├── amenity_codes (JSON)    -- all-selected-amenities filter
├── has_free_cancellation
├── primary_image_url
├── total_bookings / view_count
└── status
```

Live availability and pricing come from the authoritative `room_inventory`
(`room_id`, `date`, `total_rooms`, `booked_rooms`, `held_rooms`, `status`,
`price_per_night`, `currency`) with `MIN(total_rooms - booked_rooms - held_rooms)`
over the requested nights. See `docs/architecture/search-mysql.md`.

---

## ClickHouse (Analytics Warehouse)

```
search_logs (ClickHouse)
├── event_date (Date)
├── event_timestamp (DateTime)
├── query (String)
├── user_id (Nullable)
├── session_id (String)
├── result_count (UInt32)
└── filters (String - JSON)
```
