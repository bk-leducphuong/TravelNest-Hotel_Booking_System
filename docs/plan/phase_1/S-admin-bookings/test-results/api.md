# Feature S — Admin Bookings · API evidence

_2026-10-09T18:19:32Z_

## Read (own hotel)
### S-API-01 — list bookings
```
GET /admin/bookings?limit=3
HTTP 200
{"data":[{"id":"01a105e0-328d-7cc2-b9f6-23afa70d2712","buyer_id":"01a105dc-1c83-729b-8f64-3882672b35ea","hotel_id":"01a105dc-2510-74f5-a07f-c79bab3b0002","room_id":"01a105dc-2826-7880-a036-5432e51bbf5c","hold_id":null,"booking_code":"BKMUTINP47EJDJ147947","check_in_date":"2026-06-24","check_out_date":"2026-06-30","number_of_guests":2,"quantity":3,"
```
### S-API-02 — stats
```
GET /admin/bookings/hotels/01a105dc-2510-74f5-a07f-c79bab3b0002/stats
HTTP 200
{"data":{"hotelId":"01a105dc-2510-74f5-a07f-c79bab3b0002","total":41,"byStatus":{"completed":20,"confirmed":15,"cancelled":4,"no_show":1,"checked_in":1},"arrivalsToday":0,"departuresToday":0}}
```
### S-API-03 — trend
```
GET /admin/bookings/hotels/01a105dc-2510-74f5-a07f-c79bab3b0002/trend?days=7
HTTP 200
{"data":{"hotelId":"01a105dc-2510-74f5-a07f-c79bab3b0002","days":7,"points":[{"date":"2026-10-03","count":0},{"date":"2026-10-04","count":0},{"date":"2026-10-05","count":0},{"date":"2026-10-06","count":0},{"date":"2026-10-07","count":0},{"date":"2026-10-08","count":0},{"date":"2026-10-09","count":0}]}}
```
### S-API-04 — get own booking
```
GET /admin/bookings/01a105e0-328d-7cc2-b9f6-23afa70d2712
HTTP 200
{"data":{"id":"01a105e0-328d-7cc2-b9f6-23afa70d2712","buyer_id":"01a105dc-1c83-729b-8f64-3882672b35ea","hotel_id":"01a105dc-2510-74f5-a07f-c79bab3b0002","room_id":"01a105dc-2826-7880-a036-5432e51bbf5c","hold_id":null,"booking_code":"BKMUTINP47EJDJ147947","check_in_date":"2026-06-24","check_out_date":"2026-06-30","number_of_guests":2,"quantity":3,"t
```
## Status transitions
### S-API-05 — invalid jump confirmed->completed -> 409
```
PATCH /admin/bookings/01a105e0-328d-7cc2-b9f6-23afa70d2712/status
HTTP 409
{"error":{"code":"INVALID_BOOKING_STATUS_TRANSITION","message":"Cannot change booking status from 'confirmed' to 'completed'"}}
```
### S-API-06 — valid confirmed->checked_in -> 200
```
PATCH /admin/bookings/01a105e0-328d-7cc2-b9f6-23afa70d2712/status
HTTP 200
{"data":{"bookingId":"01a105e0-328d-7cc2-b9f6-23afa70d2712","previousStatus":"confirmed","status":"checked_in"}}
```
### S-API-07 — invalid status value -> 400
```
PATCH /admin/bookings/01a105e0-328d-7cc2-b9f6-23afa70d2712/status
HTTP 400
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request data","fields":{"status":"\"status\" must be one of [confirmed, checked_in, completed, no_show]"}}}
```
## Cancel
### S-API-08 — force-cancel own booking
```
POST /admin/bookings/01a105e0-328d-7cc2-b9f6-23afa70d2712/cancel
HTTP 200
{"data":{"bookingId":"01a105e0-328d-7cc2-b9f6-23afa70d2712","previousStatus":"checked_in","status":"cancelled","inventoryReleased":true,"refund":null,"refundError":null}}
```
## Auth / cross-hotel
### S-API-09 — no token -> 401
```
GET /admin/bookings
HTTP 401
{"success":false,"message":"Authentication required."}
```
### S-API-10 — foreign hotel stats -> 403
```
GET /admin/bookings/hotels/01a105dc-2486-7012-8bef-52e5747b5362/stats
HTTP 403
{"success":false,"message":"You do not have access to this hotel."}
```
### S-IDOR-READ — IDOR: manager GET FOREIGN booking w/ OWN X-Hotel-Id
```
GET /admin/bookings/01a105e0-2501-7e40-8ff3-391be9102c3c
HTTP 200
{"data":{"id":"01a105e0-2501-7e40-8ff3-391be9102c3c","buyer_id":"01a105dc-1c14-7c8a-aa81-835bc3f10528","hotel_id":"01a105dc-2486-7012-8bef-52e5747b5362","room_id":"01a105dc-281a-7c0f-881b-8e70eb4a2657","hold_id":null,"booking_code":"BKMUTINP47EJDJ11","check_in_date":"2026-11-18","check_out_date":"2026-11-28","number_of_guests":3,"quantity":3,"total
```
### S-IDOR-WRITE — IDOR: manager PATCH FOREIGN booking status w/ OWN X-Hotel-Id
```
PATCH /admin/bookings/01a105e0-2501-7e40-8ff3-391be9102c3c/status
HTTP 200
{"data":{"bookingId":"01a105e0-2501-7e40-8ff3-391be9102c3c","previousStatus":"confirmed","status":"checked_in"}}
```
### S-IDOR-CANCEL — IDOR: manager force-cancel FOREIGN booking w/ OWN X-Hotel-Id
```
POST /admin/bookings/01a105e0-2501-7e40-8ff3-391be9102c3c/cancel
HTTP 200
{"data":{"bookingId":"01a105e0-2501-7e40-8ff3-391be9102c3c","previousStatus":"checked_in","status":"cancelled","inventoryReleased":true,"refund":null,"refundError":null}}
```
