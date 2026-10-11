# Feature O — Admin Auth, Session & RBAC · API evidence

_2026-10-09T17:44:48Z_

## /admin/me per role
### O-ME-ADMIN — GET /admin/me (ADMIN)
```
GET /admin/me
HTTP 200
{"data":{"user":{"id":"01a105e0-216a-789a-8133-99845b7f5a90","email":"admin@travelnest.local"},"globalRoles":["admin"],"tokenRoles":["offline_access","admin","default-roles-travelnest","uma_authorization"],"permissions":["admin.dashboard","admin.manage_hotels","admin.manage_roles","admin.manage_users","admin.system_settings","admin.view_logs","booking.cancel","booking.create","booking.manage","booking.read","booking.update","hotel.create","hotel.delete","hotel.manage_staff","hotel.read","hotel.update","hotel.view_analytics","notification.read","notification.send","payment.process","payment.read","payment.refund","report.export","report.view","review.create","review.delete","review.moderate",
```
### O-ME-SUPPORT — GET /admin/me (SUPPORT)
```
GET /admin/me
HTTP 200
{"data":{"user":{"id":"01a105e0-229c-72c0-89a3-ac0b18486028","email":"support@travelnest.local"},"globalRoles":["support_agent"],"tokenRoles":["support_agent","offline_access","default-roles-travelnest","uma_authorization"],"permissions":["booking.cancel","booking.read","booking.update","hotel.read","notification.read","notification.send","payment.read","payment.refund","review.moderate","review.read","room.read","support.respond_tickets","support.view_tickets","support.view_user_details","user.read"],"hotels":[]}}
```
### O-ME-OWNER — GET /admin/me (OWNER)
```
GET /admin/me
HTTP 200
{"data":{"user":{"id":"01a105e0-231f-7c5b-9020-2ac93a35114f","email":"owner@travelnest.local"},"globalRoles":["user"],"tokenRoles":["offline_access","default-roles-travelnest","uma_authorization","user"],"permissions":["booking.cancel","booking.create","booking.manage","booking.read","booking.update","hotel.create","hotel.delete","hotel.manage_staff","hotel.read","hotel.update","hotel.view_analytics","notification.read","notification.send","payment.read","payment.refund","report.export","report.view","review.create","review.read","review.reply","review.update","room.create","room.delete","room.manage_inventory","room.read","room.update","user.read","user.update"],"hotels":[{"id":"01a105dc-25
```
### O-ME-MANAGER — GET /admin/me (MANAGER)
```
GET /admin/me
HTTP 200
{"data":{"user":{"id":"01a105e0-23a8-7007-bfc2-4a86ab024732","email":"manager@travelnest.local"},"globalRoles":["user"],"tokenRoles":["offline_access","default-roles-travelnest","uma_authorization","user"],"permissions":["booking.cancel","booking.create","booking.manage","booking.read","booking.update","hotel.read","hotel.update","hotel.view_analytics","notification.read","notification.send","payment.read","report.view","review.create","review.read","review.reply","review.update","room.create","room.delete","room.manage_inventory","room.read","room.update","user.read","user.update"],"hotels":[{"id":"01a105dc-2510-74f5-a07f-c79bab3b0002","name":"The Poplar Road Inn","role":"manager","isPrimar
```
### O-ME-STAFF — GET /admin/me (STAFF)
```
GET /admin/me
HTTP 200
{"data":{"user":{"id":"01a105e0-242b-7139-92d8-8ef587b1ad96","email":"staff@travelnest.local"},"globalRoles":["user"],"tokenRoles":["offline_access","default-roles-travelnest","uma_authorization","user"],"permissions":["booking.cancel","booking.create","booking.manage","booking.read","booking.update","hotel.read","notification.read","notification.send","payment.read","review.create","review.read","review.reply","review.update","room.manage_inventory","room.read","room.update","user.read","user.update"],"hotels":[{"id":"01a105dc-2510-74f5-a07f-c79bab3b0002","name":"The Poplar Road Inn","role":"staff","isPrimaryOwner":false,"permissions":["booking.manage","booking.read","booking.update","hotel
```
### O-ME-GUEST — GET /admin/me (GUEST)
```
GET /admin/me
HTTP 200
{"data":{"user":{"id":"01a11694-721d-7300-8ee1-5f0cd624c0d2","email":"test@travelnest.com"},"globalRoles":["user"],"tokenRoles":["offline_access","default-roles-travelnest","uma_authorization","user"],"permissions":["booking.cancel","booking.create","booking.read","hotel.read","notification.read","payment.read","review.create","review.read","review.update","room.read","user.read","user.update"],"hotels":[]}}
```
## Auth
### O-API-01 — admin/me no token -> 401
```
GET /admin/me
HTTP 401
{"success":false,"message":"Authentication required."}
```
### O-API-02 — admin bookings no token -> 401
```
GET /admin/bookings
HTTP 401
{"success":false,"message":"Authentication required."}
```
## Permission enforcement (GET /admin/bookings)
### O-API-03 — admin bookings (admin) -> 200
```
GET /admin/bookings
HTTP 200
{"data":[{"id":"01a1219d-6c1f-7ea2-8bab-2e80d36af02b","buyer_id":"01a11694-721d-7300-8ee1-5f0cd624c0d2","hotel_id":"01a105dc-24d4-7ffc-98e0-32d730d886d1","room_id":"01a105dc-2796-7bff-b5f7-36a5633c03d1","hold_id":"01a1219d-6c01-7604-adf1-5aa25081af8d","booking_code":"BKMV17QLUNB4545D","check_in_date":"2026-12-15","check_out_date":"2026-12-17","number_of_guests":2,"quantity":1,"total_price":"439.47","subtotal":"439.47","tax_amount":"0.00","service_fee_amount":"0.00","platform_commission_amount":"0.00","currency":"USD","status":"cancelled","special_requests":null,"guest_details":null,"price_breakdown":{"rooms":[{"roomId":"01a105dc-2796-7bff-b5f7-36a5633c03d1","nightly":[{"date":"2026-12-15","p
```
### O-API-04 — admin bookings (guest) -> 403
```
GET /admin/bookings
HTTP 400
{"success":false,"message":"Hotel context is required for this operation."}
```
### O-API-05 — admin payouts (guest) -> 403
```
GET /admin/payouts
HTTP 400
{"success":false,"message":"Hotel context is required for this operation."}
```
### O-API-06 — admin inventory hotel context missing (owner) -> 400
```
GET /admin/inventory/hotels/01a105dc-24d4-7ffc-98e0-32d730d886d1/rooms
HTTP 403
{"success":false,"message":"You do not have access to this hotel."}
```
## Hotel-scoped / cross-hotel
### O-API-07 — staff hotel rooms for owned hotel (X-Hotel-Id)
```
GET /admin/inventory/hotels/01a105dc-24d4-7ffc-98e0-32d730d886d1/rooms
HTTP 403
{"success":false,"message":"You do not have access to this hotel."}
```
### O-API-08 — staff hotel rooms for foreign hotel (X-Hotel-Id)
```
GET /admin/inventory/hotels/00000000-0000-0000-0000-000000000000/rooms
HTTP 403
{"success":false,"message":"You do not have access to this hotel."}
```
### O-API-09 — owner catalog list (global, no hotel ctx)
```
GET /admin/hotels
HTTP 200
{"data":[{"id":"01a105dc-2576-7eeb-a7dc-5dd100462759","name":"Hotel House","description":"Temeritas similique tener amplexus volaticus delinquo. Caste cupressus cinis campana cattus talus accendo enim umbra. Vita supellex cribro crebro ab sodalitas suppono thalassinus solus audeo. Exercitationem tribuo vulpes tabesco videlicet cursus urbanus carbo volutabrum. Vicissitudo ager sollicito sol adfero concido vapulus. Quia delego vereor sperno.","address":"433 Moen Divide Apt. 674","city_id":"01a105dc-0f37-7cee-b1b4-1b5bf77231e6","country_id":"01a105dc-0edc-7ce1-ab3c-a15746869e73","phone_number":"(808) 564-9072","latitude":"10.9422729","longitude":"106.8397626","hotel_class":4,"check_in_time":"14
```
