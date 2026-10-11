# T — Admin Payments & Refunds: Supplementary evidence

## T-F1 — cross-hotel IDOR

Target transaction `01a116a4-ce28-7954-ba2a-7687ed7298ef` (hotel `01a105dc-24d4-…`, refundable,
amount 393.68). Actor: **owner** of hotel `01a105dc-2510-…` (has `payment.refund`), sending
`X-Hotel-Id: 01a105dc-2510-…`.

```
GET  /admin/payments/transactions/01a116a4-ce28-…            -> 200   (foreign txn data)
POST /admin/payments/transactions/01a116a4-ce28-…/refunds
     {"amount":999999,"reason":"customer_request"}            -> 400 REFUND_EXCEEDS_REMAINING
       ("Refund amount 999999 exceeds the remaining refundable amount 393.68")
```

The `400` (not `403`) proves the request **passed the hotel authz gate** and reached the refund
rules. With a valid amount it would have created a refund on the foreign transaction. The
`manager` returned `403` earlier only because the manager role lacks `payment.refund`.

`GET /admin/payments/hotels/<foreign>/summary` → `403` (hotel in the path → checked).

## Refund rules ✅

```
POST /admin/payments/transactions/<refundable>/refunds {"amount":999999} -> 400 REFUND_EXCEEDS_REMAINING
POST /admin/payments/transactions/<refundable>/refunds {"reason":"banana"} -> 400 VALIDATION_ERROR
GET  /admin/payments/refunds -> {"data":[],"meta":{"total":0}}   // no refund rows → read/retry IDOR untestable
```

## T-F2 — summary refund inconsistency

```
GET /admin/payments/hotels/01a105dc-2510-…/summary
{"totalTransactions":41,"byStatus":{"completed":37,"refunded":2,"cancelled":2},
 "grossAmount":174831.65,"refundedAmount":0,"netAmount":174831.65}
```
