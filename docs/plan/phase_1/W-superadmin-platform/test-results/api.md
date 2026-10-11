# Superadmin Platform — API evidence

_2026-10-11T08:59:33Z · base http://localhost:3000/api/v1 · executed against the local stack_

## 5.1 Auth / session

### API-01 — GET /me admin
```
GET /superadmin/me
HTTP 200
{"success":true,"data":{"user":{"id":"01a105e0-216a-789a-8133-99845b7f5a90","email":"admin@travelnest.local"},"globalRoles":["admin"],"tokenRoles":["offline_access","admin","default-roles-travelnest","uma_authorization"],"permissions":["admin.dashboard","admin.manage_hotels","admin.manage_roles","admin.manage_users","admin.system_settings","admin.view_logs","booking.cancel","booking.create","booking.manage","booking.read","booking.update","hotel.create","hotel.delete","hotel.manage_staff","hotel
```
- admin permissions: ['admin.dashboard', 'admin.manage_hotels', 'admin.manage_roles', 'admin.manage_users', 'admin.system_settings', 'admin.view_logs', 'booking.cancel', 'booking.create', 'booking.manage', 'booking.read', 'booking.update', 'hotel.create', 'hotel.delete', 'hotel.manage_staff', 'hotel.read', 'hotel.update', 'hotel.view_analytics', 'notification.read', 'notification.send', 'payment.process', 'payment.read', 'payment.refund', 'platform.audit.read', 'platform.finance.read', 'platform.hotel.read', 'platform.overview.read', 'platform.user.pii_read', 'platform.user.read', 'report.export', 'report.view', 'review.create', 'review.delete', 'review.moderate', 'review.read', 'review.reply', 'review.update', 'room.create', 'room.delete', 'room.manage_inventory', 'room.read', 'room.update', 'support.respond_tickets', 'support.view_tickets', 'support.view_user_details', 'user.delete', 'user.manage', 'user.read', 'user.update']
- admin globalRoles: ['admin']
### API-02 — GET /me support
```
GET /superadmin/me
HTTP 200
{"success":true,"data":{"user":{"id":"01a105e0-229c-72c0-89a3-ac0b18486028","email":"support@travelnest.local"},"globalRoles":["support_agent"],"tokenRoles":["support_agent","offline_access","default-roles-travelnest","uma_authorization"],"permissions":["booking.cancel","booking.read","booking.update","hotel.read","notification.read","notification.send","payment.read","payment.refund","platform.audit.read","platform.finance.read","platform.hotel.read","platform.overview.read","platform.user.read
```
- support permissions: ['booking.cancel', 'booking.read', 'booking.update', 'hotel.read', 'notification.read', 'notification.send', 'payment.read', 'payment.refund', 'platform.audit.read', 'platform.finance.read', 'platform.hotel.read', 'platform.overview.read', 'platform.user.read', 'review.moderate', 'review.read', 'room.read', 'support.respond_tickets', 'support.view_tickets', 'support.view_user_details', 'user.read']
### API-03 — GET /me non-platform (owner)
```
GET /superadmin/me
HTTP 200
{"success":true,"data":{"user":{"id":"01a105e0-231f-7c5b-9020-2ac93a35114f","email":"owner@travelnest.local"},"globalRoles":["user"],"tokenRoles":["offline_access","default-roles-travelnest","uma_authorization","user"],"permissions":["booking.cancel","booking.create","booking.read","hotel.read","notification.read","payment.read","review.create","review.read","review.update","room.read","user.read","user.update"]}}
```
### API-04 — GET /me no token
```
GET /superadmin/me
HTTP 401
{"success":false,"message":"Authentication required.","error":{"code":"AUTHENTICATION_REQUIRED","message":"Authentication required."}}
```
### API-05 — GET /overview no token
```
GET /superadmin/overview
HTTP 401
{"success":false,"message":"Authentication required.","error":{"code":"AUTHENTICATION_REQUIRED","message":"Authentication required."}}
```
### API-06 — GET /overview malformed token
```
GET /superadmin/overview
HTTP 401
{"success":false,"message":"Malformed JWT","error":{"code":"INVALID_TOKEN","message":"Malformed JWT"}}
```

