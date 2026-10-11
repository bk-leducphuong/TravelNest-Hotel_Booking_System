# Feature I — Payments (guest) + Stripe webhook · API evidence

_2026-10-11T05:31:40Z · Stripe CLI active_

bookingId=01a12972-02c7-75be-be15-35c1cea68c46 transactionId=01a12972-02cb-7ed3-a3bd-c266ac2a354f
## Payment intent
### I-API-01 — create payment intent
```
POST /bookings/01a12972-02c7-75be-be15-35c1cea68c46/payment-intent
HTTP 201
{"success":true,"data":{"clientSecret":"pi_3UPFMGC8yETwFKHF250KuMsD_secret_twsgT7z7JyvO3yueLAD4PqIHa","paymentIntentId":"pi_3UPFMGC8yETwFKHF250KuMsD","status":"pending","bookingId":"01a12972-02c7-75be-be15-35c1cea68c46","bookingCode":"BKMV3DYDONF4F123"}}
```
### I-API-02 — reuse intent (idempotent)
```
POST /bookings/01a12972-02c7-75be-be15-35c1cea68c46/payment-intent
HTTP 201
{"success":true,"data":{"clientSecret":"pi_3UPFMGC8yETwFKHF250KuMsD_secret_twsgT7z7JyvO3yueLAD4PqIHa","paymentIntentId":"pi_3UPFMGC8yETwFKHF250KuMsD","status":"pending","bookingId":"01a12972-02c7-75be-be15-35c1cea68c46","bookingCode":"BKMV3DYDONF4F123"}}
```
## Payment reads
### I-API-04a — list my payments
```
GET /payments?limit=5
HTTP 200
{"success":true,"data":[{"id":"01a12972-02cb-7ed3-a3bd-c266ac2a354f","booking_id":"01a12972-02c7-75be-be15-35c1cea68c46","buyer_id":"01a11694-721d-7300-8ee1-5f0cd624c0d2","hotel_id":"01a105dc-24d4-7ffc-98e0-32d730d886d1","amount":"353.71","currency":"USD","status":"pending","transaction_type":"payment","payment_method":"card","stripe_payment_intent_id":"pi_3UPFMGC8yETwFKHF250KuMsD","stripe_charge_
```
### I-API-04b — payment by booking
```
GET /payments/bookings/01a12972-02c7-75be-be15-35c1cea68c46
HTTP 200
{"success":true,"data":{"id":"01a12972-02cb-7ed3-a3bd-c266ac2a354f","booking_id":"01a12972-02c7-75be-be15-35c1cea68c46","buyer_id":"01a11694-721d-7300-8ee1-5f0cd624c0d2","hotel_id":"01a105dc-24d4-7ffc-98e0-32d730d886d1","amount":"353.71","currency":"USD","status":"pending","transaction_type":"payment","payment_method":"card","stripe_payment_intent_id":"pi_3UPFMGC8yETwFKHF250KuMsD","stripe_charge_i
```
### I-API-04c — payment by transaction
```
GET /payments/transactions/01a12972-02cb-7ed3-a3bd-c266ac2a354f
HTTP 200
{"success":true,"data":{"id":"01a12972-02cb-7ed3-a3bd-c266ac2a354f","booking_id":"01a12972-02c7-75be-be15-35c1cea68c46","buyer_id":"01a11694-721d-7300-8ee1-5f0cd624c0d2","hotel_id":"01a105dc-24d4-7ffc-98e0-32d730d886d1","amount":"353.71","currency":"USD","status":"pending","transaction_type":"payment","payment_method":"card","stripe_payment_intent_id":"pi_3UPFMGC8yETwFKHF250KuMsD","stripe_charge_i
```
## Webhook signature
### I-API-06a — webhook invalid signature -> 400
```
POST /webhooks/stripe
HTTP 400
{"error":"Invalid signature"}
```
### I-API-06b — webhook no signature -> 400
```
POST /webhooks/stripe
HTTP 400
{"error":"Invalid signature"}
```
## Cleanup (cancel the test booking)
### I-CLEANUP — cancel test booking
```
DELETE /bookings/01a12972-02c7-75be-be15-35c1cea68c46
HTTP 200
{"success":true,"data":{"bookingId":"01a12972-02c7-75be-be15-35c1cea68c46","bookingCode":"BKMV3DYDONF4F123","message":"Booking cancelled successfully","refundProcessed":false,"cancellationPolicy":{"eligible":true,"eligibility":"eligible","reason":"free_cancellation","refundAmount":353.71,"refundPercent":100,"currency":"USD","isRefundable":true,"ruleId":"01a105df-d873-76e2-a0c7-7e9ad4b348ba","freeC
```
