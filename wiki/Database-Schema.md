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

## MongoDB (Analytics)

```
SearchLog
├── _id
├── query
├── filters (nested)
├── result_count
├── user_id (optional)
├── session_id
├── timestamp
└── metadata

HotelViewEvent
├── _id
├── hotel_id
├── user_id (optional)
├── session_id
├── source (search/direct/referral)
└── viewed_at
```

---

## Elasticsearch (Search)

### Hotels Index

```
hotels
├── hotel_id
├── hotel_name (text + edge_ngram + completion suggest)
├── city (keyword)
├── country (keyword)
├── location (geo_point)
├── prices (nested)
├── avg_rating
├── review_count
├── amenity_codes
├── available (boolean flag per date)
├── popularity_score
└── is_active
```

### Logs Index

```
logs-*
├── timestamp
├── level
├── message
├── service
├── request_id
├── user_id
└── metadata (nested)
```

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
