# Feature H — Bookings (guest) · API evidence

_2026-10-09T17:01:42Z · room=01a105dc-2796-7bff-b5f7-36a5633c03d1 window=2026-12-05..2026-12-07_

hold1=01a1219d-095e-770a-9a89-0c632a6a747d hold2=01a1219d-0980-7698-a4d6-70a3ef55bdc0
## Create (idempotent)
### H-API-01 — create booking (Idempotency-Key=k1)
```
POST /bookings
HTTP 201
{"data":{"bookingId":"01a1219d-09ac-76a6-adea-d367ffd4fa56","bookingCode":"BKMV17Q2EKF4B26F","status":"pending_payment","paymentDueAt":"2026-10-09T17:16:42.188Z","transactionId":"01a1219d-09b7-759e-9e40-e94b3c01960f","price":{"subtotal":340.52,"taxAmount":0,"serviceFeeAmount":0,"platformCommissionAmount":0,"totalPrice":340.52,"currency":"USD"},"rooms":[{"roomId":"01a105dc-2796-7bff-b5f7-36a5633c03d1","quantity":1,"nightly":[{"date":"2026-12-05","price":255.61,"quantity":1,"total":255.61},{"date":"2026-12-06","price":84.91,"quantity":1,"total":84.91}],"subtotal":340.52,"totalPrice":340.52}],"ca
```
bookingId=01a1219d-09ac-76a6-adea-d367ffd4fa56 code=BKMV17Q2EKF4B26F
### H-API-02 — replay same key+body
```
POST /bookings
HTTP 201
{"data":{"price":{"currency":"USD","subtotal":340.52,"taxAmount":0,"totalPrice":340.52,"serviceFeeAmount":0,"platformCommissionAmount":0},"rooms":[{"roomId":"01a105dc-2796-7bff-b5f7-36a5633c03d1","nightly":[{"date":"2026-12-05","price":255.61,"total":255.61,"quantity":1},{"date":"2026-12-06","price":84.91,"total":84.91,"quantity":1}],"quantity":1,"subtotal":340.52,"totalPrice":340.52}],"status":"pending_payment","bookingId":"01a1219d-09ac-76a6-adea-d367ffd4fa56","bookingCode":"BKMV17Q2EKF4B26F","paymentDueAt":"2026-10-09T17:16:42.188Z","transactionId":"01a1219d-09b7-759e-9e40-e94b3c01960f","ca
```
### H-API-03 — reuse key + different body -> 409
```
POST /bookings
HTTP 409
{"error":{"code":"IDEMPOTENCY_KEY_REUSED","message":"Idempotency-Key was already used with a different request"}}
```
### H-API-04 — missing Idempotency-Key -> 400
```
POST /bookings
HTTP 400
{"error":{"code":"IDEMPOTENCY_KEY_REQUIRED","message":"Idempotency-Key header is required"}}
```
## Read
### H-API-05 — list my bookings
```
GET /bookings
HTTP 200
{"data":[{"id":"01a1219d-09ac-76a6-adea-d367ffd4fa56","buyer_id":"01a11694-721d-7300-8ee1-5f0cd624c0d2","hotel_id":"01a105dc-24d4-7ffc-98e0-32d730d886d1","room_id":"01a105dc-2796-7bff-b5f7-36a5633c03d1","hold_id":"01a1219d-095e-770a-9a89-0c632a6a747d","booking_code":"BKMV17Q2EKF4B26F","check_in_date":"2026-12-05","check_out_date":"2026-12-07","number_of_guests":2,"quantity":1,"total_price":"340.52","subtotal":"340.52","tax_amount":"0.00","service_fee_amount":"0.00","platform_commission_amount":"0.00","currency":"USD","status":"pending_payment","special_requests":null,"guest_details":null,"pric
```
### H-API-06 — get booking by id
```
GET /bookings/01a1219d-09ac-76a6-adea-d367ffd4fa56
HTTP 200
{"data":{"id":"01a1219d-09ac-76a6-adea-d367ffd4fa56","buyer_id":"01a11694-721d-7300-8ee1-5f0cd624c0d2","hotel_id":"01a105dc-24d4-7ffc-98e0-32d730d886d1","room_id":"01a105dc-2796-7bff-b5f7-36a5633c03d1","hold_id":"01a1219d-095e-770a-9a89-0c632a6a747d","booking_code":"BKMV17Q2EKF4B26F","check_in_date":"2026-12-05","check_out_date":"2026-12-07","number_of_guests":2,"quantity":1,"total_price":"340.52","subtotal":"340.52","tax_amount":"0.00","service_fee_amount":"0.00","platform_commission_amount":"0.00","currency":"USD","status":"pending_payment","special_requests":null,"guest_details":null,"price
```
### H-API-07 — get booking by code
```
GET /bookings/code/BKMV17Q2EKF4B26F
HTTP 200
{"data":{"id":"01a1219d-09ac-76a6-adea-d367ffd4fa56","buyer_id":"01a11694-721d-7300-8ee1-5f0cd624c0d2","hotel_id":"01a105dc-24d4-7ffc-98e0-32d730d886d1","room_id":"01a105dc-2796-7bff-b5f7-36a5633c03d1","hold_id":"01a1219d-095e-770a-9a89-0c632a6a747d","booking_code":"BKMV17Q2EKF4B26F","check_in_date":"2026-12-05","check_out_date":"2026-12-07","number_of_guests":2,"quantity":1,"total_price":"340.52","subtotal":"340.52","tax_amount":"0.00","service_fee_amount":"0.00","platform_commission_amount":"0.00","currency":"USD","status":"pending_payment","special_requests":null,"guest_details":null,"price
```
## Payment intent
### H-API-08 — create payment intent
```
POST /bookings/01a1219d-09ac-76a6-adea-d367ffd4fa56/payment-intent
HTTP 201
{"data":{"clientSecret":"pi_3UOhAwC8yETwFKHF0rBHTm45_secret_3hASarAoBGFzCuGSIF8uWrjWd","paymentIntentId":"pi_3UOhAwC8yETwFKHF0rBHTm45","status":"pending","bookingId":"01a1219d-09ac-76a6-adea-d367ffd4fa56","bookingCode":"BKMV17Q2EKF4B26F"}}
```
## Auth / IDOR
### H-API-09 — create no token -> 401
```
POST /bookings
HTTP 401
{"success":false,"message":"Authentication required."}
```
### H-API-10 — user B get A booking -> 403
```
GET /bookings/01a1219d-09ac-76a6-adea-d367ffd4fa56
HTTP 404
{"error":{"code":"BOOKING_NOT_FOUND","message":"Booking not found or you do not have permission to view it"}}
```
### H-API-11 — user B get by code -> 403
```
GET /bookings/code/BKMV17Q2EKF4B26F
HTTP 404
{"error":{"code":"BOOKING_NOT_FOUND","message":"Booking not found"}}
```
### H-API-12 — user B cancel A booking -> 403
```
DELETE /bookings/01a1219d-09ac-76a6-adea-d367ffd4fa56
HTTP 404
{"error":{"code":"BOOKING_NOT_FOUND","message":"Booking not found or you do not have permission to cancel it"}}
```
## Cancel
### H-API-13 — cancel booking
```
DELETE /bookings/01a1219d-09ac-76a6-adea-d367ffd4fa56
HTTP 200
{"data":{"bookingId":"01a1219d-09ac-76a6-adea-d367ffd4fa56","bookingCode":"BKMV17Q2EKF4B26F","message":"Booking cancelled successfully","refundProcessed":false,"cancellationPolicy":{"eligible":true,"eligibility":"eligible","reason":"free_cancellation","refundAmount":340.52,"refundPercent":100,"currency":"USD","isRefundable":true,"ruleId":"01a105df-d873-76e2-a0c7-7e9ad4b348ba","freeCancellationDeadline":"2026-12-03T01:00:00.000Z","isWithinFreeCancellationWindow":true},"refund":null}}
```
### H-API-14 — double cancel -> 409
```
DELETE /bookings/01a1219d-09ac-76a6-adea-d367ffd4fa56
HTTP 400
{"error":{"code":"ALREADY_CANCELLED","message":"Booking is already cancelled"}}
```
## Validation / edge
### H-API-15 — invalid bookingId -> 400
```
GET /bookings/not-a-uuid
HTTP 400
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request data","fields":{"bookingId":"bookingId must be a valid UUID"}}}
```
### H-API-16 — unknown booking uuid -> 404
```
GET /bookings/00000000-0000-0000-0000-000000000000
HTTP 404
{"error":{"code":"BOOKING_NOT_FOUND","message":"Booking not found or you do not have permission to view it"}}
```
### H-API-17 — create from unknown hold -> 404
```
POST /bookings
HTTP 404
{"error":{"code":"HOLD_NOT_FOUND","message":"Hold not found"}}
```
### H-API-18 — create from released hold -> error
```
POST /bookings
HTTP 400
{"error":{"code":"HOLD_NOT_ACTIVE","message":"Hold is released"}}
```
