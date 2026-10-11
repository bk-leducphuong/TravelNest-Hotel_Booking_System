# Feature M — Onboarding / Become a Host · API evidence

_2026-10-09T17:36:19Z_

## Auth
### M-API-01 — submit join no token -> 401
```
POST /join
HTTP 401
{"success":false,"message":"Authentication required."}
```
### M-API-02 — upload photos no token -> 401
```
POST /join/photos
HTTP 401
{"success":false,"message":"Authentication required."}
```
## Validation
### M-API-03 — submit invalid body -> 400
```
POST /join
HTTP 400
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request data","fields":{"joinFormData.hotelName":"\"joinFormData.hotelName\" is not allowed to be empty","joinFormData.streetName":"streetName is required","joinFormData.city":"city is required","joinFormData.coordinates":"coordinates are required","joinFormData.checkInFrom":"Time is required","joinFormData.checkInTo":"Time is required","joinFormData.checkOutFrom":"Time is required","joinFormData.checkOutTo":"Time is required","joinFormData.
```
### M-API-04 — photos missing ids -> 400
```
POST /join/photos
HTTP 400
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request data","fields":{"hotel_id":"hotel_id is required","room_id":"room_id is required"}}}
```
### M-API-05 — photos no files -> 400
```
POST /join/photos
HTTP 400
{"error":{"code":"NO_FILES_UPLOADED","message":"No files uploaded"}}
```
## Happy path
### M-API-06 — submit valid join -> 201
```
POST /join
HTTP 500
{"error":{"code":"INTERNAL_ERROR","message":"Internal server error"}}
```
createdHotelId= createdRoomId=