## 5.2 Overview

### API-10a — overview admin
```
GET /superadmin/overview
HTTP 200
{"success":true,"data":{"hotels":{"total":12600,"byStatus":{"active":12600,"inactive":0,"pending":0,"suspended":0}},"users":{"total":83,"byStatus":{"active":66,"banned":0,"inactive":17}},"bookings":{"total":441722},"generatedAt":"2026-10-11T07:46:11.000Z","stale":false}}
```
- admin overview: {'hotels': {'total': 12600, 'byStatus': {'active': 12600, 'inactive': 0, 'pending': 0, 'suspended': 0}}, 'users': {'total': 83, 'byStatus': {'active': 66, 'banned': 0, 'inactive': 17}}, 'bookings': {'total': 441722}, 'generatedAt': '2026-10-11T07:46:11.000Z', 'stale': False}
### API-10b — overview support
```
GET /superadmin/overview
HTTP 200
{"success":true,"data":{"hotels":{"total":12600,"byStatus":{"active":12600,"inactive":0,"pending":0,"suspended":0}},"users":{"total":83,"byStatus":{"active":66,"banned":0,"inactive":17}},"bookings":{"total":441722},"generatedAt":"2026-10-11T07:46:11.000Z","stale":false}}
```
### API-11 — overview non-platform
```
GET /superadmin/overview
HTTP 403
{"success":false,"message":"Insufficient permissions.","error":{"code":"INSUFFICIENT_PERMISSIONS","message":"Insufficient permissions."}}
```

## 5.3 Hotels

