# Feature Q — Admin Properties / Catalog · API evidence

_2026-10-09T18:05:27Z_

## Hotel read/update
### Q-API-01 — get own hotel
```
GET /admin/hotels/01a105dc-2510-74f5-a07f-c79bab3b0002
HTTP 200
{"data":{"hotel":{"id":"01a105dc-2510-74f5-a07f-c79bab3b0002","name":"The Poplar Road Inn","description":"Sto vehemens pauper calamitas colo vado compello varius. Tempora ascisco somnus. Similique minima tonsor commodo acer natus pauper ascisco solum. Corrigo claustrum acies deleo thorax ipsam dolorum conservo dedecor tres. Aegre natus quae subseco. Patria vapulus consectetur ustulo studio causa c
```
### Q-API-02 — get foreign hotel -> 403
```
GET /admin/hotels/00000000-0000-0000-0000-000000000000
HTTP 403
{"success":false,"message":"You do not have access to this hotel."}
```
### Q-API-03 — patch own hotel (owner)
```
PATCH /admin/hotels/01a105dc-2510-74f5-a07f-c79bab3b0002
HTTP 500
{"error":{"code":"INTERNAL_ERROR","message":"Internal server error"}}
```
### Q-API-04 — patch own hotel (manager)
```
PATCH /admin/hotels/01a105dc-2510-74f5-a07f-c79bab3b0002
HTTP 500
{"error":{"code":"INTERNAL_ERROR","message":"Internal server error"}}
```
### Q-API-05 — patch own hotel (staff, no hotel.update) -> 403
```
PATCH /admin/hotels/01a105dc-2510-74f5-a07f-c79bab3b0002
HTTP 403
{"success":false,"message":"Insufficient permissions for this operation."}
```
### Q-API-06 — patch foreign hotel -> 403
```
PATCH /admin/hotels/00000000-0000-0000-0000-000000000000
HTTP 403
{"success":false,"message":"You do not have access to this hotel."}
```
### Q-API-07 — patch invalid hotelClass=9 -> 400
```
PATCH /admin/hotels/01a105dc-2510-74f5-a07f-c79bab3b0002
HTTP 400
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request data","fields":{"hotelClass":"\"hotelClass\" must be less than or equal to 5"}}}
```
## Rooms CRUD
### Q-API-08 — list rooms
```
GET /admin/hotels/01a105dc-2510-74f5-a07f-c79bab3b0002/rooms
HTTP 200
{"data":{"rooms":[{"id":"01a105dc-27b5-7383-b90b-066d3477633b","hotel_id":"01a105dc-2510-74f5-a07f-c79bab3b0002","room_name":"Deluxe 390","room_type":"deluxe","quantity":8,"max_guests":3,"status":"active"},{"id":"01a105dc-27b5-7383-b90b-0673a5761029","hotel_id":"01a105dc-2510-74f5-a07f-c79bab3b0002","room_name":"Deluxe 683","room_type":"deluxe","quantity":9,"max_guests":2,"status":"active"},{"id":
```
### Q-API-09 — create room
```
POST /admin/hotels/01a105dc-2510-74f5-a07f-c79bab3b0002/rooms
HTTP 201
{"data":{"room":{"created_at":"2026-10-09T18:05:27.832Z","updated_at":{"val":"CURRENT_TIMESTAMP"},"id":"01a121d7-6998-7e9c-b425-4e8ffbe523e3","status":"active","room_name":"Q E2E Room","max_guests":2,"hotel_id":"01a105dc-2510-74f5-a07f-c79bab3b0002","room_type":"double","quantity":2}}}
```
createdRoomId=01a121d7-6998-7e9c-b425-4e8ffbe523e3
### Q-API-10 — update room
```
PATCH /admin/hotels/01a105dc-2510-74f5-a07f-c79bab3b0002/rooms/01a121d7-6998-7e9c-b425-4e8ffbe523e3
HTTP 200
{"data":{"room":{"id":"01a121d7-6998-7e9c-b425-4e8ffbe523e3","hotel_id":"01a105dc-2510-74f5-a07f-c79bab3b0002","room_name":"Q E2E Room","room_type":"double","quantity":2,"max_guests":3,"status":"active"}}}
```
### Q-API-11 — create room missing roomName -> 400
```
POST /admin/hotels/01a105dc-2510-74f5-a07f-c79bab3b0002/rooms
HTTP 400
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request data","fields":{"roomName":"\"roomName\" is required"}}}
```
### Q-API-12 — delete room
```
DELETE /admin/hotels/01a105dc-2510-74f5-a07f-c79bab3b0002/rooms/01a121d7-6998-7e9c-b425-4e8ffbe523e3
HTTP 200
{"data":{"roomId":"01a121d7-6998-7e9c-b425-4e8ffbe523e3","hotelId":"01a105dc-2510-74f5-a07f-c79bab3b0002"}}
```
## Policies CRUD
### Q-API-13 — list policies
```
GET /admin/hotels/01a105dc-2510-74f5-a07f-c79bab3b0002/policies
HTTP 200
{"data":{"policies":[{"id":"01a105df-d48b-747b-8c3f-2a8675212c9a","hotel_id":"01a105dc-2510-74f5-a07f-c79bab3b0002","policy_type":"cancellation","title":"Non-Refundable","description":"This is a non-refundable booking. No refunds will be provided for cancellations or early check-out.","is_active":true,"display_order":0,"icon":"no-refund","created_at":"2025-12-04T10:47:56.000Z","updated_at":"2026-0
```
### Q-API-14 — create policy
```
POST /admin/hotels/01a105dc-2510-74f5-a07f-c79bab3b0002/policies
HTTP 201
{"data":{"policy":{"id":"01a121d7-6a21-7c7c-9713-34477cac706d","hotel_id":"01a105dc-2510-74f5-a07f-c79bab3b0002","policy_type":"cancellation","title":"Q E2E Policy","description":"Test policy.","display_order":0,"icon":null,"is_active":true,"created_at":"2026-10-09T18:05:27.969Z","updated_at":"2026-10-09T18:05:27.970Z"}}}
```
createdPolicyId=
### Q-API-15 — update policy
```
PATCH /admin/hotels/01a105dc-2510-74f5-a07f-c79bab3b0002/policies/
HTTP 404
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Error</title>
</head>
<body>
<pre>Cannot PATCH /api/v1/admin/hotels/01a105dc-2510-74f5-a07f-c79bab3b0002/policies/</pre>
</body>
</html>
```
### Q-API-16 — create policy invalid type -> 400
```
POST /admin/hotels/01a105dc-2510-74f5-a07f-c79bab3b0002/policies
HTTP 400
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request data","fields":{"policyType":"\"policyType\" must be one of [cancellation, children, pets, payment, smoking, damage, age_restriction, internet, parking, breakfast, group_booking, additional_fees, other]"}}}
```
### Q-API-17 — delete policy
```
DELETE /admin/hotels/01a105dc-2510-74f5-a07f-c79bab3b0002/policies/
HTTP 404
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Error</title>
</head>
<body>
<pre>Cannot DELETE /api/v1/admin/hotels/01a105dc-2510-74f5-a07f-c79bab3b0002/policies/</pre>
</body>
</html>
```
## Cross-hotel / auth
### Q-API-18 — owner foreign rooms -> 403
```
GET /admin/hotels/00000000-0000-0000-0000-000000000000/rooms
HTTP 403
{"success":false,"message":"You do not have access to this hotel."}
```
### Q-API-19 — no token get hotel -> 401
```
GET /admin/hotels/01a105dc-2510-74f5-a07f-c79bab3b0002
HTTP 401
{"success":false,"message":"Authentication required."}
```
### Q-API-20 — staff create room (no room.create) -> 403
```
POST /admin/hotels/01a105dc-2510-74f5-a07f-c79bab3b0002/rooms
HTTP 403
{"success":false,"message":"Insufficient permissions for this operation."}
```
