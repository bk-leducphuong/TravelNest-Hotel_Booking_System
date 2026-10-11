# Feature G — Holds · API evidence

_2026-10-09T14:31:19Z · room=01a105dc-2796-7bff-b5f7-36a5633c03d1_

### G-API-01 — create hold
```
POST /hold
HTTP 201
{"data":{"holdId":"01a12113-5cf5-7960-8041-ba4eca9f37a3","checkInDate":"2026-10-29","checkOutDate":"2026-10-31","numberOfGuests":2,"quantity":1,"subtotal":424.37,"taxAmount":0,"serviceFeeAmount":0,"platformCommissionAmount":0,"totalPrice":424.37,"currency":"USD","priceBreakdown":{"subtotal":424.37,"taxAmount":0,"serviceFeeAmount":0,"platformCommissionAmount":0,"totalPrice":424.37,"currency":"USD","taxRate":0,"serviceFeeRate":0,"platformCommission
```
holdId=01a12113-5cf5-7960-8041-ba4eca9f37a3
### G-API-02 — list holds
```
GET /hold
HTTP 200
{"data":[{"id":"01a12113-5cf5-7960-8041-ba4eca9f37a3","check_in_date":"2026-10-29","check_out_date":"2026-10-31","number_of_guests":2,"quantity":1,"total_price":"424.37","subtotal":"424.37","tax_amount":"0.00","service_fee_amount":"0.00","platform_commission_amount":"0.00","currency":"USD","price_breakdown":{"rooms":[{"roomId":"01a105dc-2796-7bff-b5f7-36a5633c03d1","nightly":[{"date":"2026-10-29","price":243.8,"total":243.8,"quantity":1},{"date":
```
### G-API-03 — get hold by id
```
GET /hold/01a12113-5cf5-7960-8041-ba4eca9f37a3
HTTP 200
{"data":{"id":"01a12113-5cf5-7960-8041-ba4eca9f37a3","check_in_date":"2026-10-29","check_out_date":"2026-10-31","number_of_guests":2,"quantity":1,"total_price":"424.37","subtotal":"424.37","tax_amount":"0.00","service_fee_amount":"0.00","platform_commission_amount":"0.00","currency":"USD","price_breakdown":{"rooms":[{"roomId":"01a105dc-2796-7bff-b5f7-36a5633c03d1","nightly":[{"date":"2026-10-29","price":243.8,"total":243.8,"quantity":1},{"date":"
```
### G-API-04 — create no token -> 401
```
POST /hold
HTTP 401
{"success":false,"message":"Authentication required."}
```
### G-API-05 — user B get A's hold -> 404
```
GET /hold/01a12113-5cf5-7960-8041-ba4eca9f37a3
HTTP 403
{"error":{"code":"FORBIDDEN","message":"You do not have permission to view this hold"}}
```
### G-API-06 — missing rooms -> 400
```
POST /hold
HTTP 400
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request data","fields":{"rooms":"rooms is required"}}}
```
### G-API-07 — checkOut<=checkIn -> 400
```
POST /hold
HTTP 400
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request data","fields":{"":"\"value\" failed custom validation because "}}}
```
### G-API-08 — invalid roomId -> 400
```
POST /hold
HTTP 400
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request data","fields":{"rooms.0.roomId":"roomId must be a valid UUID"}}}
```
### G-API-09 — get non-uuid holdId -> 400
```
GET /hold/not-a-uuid
HTTP 400
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request data","fields":{"holdId":"Must be a valid UUID"}}}
```
### G-API-10 — get unknown hold uuid -> ?
```
GET /hold/00000000-0000-0000-0000-000000000000
HTTP 404
{"error":{"code":"HOLD_NOT_FOUND","message":"Hold not found"}}
```
### G-API-11 — quantity > availability (999) -> ?
```
POST /hold
HTTP 409
{"error":{"code":"ROOMS_NOT_AVAILABLE","message":"Selected rooms are not available for the given dates"}}
```
### G-API-12 — release hold
```
DELETE /hold/01a12113-5cf5-7960-8041-ba4eca9f37a3
HTTP 200
{"data":{"holdId":"01a12113-5cf5-7960-8041-ba4eca9f37a3","status":"released"}}
```
### G-API-13 — get hold after release -> ?
```
GET /hold/01a12113-5cf5-7960-8041-ba4eca9f37a3
HTTP 200
{"data":{"id":"01a12113-5cf5-7960-8041-ba4eca9f37a3","check_in_date":"2026-10-29","check_out_date":"2026-10-31","number_of_guests":2,"quantity":1,"total_price":"424.37","subtotal":"424.37","tax_amount":"0.00","service_fee_amount":"0.00","platform_commission_amount":"0.00","currency":"USD","price_breakdown":{"rooms":[{"roomId":"01a105dc-2796-7bff-b5f7-36a5633c03d1","nightly":[{"date":"2026-10-29","price":243.8,"total":243.8,"quantity":1},{"date":"
```
  attempt3: 201
  attempt5: 201
  attempt1: 201
  attempt2: 201
  attempt6: 201
  attempt4: 201
