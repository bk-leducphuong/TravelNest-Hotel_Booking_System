# Feature T — Admin Payments & Refunds · API evidence

_2026-10-09T18:26:48Z_

## Read (manager own hotel)
### T-API-01 — payments summary
```
GET /admin/payments/hotels/01a105dc-2510-74f5-a07f-c79bab3b0002/summary
HTTP 200
{"data":{"hotelId":"01a105dc-2510-74f5-a07f-c79bab3b0002","totalTransactions":41,"byStatus":{"completed":37,"refunded":2,"cancelled":2},"grossAmount":174831.65,"refundedAmount":0,"netAmount":174831.65}}
```
### T-API-02 — transactions list
```
GET /admin/payments/transactions?limit=3
HTTP 200
{"data":[{"id":"01a105e2-8520-75c5-996e-4fa6a2a562b7","booking_id":"01a105e0-328d-7cc2-b9f6-23afa70d2712","buyer_id":"01a105dc-1c83-729b-8f64-3882672b35ea","hotel_id":"01a105dc-2510-74f5-a07f-c79bab3b0002","amount":"9245.94","currency":"USD","status":"completed","transaction_type":"payment","payment_method":"card","stripe_payment_intent_id":"pi_7ix
```
### T-API-03 — refunds list
```
GET /admin/payments/refunds?limit=3
HTTP 200
{"data":[],"meta":{"page":1,"limit":3,"total":0}}
```
## Refund rules (admin, on a refundable txn)
### T-API-04 — over-refund (amount=999999) -> 400
```
POST /admin/payments/transactions/01a116a4-ce28-7954-ba2a-7687ed7298ef/refunds
HTTP 400
{"error":{"code":"REFUND_EXCEEDS_REMAINING","message":"Refund amount 999999 exceeds the remaining refundable amount 393.68"}}
```
### T-API-05 — invalid reason -> 400
```
POST /admin/payments/transactions/01a116a4-ce28-7954-ba2a-7687ed7298ef/refunds
HTTP 400
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request data","fields":{"reason":"\"reason\" must be one of [free_cancellation, customer_request, hotel_cancelled, duplicate, fraudulent, other]"}}}
```
### T-API-06 — refund non-refundable txn -> 409/404
```
POST /admin/payments/transactions/00000000-0000-0000-0000-000000000000/refunds
HTTP 400
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request data","fields":{"transactionId":"\"transactionId\" must be a valid GUID"}}}
```
## Auth / cross-hotel
### T-API-07 — no token -> 401
```
GET /admin/payments/transactions
HTTP 401
{"success":false,"message":"Authentication required."}
```
### T-API-08 — foreign hotel summary -> 403
```
GET /admin/payments/hotels/01a105dc-24d4-7ffc-98e0-32d730d886d1/summary
HTTP 403
{"success":false,"message":"You do not have access to this hotel."}
```
### T-IDOR-READ-TXN — IDOR: manager GET FOREIGN transaction w/ OWN X-Hotel-Id
```
GET /admin/payments/transactions/01a116a4-ce28-7954-ba2a-7687ed7298ef
HTTP 200
{"data":{"id":"01a116a4-ce28-7954-ba2a-7687ed7298ef","booking_id":"01a116a4-ce27-7547-8587-71c430add81c","buyer_id":"01a11694-721d-7300-8ee1-5f0cd624c0d2","hotel_id":"01a105dc-24d4-7ffc-98e0-32d730d886d1","amount":"393.68","currency":"USD","status":"completed","transaction_type":"payment","payment_method":"card","stripe_payment_intent_id":"pi_3UNvI
```
### T-IDOR-REFUND — IDOR: manager initiate refund on FOREIGN txn (over-amount) w/ OWN X-Hotel-Id
```
POST /admin/payments/transactions/01a116a4-ce28-7954-ba2a-7687ed7298ef/refunds
HTTP 403
{"success":false,"message":"Insufficient permissions for this operation."}
```
foreignRefundId=