### API-20 — list hotels limit=5
```
GET /superadmin/hotels?limit=5
HTTP 200
{"success":true,"data":[{"id":"01a105dc-2576-7eeb-a7dc-5dd100462759","name":"Hotel House","status":"active","hotelClass":4,"minPrice":"629.35","timezone":"America/Chicago","city":{"id":"01a105dc-0f37-7cee-b1b4-1b5bf77231e6","name":"Dong Nai"},"country":{"id":"01a105dc-0edc-7ce1-ab3c-a15746869e73","name":"Vietnam","isoCode":"VN"},"createdAt":"2026-10-04T07:23:44.000Z","owner":null},{"id":"01a105dc-2541-731b-b26d-a36d28018b8a","name":"City Tay Ninh Manor","status":"active","hotelClass":4,"minPrice
```
- first hotel id: 01a105dc-2576-7eeb-a7dc-5dd100462759
### API-21 — status=active
```
GET /superadmin/hotels?status=active&limit=3
HTTP 200
{"success":true,"data":[{"id":"01a105dc-2576-7eeb-a7dc-5dd100462759","name":"Hotel House","status":"active","hotelClass":4,"minPrice":"629.35","timezone":"America/Chicago","city":{"id":"01a105dc-0f37-7cee-b1b4-1b5bf77231e6","name":"Dong Nai"},"country":{"id":"01a105dc-0edc-7ce1-ab3c-a15746869e73","name":"Vietnam","isoCode":"VN"},"createdAt":"2026-10-04T07:23:44.000Z","owner":null},{"id":"01a105dc-2541-731b-b26d-a36d28018b8a","name":"City Tay Ninh Manor","status":"active","hotelClass":4,"minPrice
```
### API-22 — search=hotel
```
GET /superadmin/hotels?search=hotel&limit=3
HTTP 200
{"success":true,"data":[{"id":"01a105dc-2576-7eeb-a7dc-5dd100462759","name":"Hotel House","status":"active","hotelClass":4,"minPrice":"629.35","timezone":"America/Chicago","city":{"id":"01a105dc-0f37-7cee-b1b4-1b5bf77231e6","name":"Dong Nai"},"country":{"id":"01a105dc-0edc-7ce1-ab3c-a15746869e73","name":"Vietnam","isoCode":"VN"},"createdAt":"2026-10-04T07:23:44.000Z","owner":null},{"id":"01a105dc-255b-7986-b9e4-ec8963730760","name":"View Hotel","status":"active","hotelClass":4,"minPrice":"321.01
```
### API-23 — limit=500 (max 100)
```
GET /superadmin/hotels?limit=500
HTTP 400
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request data","fields":{"limit":"\"limit\" must be less than or equal to 100"}}}
```
### API-24 — status=bogus
```
GET /superadmin/hotels?status=bogus
HTTP 400
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request data","fields":{"status":"\"status\" must be one of [active, inactive, pending, suspended]"}}}
```
### API-25 — unknown query ?foo=bar
```
GET /superadmin/hotels?foo=bar
HTTP 400
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request data","fields":{"foo":"\"foo\" is not allowed"}}}
```
### API-26 — detail valid id
```
GET /superadmin/hotels/01a105dc-2576-7eeb-a7dc-5dd100462759
HTTP 200
{"success":true,"data":{"id":"01a105dc-2576-7eeb-a7dc-5dd100462759","name":"Hotel House","status":"active","hotelClass":4,"minPrice":"629.35","timezone":"America/Chicago","city":{"id":"01a105dc-0f37-7cee-b1b4-1b5bf77231e6","name":"Dong Nai"},"country":{"id":"01a105dc-0edc-7ce1-ab3c-a15746869e73","name":"Vietnam","isoCode":"VN"},"createdAt":"2026-10-04T07:23:44.000Z","owner":null,"description":"Temeritas similique tener amplexus volaticus delinquo. Caste cupressus cinis campana cattus talus accen
```
### API-27 — detail unknown id
```
GET /superadmin/hotels/01a105dc-0000-7000-8000-000000000000
HTTP 404
{"error":{"code":"NOT_FOUND","message":"Hotel not found."}}
```
### API-28 — detail invalid uuid
```
GET /superadmin/hotels/not-a-uuid
HTTP 400
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request data","fields":{"hotelId":"\"hotelId\" must be a valid GUID"}}}
```
### API-29 — detail as support (owner masked)
```
GET /superadmin/hotels/01a105dc-2576-7eeb-a7dc-5dd100462759
HTTP 200
{"success":true,"data":{"id":"01a105dc-2576-7eeb-a7dc-5dd100462759","name":"Hotel House","status":"active","hotelClass":4,"minPrice":"629.35","timezone":"America/Chicago","city":{"id":"01a105dc-0f37-7cee-b1b4-1b5bf77231e6","name":"Dong Nai"},"country":{"id":"01a105dc-0edc-7ce1-ab3c-a15746869e73","name":"Vietnam","isoCode":"VN"},"createdAt":"2026-10-04T07:23:44.000Z","owner":null,"description":"Temeritas similique tener amplexus volaticus delinquo. Caste cupressus cinis campana cattus talus accen
```

## 5.4 Users (PII)

