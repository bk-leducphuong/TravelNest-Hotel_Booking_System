# Feature K — Notifications & Realtime · API evidence

_2026-10-09T17:24:01Z_

### K-API-01 — list notifications
```
GET /notifications
HTTP 200
{"data":[{"id":"cc0ee71f-c264-11f1-90cb-023cb3bf4c2b","receiver_id":"01a11694-721d-7300-8ee1-5f0cd624c0d2","notification_type":"booking_expired","category":"booking","priority":"high","title":"Booking Expired - BKMUY98J1KAED7CD","message":"Your booking BKMUY98J1KAED7CD expired because payment was not completed before 2026-10-07T15:35:44.000Z. No charge was made.","metadata":{"bookingCode":"BKMUY98J1KAED7CD","bookingId":"01a116f3-e368-7ef2-951d-023487bbc9fa","checkInDate":"2026-11-14","checkOutDate":"2026-11-16","eventId":"01a116f3-e368-7ef2-951d-023487bbc9fa-booking-expired","paymentDueAt":"20
```
### K-API-02 — list unreadOnly
```
GET /notifications?unreadOnly=true
HTTP 200
{"data":[{"id":"cc0ee71f-c264-11f1-90cb-023cb3bf4c2b","receiver_id":"01a11694-721d-7300-8ee1-5f0cd624c0d2","notification_type":"booking_expired","category":"booking","priority":"high","title":"Booking Expired - BKMUY98J1KAED7CD","message":"Your booking BKMUY98J1KAED7CD expired because payment was not completed before 2026-10-07T15:35:44.000Z. No charge was made.","metadata":{"bookingCode":"BKMUY98J1KAED7CD","bookingId":"01a116f3-e368-7ef2-951d-023487bbc9fa","checkInDate":"2026-11-14","checkOutDate":"2026-11-16","eventId":"01a116f3-e368-7ef2-951d-023487bbc9fa-booking-expired","paymentDueAt":"20
```
### K-API-03 — unread count
```
GET /notifications/unread-count
HTTP 200
{"data":{"unreadCount":45}}
```
### K-API-04 — pagination limit=5
```
GET /notifications?limit=5
HTTP 200
{"data":[{"id":"cc0f46c8-c264-11f1-90cb-023cb3bf4c2b","receiver_id":"01a11694-721d-7300-8ee1-5f0cd624c0d2","notification_type":"booking_expired","category":"booking","priority":"high","title":"Booking Expired - BKMUY98JEP01621C","message":"Your booking BKMUY98JEP01621C expired because payment was not completed before 2026-10-07T15:35:45.000Z. No charge was made.","metadata":{"bookingCode":"BKMUY98JEP01621C","bookingId":"01a116f3-e541-7c7b-85cb-5270cb64abe4","checkInDate":"2026-11-02","checkOutDate":"2026-11-04","eventId":"01a116f3-e541-7c7b-85cb-5270cb64abe4-booking-expired","paymentDueAt":"20
```
### K-API-05 — list no token -> 401
```
GET /notifications
HTTP 401
{"success":false,"message":"Authentication required."}
```
### K-API-06 — unread-count no token -> 401
```
GET /notifications/unread-count
HTTP 401
{"success":false,"message":"Authentication required."}
```
### K-API-07 — read-all no token -> 401
```
PATCH /notifications/read-all
HTTP 401
{"success":false,"message":"Authentication required."}
```
notificationId=cc0f46c8-c264-11f1-90cb-023cb3bf4c2b
### K-API-08 — mark one read
```
PATCH /notifications/cc0f46c8-c264-11f1-90cb-023cb3bf4c2b/read
HTTP 200
{"data":{"message":"Notification marked as read"}}
```
### K-API-09 — mark one read invalid uuid -> 400
```
PATCH /notifications/not-a-uuid/read
HTTP 400
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request data","fields":{"notificationId":"notificationId must be a valid UUID"}}}
```
### K-API-10 — user B marks A's notification read -> ?
```
PATCH /notifications/cc0f46c8-c264-11f1-90cb-023cb3bf4c2b/read
HTTP 403
{"error":{"code":"FORBIDDEN","message":"You do not have permission to mark this notification as read"}}
```
### K-API-11 — unknown notification uuid -> ?
```
PATCH /notifications/00000000-0000-0000-0000-000000000000/read
HTTP 404
{"error":{"code":"NOTIFICATION_NOT_FOUND","message":"Notification not found"}}
```
### K-API-12 — count before read-all
```
GET /notifications/unread-count
HTTP 200
{"data":{"unreadCount":44}}
```
### K-API-13 — mark all read
```
PATCH /notifications/read-all
HTTP 200
{"data":{"message":"All notifications marked as read","updatedCount":44}}
```
### K-API-14 — count after read-all
```
GET /notifications/unread-count
HTTP 200
{"data":{"unreadCount":0}}
```
