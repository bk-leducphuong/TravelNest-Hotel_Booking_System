# Feature V — Admin Reviews & Moderation · API evidence

_2026-10-10T08:59:59Z_

## Read (owner own hotel)
### V-API-01 — list reviews
```
GET /admin/reviews?limit=3
HTTP 200
{"data":[{"id":"01a105e2-5a78-74c1-86ef-c89d1429624f","user_id":"01a105dc-2342-7b7d-9e5c-082de9e59b4b","hotel_id":"01a105dc-2510-74f5-a07f-c79bab3b0002","booking_id":null,"rating_overall":"7.1","rating_cleanliness":"7.5","rating_location":"6.4","rating_service":"7.0","rating_value":"8.3","title":"Great Stay","comment":"Very nice stay, enjoyed it th
```
### V-API-02 — review summary
```
GET /admin/reviews/summary?hotelId=01a105dc-2510-74f5-a07f-c79bab3b0002
HTTP 200
{"data":{"hotelId":"01a105dc-2510-74f5-a07f-c79bab3b0002","totalReviews":26,"byStatus":{"published":23,"hidden":3,"deleted":0},"publishedCount":23,"averageRating":7.74,"repliedCount":9,"unrepliedCount":14}}
```
### V-API-03 — get review
```
GET /admin/reviews/01a105e2-5a78-74c1-86ef-c8910975624c
HTTP 200
{"data":{"id":"01a105e2-5a78-74c1-86ef-c8910975624c","user_id":"01a105dc-1af9-7edb-af7d-c1ea7aed6c97","hotel_id":"01a105dc-2510-74f5-a07f-c79bab3b0002","booking_id":null,"rating_overall":"9.3","rating_cleanliness":"9.2","rating_location":"7.9","rating_service":"9.0","rating_value":"9.6","title":"Outstanding Experience!","comment":"Excellent hotel w
```
## Permissions
### V-API-04 — owner moderate (no review.moderate) -> 403
```
PATCH /admin/reviews/01a105e2-5a78-74c1-86ef-c8910975624c/status
HTTP 200
{"data":{"reviewId":"01a105e2-5a78-74c1-86ef-c8910975624c","previousStatus":"published","status":"hidden"}}
```
### V-API-05 — support moderate (has review.moderate) -> 200
```
PATCH /admin/reviews/01a105e2-5a78-74c1-86ef-c8910975624c/status
HTTP 200
{"data":{"reviewId":"01a105e2-5a78-74c1-86ef-c8910975624c","previousStatus":"hidden","status":"published"}}
```
## Reply lifecycle (owner, review.reply)
### V-API-06 — create reply
```
POST /admin/reviews/01a105e2-5a78-74c1-86ef-c8910975624c/reply
HTTP 201
{"data":{"replyId":"01a1250a-6270-7c0d-9630-d8aa8385ddad","reviewId":"01a105e2-5a78-74c1-86ef-c8910975624c","reply":"Thank you for your feedback (E2E)."}}
```
### V-API-07 — update reply
```
PATCH /admin/reviews/01a105e2-5a78-74c1-86ef-c8910975624c/reply
HTTP 200
{"data":{"reviewId":"01a105e2-5a78-74c1-86ef-c8910975624c","reply":"Updated reply (E2E)."}}
```
### V-API-08 — delete reply
```
DELETE /admin/reviews/01a105e2-5a78-74c1-86ef-c8910975624c/reply
HTTP 200
{"data":{"reviewId":"01a105e2-5a78-74c1-86ef-c8910975624c","deleted":true}}
```
## Auth / cross-hotel
### V-API-09 — no token -> 401
```
GET /admin/reviews
HTTP 401
{"success":false,"message":"Authentication required."}
```
### V-API-10 — foreign hotel summary -> 403
```
GET /admin/reviews/summary?hotelId=01a105dc-24d4-7ffc-98e0-32d730d886d1
HTTP 403
{"success":false,"message":"You do not have access to this hotel."}
```
### V-IDOR-READ — IDOR: owner GET FOREIGN review w/ OWN X-Hotel-Id
```
GET /admin/reviews/01a105e2-59c3-760d-9814-fbb929ba49f9
HTTP 200
{"data":{"id":"01a105e2-59c3-760d-9814-fbb929ba49f9","user_id":"01a105dc-2380-7360-81c0-45b273c9c7ec","hotel_id":"01a105dc-24d4-7ffc-98e0-32d730d886d1","booking_id":null,"rating_overall":"5.0","rating_cleanliness":"5.7","rating_location":"5.9","rating_service":"4.8","rating_value":"3.7","title":"Average Experience","comment":"Okay stay, but could b
```
### V-IDOR-REPLY — IDOR: owner reply to FOREIGN review w/ OWN X-Hotel-Id
```
POST /admin/reviews/01a105e2-59c3-760d-9814-fbb929ba49f9/reply
HTTP 201
{"data":{"replyId":"01a1250a-62ed-7a5d-96ef-135d98038cf4","reviewId":"01a105e2-59c3-760d-9814-fbb929ba49f9","reply":"IDOR probe reply"}}
```
### V-IDOR-STATUS — IDOR: support moderate FOREIGN review (platform staff, global) w/ OWN X-Hotel-Id
```
PATCH /admin/reviews/01a105e2-59c3-760d-9814-fbb929ba49f9/status
HTTP 409
{"error":{"code":"INVALID_REVIEW_STATUS_TRANSITION","message":"Cannot change review status from 'published' to 'published'"}}
```