### API-30 — users list as support
```
GET /superadmin/users?limit=3
HTTP 200
{"success":true,"data":[{"id":"01a11694-721d-7300-8ee1-5f0cd624c0d2","email":"te•••@travelnest.com","firstName":"Test","lastName":"User","fullName":"Test User","phoneNumber":"•••67","status":"active","createdAt":"2026-10-07T13:36:29.000Z","lastLoginAt":"2026-10-11T08:15:01.000Z","emailVerifiedAt":"2026-10-07T13:36:29.000Z","globalRoles":["user"]},{"id":"01a105e0-216a-789a-8133-99845b7f5a90","email":"ad•••@travelnest.local","firstName":"Platform","lastName":"Admin","fullName":"P
```
- support email sample: te•••@travelnest.com  phone: •••67
### API-31 — users list as admin
```
GET /superadmin/users?limit=3
HTTP 200
{"success":true,"data":[{"id":"01a11694-721d-7300-8ee1-5f0cd624c0d2","email":"test@travelnest.com","firstName":"Test","lastName":"User","fullName":"Test User","phoneNumber":"+84901234567","status":"active","createdAt":"2026-10-07T13:36:29.000Z","lastLoginAt":"2026-10-11T08:15:01.000Z","emailVerifiedAt":"2026-10-07T13:36:29.000Z","globalRoles":["user"]},{"id":"01a105e0-216a-789a-8133-99845b7f5a90","email":"admin@travelnest.local","firstName":"Platform","lastName":"Admin","fullName":"Platform Admi
```
- admin email sample: test@travelnest.com  phone: +84901234567
### API-32 — status=banned
```
GET /superadmin/users?status=banned&limit=3
HTTP 200
{"success":true,"data":[],"meta":{"page":1,"limit":3,"total":0}}
```
### API-33 — role=admin
```
GET /superadmin/users?role=admin&limit=3
HTTP 500
{"error":{"code":"INTERNAL_ERROR","message":"Internal server error"}}
```
### API-34 — search=admin@travelnest
```
GET /superadmin/users?search=admin@travelnest&limit=3
HTTP 200
{"success":true,"data":[{"id":"01a105e0-216a-789a-8133-99845b7f5a90","email":"admin@travelnest.local","firstName":"Platform","lastName":"Admin","fullName":"Platform Admin","phoneNumber":null,"status":"active","createdAt":"2026-10-04T07:45:37.000Z","lastLoginAt":"2026-10-11T08:59:34.000Z","emailVerifiedAt":"2026-10-04T07:45:37.000Z","globalRoles":["admin"]}],"meta":{"page":1,"limit":3,"total":1}}
```
### API-35 — user detail as support
```
GET /superadmin/users/1000
HTTP 400
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request data","fields":{"userId":"\"userId\" must be a valid GUID"}}}
```
- support detail email/phone/address/dob: ?, ?, ?, ?
### API-36 — user detail as admin
```
GET /superadmin/users/1000
HTTP 400
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request data","fields":{"userId":"\"userId\" must be a valid GUID"}}}
```
### API-37 — user detail unknown
```
GET /superadmin/users/01a105dc-0000-7000-8000-000000000000
HTTP 404
{"error":{"code":"NOT_FOUND","message":"User not found."}}
```
### API-38 — users list non-platform
```
GET /superadmin/users
HTTP 403
{"success":false,"message":"Insufficient permissions.","error":{"code":"INSUFFICIENT_PERMISSIONS","message":"Insufficient permissions."}}
```

## 5.5 Audit

