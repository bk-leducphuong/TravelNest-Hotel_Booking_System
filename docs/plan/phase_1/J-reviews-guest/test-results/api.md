# Feature J — Reviews (guest) · API evidence

_2026-10-09T17:18:24Z_

### J-API-01 — hotel reviews (public)
```
GET /reviews/hotels/01a105dc-254c-74d1-974e-3db9407926cf
HTTP 200
{"data":[{"id":"01a105e2-5b45-719b-8309-34179ee2939d","rating_overall":"9.1","rating_cleanliness":"9.1","rating_location":"8.1","rating_service":"9.1","rating_value":"9.6","title":"Simply Perfect","comment":"Amazing experience, will definitely come back.","is_verified":false,"helpful_count":2,"status":"published","created_at":"2026-09-19T05:59:55.000Z","user":{"id":"01a105dc-1bdf-75a4-a3cc-546fcf1a523d","first_name":"Jonathan","last_name":"Volkman","profile_picture_url":null,"country":"South Afr
```
### J-API-02 — my reviews (auth)
```
GET /reviews
HTTP 200
{"data":[],"meta":{"page":1,"limit":20,"total":0}}
```
### J-API-03 — no token -> 401
```
GET /reviews
HTTP 401
{"success":false,"message":"Authentication required."}
```
### J-API-04 — validate eligible
```
GET /reviews/validate
HTTP 200
{"data":{"bookingCode":"BKMUY98EJBBD5CC8","bookingId":"01a116f3-cc97-78e4-8ca1-86d38d7d8010","isValid":true}}
```
### J-API-05 — check already reviewed (expect false)
```
GET /reviews/check
HTTP 200
{"data":{"exists":false}}
```
### J-API-06 — post review
```
POST /reviews
HTTP 201
{"data":{"reviewId":"01a121ac-5492-7d55-a9c7-c57685c916cf","status":"published","message":"Review posted successfully"}}
```
### J-API-07 — check again (expect true)
```
GET /reviews/check
HTTP 200
{"data":{"exists":true,"review":{"review_id":"01a121ac-5492-7d55-a9c7-c57685c916cf","rating":9,"title":"E2E review","comment":"Automated review from the feature J test run.","status":"published","created_at":"2026-10-09T17:18:24.000Z"}}}
```
### J-API-08 — duplicate review same booking -> conflict
```
POST /reviews
HTTP 409
{"error":{"code":"REVIEW_ALREADY_EXISTS","message":"This booking has already been reviewed"}}
```
### J-API-09 — my reviews (now has one)
```
GET /reviews
HTTP 200
{"data":[{"id":"01a121ac-5492-7d55-a9c7-c57685c916cf","hotel_id":"01a105dc-254c-74d1-974e-3db9407926cf","booking_id":"01a116f3-cc97-78e4-8ca1-86d38d7d8010","rating_overall":"9.0","title":"E2E review","comment":"Automated review from the feature J test run.","status":"published","is_verified":true,"helpful_count":0,"created_at":"2026-10-09T17:18:24.000Z","updated_at":"2026-10-09T17:18:24.000Z","hotel":{"id":"01a105dc-254c-74d1-974e-3db9407926cf","name":"Suites House"},"user":{"id":"01a11694-721d-
```
### J-API-10 — hotel reviews (published?)
```
GET /reviews/hotels/01a105dc-254c-74d1-974e-3db9407926cf?limit=3
HTTP 200
{"data":[{"id":"01a121ac-5492-7d55-a9c7-c57685c916cf","rating_overall":"9.0","rating_cleanliness":"9.0","rating_location":"8.0","rating_service":"9.0","rating_value":"8.0","title":"E2E review","comment":"Automated review from the feature J test run.","is_verified":true,"helpful_count":0,"status":"published","created_at":"2026-10-09T17:18:24.000Z","user":{"id":"01a11694-721d-7300-8ee1-5f0cd624c0d2","first_name":"Test","last_name":"User","profile_picture_url":null,"country":null},"reply":null,"med
```
### J-API-11 — review non-completed booking -> deny
```
POST /reviews
HTTP 404
{"error":{"code":"BOOKING_NOT_FOUND","message":"Booking not found or not eligible for review"}}
```
### J-API-12 — review another user's completed booking -> deny
```
POST /reviews
HTTP 404
{"error":{"code":"BOOKING_NOT_FOUND","message":"Booking not found or not eligible for review"}}
```
### J-API-13 — validate non-completed -> not eligible
```
GET /reviews/validate
HTTP 404
{"error":{"code":"BOOKING_NOT_FOUND","message":"Booking not found or not eligible for review"}}
```
### J-API-14 — invalid body (missing comment) -> 400
```
POST /reviews
HTTP 400
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request data","fields":{"comment":"\"comment\" is required"}}}
```
### J-API-15 — rating out of range (11) -> 400
```
POST /reviews
HTTP 400
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request data","fields":{"ratings.overall":"\"ratings.overall\" must be less than or equal to 10"}}}
```
### J-API-16 — post no token -> 401
```
POST /reviews
HTTP 401
{"success":false,"message":"Authentication required."}
```
### J-API-17 — user B validate A's booking -> not eligible
```
GET /reviews/validate
HTTP 404
{"error":{"code":"BOOKING_NOT_FOUND","message":"Booking not found or not eligible for review"}}
```
