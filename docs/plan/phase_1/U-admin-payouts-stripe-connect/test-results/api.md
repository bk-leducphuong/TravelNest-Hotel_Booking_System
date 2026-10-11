# Feature U — Admin Payouts & Stripe Connect · API evidence

_2026-10-09T18:40:37Z_

## Read (owner own hotel)
### U-API-01 — list payouts
```
GET /admin/payouts
HTTP 200
{"data":[],"meta":{"page":1,"limit":20,"total":0}}
```
### U-API-02 — hotel payout summary
```
GET /admin/payouts/hotels/01a105dc-2510-74f5-a07f-c79bab3b0002/summary
HTTP 200
{"data":{"hotelId":"01a105dc-2510-74f5-a07f-c79bab3b0002","byStatus":{},"totalAmount":0,"paidAmount":0,"pendingAmount":0,"payoutReady":false}}
```
### U-API-03 — connected accounts list
```
GET /admin/payouts/connected-accounts?hotelId=01a105dc-2510-74f5-a07f-c79bab3b0002
HTTP 200
{"data":[]}
```
### U-API-04 — check connected account
```
GET /admin/payouts/connected-accounts/check?hotelId=01a105dc-2510-74f5-a07f-c79bab3b0002
HTTP 200
{"data":{"configured":true,"hasAccount":false,"payoutReady":false,"account":null}}
```
## Generate / status
### U-API-05 — generate eligible (no ready account) -> 500
```
POST /admin/payouts/eligible
HTTP 000
{"data":{"configured":true,"hasAccount":false,"payoutReady":false,"account":null}}
```
### U-API-06 — set status pending->processing (own? foreign payout)
```
PATCH /admin/payouts/aaaaaaaa-0000-4000-8000-000000000001/status
HTTP 200
{"data":{"id":"aaaaaaaa-0000-4000-8000-000000000001","hotel_id":"01a105dc-24d4-7ffc-98e0-32d730d886d1","owner_id":"01a105e0-231f-7c5b-9020-2ac93a35114f","connected_payment_account_id":"aaaaaaaa-0000-4000-8000-000000000002","transaction_id":null,"provider":"stripe","provider_payout_id":null,"provider_transfer_id":null,"amount":"100.00","currency":"U
```
### U-API-07 — invalid transition processing->cancelled -> 409
```
PATCH /admin/payouts/aaaaaaaa-0000-4000-8000-000000000001/status
HTTP 409
{"error":{"code":"INVALID_PAYOUT_STATUS_TRANSITION","message":"Cannot change payout status from 'processing' to 'cancelled'"}}
```
### U-API-08 — invalid status value -> 400
```
PATCH /admin/payouts/aaaaaaaa-0000-4000-8000-000000000001/status
HTTP 400
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request data","fields":{"status":"\"status\" must be one of [pending, processing, paid, failed, cancelled]"}}}
```
## Auth / cross-hotel
### U-API-09 — no token -> 401
```
GET /admin/payouts
HTTP 401
{"success":false,"message":"Authentication required."}
```
### U-API-10 — foreign hotel summary -> 403
```
GET /admin/payouts/hotels/01a105dc-24d4-7ffc-98e0-32d730d886d1/summary
HTTP 403
{"success":false,"message":"You do not have access to this hotel."}
```
### U-IDOR-READ — IDOR: owner GET FOREIGN payout w/ OWN X-Hotel-Id
```
GET /admin/payouts/aaaaaaaa-0000-4000-8000-000000000001
HTTP 200
{"data":{"id":"aaaaaaaa-0000-4000-8000-000000000001","hotel_id":"01a105dc-24d4-7ffc-98e0-32d730d886d1","owner_id":"01a105e0-231f-7c5b-9020-2ac93a35114f","connected_payment_account_id":"aaaaaaaa-0000-4000-8000-000000000002","transaction_id":null,"provider":"stripe","provider_payout_id":null,"provider_transfer_id":null,"amount":"100.00","currency":"U
```
### U-IDOR-PROCESS — IDOR: owner process FOREIGN payout w/ OWN X-Hotel-Id
```
POST /admin/payouts/aaaaaaaa-0000-4000-8000-000000000001/process
HTTP 409
{"error":{"code":"PAYOUT_NOT_PROCESSABLE","message":"Only pending payouts can be processed (current status: processing)"}}
```
### U-IDOR-LINK — IDOR: owner create link for FOREIGN connected account
```
POST /admin/payouts/connected-accounts/aaaaaaaa-0000-4000-8000-000000000002/link
HTTP 400
{"error":{"code":"resource_missing","message":"No such account: 'acct_test_0002'"}}
```