### API-40 — audit list
```
GET /superadmin/audit?limit=5
HTTP 200
{"success":true,"data":[{"id":"01a12a30-5979-7a40-9633-679b188a741d","actor_user_id":"01a105e0-216a-789a-8133-99845b7f5a90","actor_type":"user","action":"platform.pii.read","entity_type":"user","entity_id":null,"hotel_id":null,"before":null,"after":null,"reason":null,"request_id":"399c382f-362e-41e2-bbd4-aa2875f55607","metadata":{"scope":"list","total":1},"created_at":"2026-10-11T08:59:34.000Z"},{"id":"01a12a30-58f3-733e-a062-961128039a45","actor_user_id":"01a105e0-216a-789a-8133-99845b7f5a90","
```
### API-41 — audit action=platform.pii.read
```
GET /superadmin/audit?action=platform.pii.read&limit=5
HTTP 200
{"success":true,"data":[{"id":"01a12a30-5979-7a40-9633-679b188a741d","actor_user_id":"01a105e0-216a-789a-8133-99845b7f5a90","actor_type":"user","action":"platform.pii.read","entity_type":"user","entity_id":null,"hotel_id":null,"before":null,"after":null,"reason":null,"request_id":"399c382f-362e-41e2-bbd4-aa2875f55607","metadata":{"scope":"list","total":1},"created_at":"2026-10-11T08:59:34.000Z"},{"id":"01a12a30-58f3-733e-a062-961128039a45","actor_user_id":"01a105e0-216a-789a-8133-99845b7f5a90","
```
### API-42 — audit entityType=user
```
GET /superadmin/audit?entityType=user&limit=5
HTTP 200
{"success":true,"data":[{"id":"01a12a30-58f3-733e-a062-961128039a45","actor_user_id":"01a105e0-216a-789a-8133-99845b7f5a90","actor_type":"user","action":"platform.pii.read","entity_type":"user","entity_id":null,"hotel_id":null,"before":null,"after":null,"reason":null,"request_id":"74408cfd-6e4d-4c4a-9ec6-b56361980487","metadata":{"scope":"list","total":83},"created_at":"2026-10-11T08:59:34.000Z"},{"id":"01a12a30-593d-7fd8-bc0a-e40620c6465f","actor_user_id":"01a105e0-216a-789a-8133-99845b7f5a90",
```
### API-43 — audit from/to
```
GET /superadmin/audit?from=2026-10-01T00:00:00Z&to=2026-10-12T00:00:00Z&limit=3
HTTP 200
{"success":true,"data":[{"id":"01a12a30-5979-7a40-9633-679b188a741d","actor_user_id":"01a105e0-216a-789a-8133-99845b7f5a90","actor_type":"user","action":"platform.pii.read","entity_type":"user","entity_id":null,"hotel_id":null,"before":null,"after":null,"reason":null,"request_id":"399c382f-362e-41e2-bbd4-aa2875f55607","metadata":{"scope":"list","total":1},"created_at":"2026-10-11T08:59:34.000Z"},{"id":"01a12a30-593d-7fd8-bc0a-e40620c6465f","actor_user_id":"01a105e0-216a-789a-8133-99845b7f5a90","
```
### API-44 — audit non-platform
```
GET /superadmin/audit
HTTP 403
{"success":false,"message":"Insufficient permissions.","error":{"code":"INSUFFICIENT_PERMISSIONS","message":"Insufficient permissions."}}
```

## 5.6 Finance

### API-50 — finance overview
```
GET /superadmin/finance/overview
HTTP 200
{"success":true,"data":{"gross":[{"currency":"USD","count":353586,"amount":1574338668.12}],"refunds":[],"payoutsPaid":[],"payoutsPending":[],"generatedAt":"2026-10-11T07:46:11.000Z","stale":false}}
```
- finance overview: {'gross': [{'currency': 'USD', 'count': 353586, 'amount': 1574338668.12}], 'refunds': [], 'payoutsPaid': [], 'payoutsPending': [], 'generatedAt': '2026-10-11T07:46:11.000Z', 'stale': False}
### API-51 — payments list
```
GET /superadmin/finance/payments?limit=3
HTTP 200
{"success":true,"data":[{"id":"01a12a07-8f9b-7bb0-83f2-e58af53d78ba","bookingId":"01a12a07-8f9a-7f12-9029-ce58299f744e","amount":"383.59","currency":"USD","status":"cancelled","method":null,"createdAt":"2026-10-11T08:15:01.000Z","completedAt":null,"hotel":{"id":"01a105dc-24af-76b9-a19c-7f53e272221c","name":"Garden Plaza"},"buyer":{"id":"01a11694-721d-7300-8ee1-5f0cd624c0d2","email":"test@travelnest.com"}},{"id":"01a12a07-8bac-7f7f-81e3-0cdfd2774e32","bookingId":"01a12a07-8baa-7abc-b396-aae222b6a
```
### API-52 — refunds list
```
GET /superadmin/finance/refunds?limit=3
HTTP 200
{"success":true,"data":[],"meta":{"page":1,"limit":3,"total":0}}
```
### API-53 — payouts list
```
GET /superadmin/finance/payouts?limit=3
HTTP 200
{"success":true,"data":[],"meta":{"page":1,"limit":3,"total":0}}
```
### API-54 — ledger list
```
GET /superadmin/finance/ledger?limit=3
HTTP 200
{"success":true,"data":[{"id":"01a12a07-8b32-74b1-93de-8d57c07363a4","direction":"credit","amount":"349.96","currency":"USD","eventType":"payment_succeeded","description":"Hotel owner payable created","postedAt":"2026-10-11T08:14:59.000Z","account":{"id":"01a12a07-8b31-79c3-9151-50713a0f4eea","name":"Hotel payable USD","accountType":"hotel_owner_payable","currency":"USD"},"hotel":{"id":"01a105dc-2544-7ead-9a5b-3d07f4e7ec2d","name":"Boutique Ha Noi Resort"},"refs":{"bookingId":"01a12a07-85cf-7107
```
### API-55 — payments status=completed
```
GET /superadmin/finance/payments?status=completed&limit=3
HTTP 200
{"success":true,"data":[{"id":"01a12a07-88ed-7ba5-94fc-3d6a06c6cdf1","bookingId":"01a12a07-85cf-7107-978d-2428d75d469f","amount":"349.96","currency":"USD","status":"completed","method":"card","createdAt":"2026-10-11T08:14:59.000Z","completedAt":"2026-10-11T08:14:59.000Z","hotel":{"id":"01a105dc-2544-7ead-9a5b-3d07f4e7ec2d","name":"Boutique Ha Noi Resort"},"buyer":{"id":"01a11694-721d-7300-8ee1-5f0cd624c0d2","email":"test@travelnest.com"}},{"id":"01a12a07-78b6-79c1-bfe6-2783c5c313d0","bookingId":
```
### API-56 — payments currency=usd (normalize)
```
GET /superadmin/finance/payments?currency=usd&limit=3
HTTP 200
{"success":true,"data":[{"id":"01a12a07-8f9b-7bb0-83f2-e58af53d78ba","bookingId":"01a12a07-8f9a-7f12-9029-ce58299f744e","amount":"383.59","currency":"USD","status":"cancelled","method":null,"createdAt":"2026-10-11T08:15:01.000Z","completedAt":null,"hotel":{"id":"01a105dc-24af-76b9-a19c-7f53e272221c","name":"Garden Plaza"},"buyer":{"id":"01a11694-721d-7300-8ee1-5f0cd624c0d2","email":"test@travelnest.com"}},{"id":"01a12a07-8bac-7f7f-81e3-0cdfd2774e32","bookingId":"01a12a07-8baa-7abc-b396-aae222b6a
```
### API-57 — ledger direction=debit
```
GET /superadmin/finance/ledger?direction=debit&limit=3
HTTP 200
{"success":true,"data":[{"id":"01a12a07-8b32-74b1-93de-8d563a77a079","direction":"debit","amount":"349.96","currency":"USD","eventType":"payment_succeeded","description":"Customer payment received","postedAt":"2026-10-11T08:14:59.000Z","account":{"id":"01a116a4-d9f1-7606-b7f7-d327003cd3bf","name":"Platform cash USD","accountType":"platform_cash","currency":"USD"},"hotel":{"id":"01a105dc-2544-7ead-9a5b-3d07f4e7ec2d","name":"Boutique Ha Noi Resort"},"refs":{"bookingId":"01a12a07-85cf-7107-978d-242
```
### API-58 — currency=US (too short)
```
GET /superadmin/finance/payments?currency=US
HTTP 400
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request data","fields":{"currency":"\"currency\" length must be 3 characters long"}}}
```
### API-59 — payments as support (masked)
```
GET /superadmin/finance/payments?limit=3
HTTP 200
{"success":true,"data":[{"id":"01a12a07-8f9b-7bb0-83f2-e58af53d78ba","bookingId":"01a12a07-8f9a-7f12-9029-ce58299f744e","amount":"383.59","currency":"USD","status":"cancelled","method":null,"createdAt":"2026-10-11T08:15:01.000Z","completedAt":null,"hotel":{"id":"01a105dc-24af-76b9-a19c-7f53e272221c","name":"Garden Plaza"},"buyer":{"id":"01a11694-721d-7300-8ee1-5f0cd624c0d2","email":"te•••@travelnest.com"}},{"id":"01a12a07-8bac-7f7f-81e3-0cdfd2774e32","bookingId":"01a12a07-8baa-7abc-b396-aa
```
- support payment buyer: {'id': '01a11694-721d-7300-8ee1-5f0cd624c0d2', 'email': 'te•••@travelnest.com'}
### API-60 — finance non-platform
```
GET /superadmin/finance/overview
HTTP 403
{"success":false,"message":"Insufficient permissions.","error":{"code":"INSUFFICIENT_PERMISSIONS","message":"Insufficient permissions."}}
```

## 5.7 Cross-cutting

### API-70a — limit=0
```
GET /superadmin/hotels?limit=0
HTTP 400
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request data","fields":{"limit":"\"limit\" must be greater than or equal to 1"}}}
```
### API-70b — page=0
```
GET /superadmin/hotels?page=0
HTTP 400
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request data","fields":{"page":"\"page\" must be greater than or equal to 1"}}}
```
### API-71 — default limit (meta)
```
GET /superadmin/hotels
HTTP 200
{"success":true,"data":[{"id":"01a105dc-2576-7eeb-a7dc-5dd100462759","name":"Hotel House","status":"active","hotelClass":4,"minPrice":"629.35","timezone":"America/Chicago","city":{"id":"01a105dc-0f37-7cee-b1b4-1b5bf77231e6","name":"Dong Nai"},"country":{"id":"01a105dc-0edc-7ce1-ab3c-a15746869e73","name":"Vietnam","isoCode":"VN"},"createdAt":"2026-10-04T07:23:44.000Z","owner":null},{"id":"01a105dc-2541-731b-b26d-a36d28018b8a","name":"City Tay Ninh Manor","status":"active","hotelClass":4,"minPrice
```
- default meta: {'page': 1, 'limit': 20, 'total': 12600}
### API-73 — unknown route
```
GET /superadmin/nope
HTTP 404
{"error":{"code":"NOT_FOUND","message":"Cannot GET /api/v1/superadmin/nope"}}
```

## Security (SEC-1..7)

### SEC-1 — no token on hotels
```
GET /superadmin/hotels
HTTP 401
{"success":false,"message":"Authentication required.","error":{"code":"AUTHENTICATION_REQUIRED","message":"Authentication required."}}
```
### SEC-4a — owner on hotels
```
GET /superadmin/hotels
HTTP 403
{"success":false,"message":"Insufficient permissions.","error":{"code":"INSUFFICIENT_PERMISSIONS","message":"Insufficient permissions."}}
```
### SEC-4b — owner on finance
```
GET /superadmin/finance/overview
HTTP 403
{"success":false,"message":"Insufficient permissions.","error":{"code":"INSUFFICIENT_PERMISSIONS","message":"Insufficient permissions."}}
```
### SEC-4c — owner on audit
```
GET /superadmin/audit
HTTP 403
{"success":false,"message":"Insufficient permissions.","error":{"code":"INSUFFICIENT_PERMISSIONS","message":"Insufficient permissions."}}
```
### SEC-5 — internal ops token not accepted
```
GET /superadmin/overview
HTTP 401
{"success":false,"message":"Malformed JWT","error":{"code":"INVALID_TOKEN","message":"Malformed JWT"}}
```
### SEC-6 — legacy /internal/superadmin gone
```
GET /internal/superadmin/overview
HTTP 404
{"error":{"code":"NOT_FOUND","message":"Cannot GET /api/v1/internal/superadmin/overview"}}
```

## 9. Regression — cross-hotel admin IDOR (owner token + X-Hotel-Id: own hotel)

### REG-01 — GET foreign booking
```
GET /admin/bookings/01a105e0-2500-7b12-b784-bcbe2cfcb0c9  (X-Hotel-Id: own)
HTTP 403
{"success":false,"message":"You do not have access to this resource.","error":{"code":"RESOURCE_ACCESS_DENIED","message":"You do not have access to this resource."}}
```
### REG-03 — GET foreign transaction
```
GET /admin/payments/transactions/01a105e2-7ba9-7496-a7be-55f5a3cfbe00  (X-Hotel-Id: own)
HTTP 403
{"success":false,"message":"You do not have access to this resource.","error":{"code":"RESOURCE_ACCESS_DENIED","message":"You do not have access to this resource."}}
```
### REG-06 — GET foreign review
```
GET /admin/reviews/01a105e2-591a-760d-9747-1aae31320d1f  (X-Hotel-Id: own)
HTTP 403
{"success":false,"message":"You do not have access to this resource.","error":{"code":"RESOURCE_ACCESS_DENIED","message":"You do not have access to this resource."}}
```
### REG-07 — GET foreign room
```
GET /admin/inventory/rooms/01a105dc-2777-779e-a964-3600ec3bbe14  (X-Hotel-Id: own)
HTTP 403
{"success":false,"message":"You do not have access to this resource.","error":{"code":"RESOURCE_ACCESS_DENIED","message":"You do not have access to this resource."}}
```
### REG-08 — GET foreign hotel stats (path hotel)
```
GET /admin/bookings/hotels/01a105dc-2486-7012-8bef-52e5747b5362/stats  (X-Hotel-Id: own)
HTTP 403
{"success":false,"message":"You do not have access to this hotel.","error":{"code":"HOTEL_ACCESS_DENIED","message":"You do not have access to this hotel."}}
```
### REG-09a — GET own booking
```
GET /admin/bookings/01a105e0-328d-7cc2-b9f6-23a7f630d20d  (X-Hotel-Id: own)
HTTP 200
{"success":true,"data":{"id":"01a105e0-328d-7cc2-b9f6-23a7f630d20d","buyer_id":"01a105e0-242b-7139-92d8-8ef587b1ad96","hotel_id":"01a105dc-2510-74f5-a07f-c79bab3b0002","room_id":"01a105dc-27a5-79ca-b53f-c39589ad8b20","hold_id":null,"booking_code":"BKMUTINP47EJDJ147939","check_in_date":"2026-09-11","
```
### REG-09b — GET own room
```
GET /admin/inventory/rooms/01a105dc-27b5-7383-b90b-066d3477633b  (X-Hotel-Id: own)
HTTP 200
{"success":true,"data":{"roomId":"01a105dc-27b5-7383-b90b-066d3477633b","roomName":"Deluxe 390","hotelId":"01a105dc-2510-74f5-a07f-c79bab3b0002","startDate":"2026-10-11","endDate":"2026-11-10","days":[{"date":"2026-10-11","totalRooms":8,"bookedRooms":0,"heldRooms":0,"availableRooms":8,"status":"open
```
### REG-10 — platform admin token on foreign booking
```
GET /admin/bookings/01a105e0-2500-7b12-b784-bcbe2cfcb0c9  (X-Hotel-Id: own)
HTTP 200
{"success":true,"data":{"id":"01a105e0-2500-7b12-b784-bcbe2cfcb0c9","buyer_id":"01a105dc-1c72-72a6-b3cc-87089c82e850","hotel_id":"01a105dc-2486-7012-8bef-52e5747b5362","room_id":"01a105dc-27be-741c-9c88-fdfd528210be","hold_id":null,"booking_code":"BKMUTINP47EJDJ1","check_in_date":"2026-09-19","check
```
