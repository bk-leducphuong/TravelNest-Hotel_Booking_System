# Feature R — Admin Inventory / Availability · API evidence

_2026-10-09T18:09:21Z_

## Read
### R-API-01 — hotel inventory rooms
```
GET /admin/inventory/hotels/01a105dc-2510-74f5-a07f-c79bab3b0002/rooms
HTTP 200
{"data":{"hotelId":"01a105dc-2510-74f5-a07f-c79bab3b0002","startDate":"2026-10-09","endDate":"2026-11-08","rooms":[{"roomId":"01a105dc-27b5-7383-b90b-066d3477633b","roomName":"Deluxe 390","roomType":"deluxe","roomStatus":"active","quantity":8,"hasInventory":true,"inventory":{"totalRooms":248,"bookedRooms":6,"heldRooms":0,"availableRooms":242,"avgPrice":199.46,"minPrice":81.19,"maxPrice":340.75,"da
```
### R-API-02 — room inventory range
```
GET /admin/inventory/rooms/01a105dc-27b5-7383-b90b-066d3477633b?startDate=2026-10-09&endDate=2026-10-11
HTTP 200
{"data":{"roomId":"01a105dc-27b5-7383-b90b-066d3477633b","roomName":"Deluxe 390","hotelId":"01a105dc-2510-74f5-a07f-c79bab3b0002","startDate":"2026-10-09","endDate":"2026-10-11","days":[{"date":"2026-10-09","totalRooms":8,"bookedRooms":0,"heldRooms":0,"availableRooms":8,"status":"open","pricePerNight":87.38,"currency":"USD"},{"date":"2026-10-10","totalRooms":8,"bookedRooms":0,"heldRooms":0,"availa
```
### R-API-03 — occupancy
```
GET /admin/inventory/hotels/01a105dc-2510-74f5-a07f-c79bab3b0002/occupancy
HTTP 200
{"data":{"hotelId":"01a105dc-2510-74f5-a07f-c79bab3b0002","startDate":"2026-10-09","endDate":"2026-11-08","totalRooms":992,"bookedRooms":24,"heldRooms":0,"availableRooms":968,"avgPrice":217.18,"occupancyRate":2.42,"dayCount":248,"roomCount":8}}
```
## Update (no-op changes to avoid mutating seed data)
### R-API-04 — patch range (status=open, no-op)
```
PATCH /admin/inventory/rooms/01a105dc-27b5-7383-b90b-066d3477633b
HTTP 200
{"data":{"roomId":"01a105dc-27b5-7383-b90b-066d3477633b","hotelId":"01a105dc-2510-74f5-a07f-c79bab3b0002","dateCount":2,"created":0,"updated":2}}
```
### R-API-05 — patch entries (no-op)
```
PATCH /admin/inventory/rooms/01a105dc-27b5-7383-b90b-066d3477633b
HTTP 200
{"data":{"roomId":"01a105dc-27b5-7383-b90b-066d3477633b","hotelId":"01a105dc-2510-74f5-a07f-c79bab3b0002","dateCount":1,"created":0,"updated":1}}
```
### R-API-06 — patch staff (room.manage_inventory, no-op)
```
PATCH /admin/inventory/rooms/01a105dc-27b5-7383-b90b-066d3477633b
HTTP 200
{"data":{"roomId":"01a105dc-27b5-7383-b90b-066d3477633b","hotelId":"01a105dc-2510-74f5-a07f-c79bab3b0002","dateCount":2,"created":0,"updated":2}}
```
## Oversell guard
### R-API-07 — set totalRooms=1 on date with 2 booked -> 409
```
PATCH /admin/inventory/rooms/01a105dc-27b5-7383-b90b-066d3477633b
HTTP 409
{"error":{"code":"INVENTORY_BELOW_BOOKED","message":"Cannot set total rooms below the 2 already booked on 2026-11-06"}}
```
## Validation
### R-API-08 — invalid status -> 400
```
PATCH /admin/inventory/rooms/01a105dc-27b5-7383-b90b-066d3477633b
HTTP 400
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request data","fields":{"status":"\"status\" must be one of [open, close, closed, sold_out, maintenance]"}}}
```
### R-API-09 — range > 366 days -> 400
```
PATCH /admin/inventory/rooms/01a105dc-27b5-7383-b90b-066d3477633b
HTTP 400
{"error":{"code":"DATE_RANGE_TOO_LARGE","message":"Date range cannot exceed 366 days"}}
```
### R-API-10 — no startDate/entries -> 400
```
PATCH /admin/inventory/rooms/01a105dc-27b5-7383-b90b-066d3477633b
HTTP 400
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request data","fields":{"":"\"value\" must contain at least one of [entries, startDate]"}}}
```
### R-API-11 — new date without price -> 400
```
PATCH /admin/inventory/rooms/01a105dc-27b5-7383-b90b-066d3477633b
HTTP 200
{"data":{"roomId":"01a105dc-27b5-7383-b90b-066d3477633b","hotelId":"01a105dc-2510-74f5-a07f-c79bab3b0002","dateCount":1,"created":1,"updated":0}}
```
## Auth / cross-hotel
### R-API-12 — no token -> 401
```
PATCH /admin/inventory/rooms/01a105dc-27b5-7383-b90b-066d3477633b
HTTP 401
{"success":false,"message":"Authentication required."}
```
### R-API-13 — IDOR: manager patches FOREIGN room with OWN X-Hotel-Id
```
PATCH /admin/inventory/rooms/01a105dc-2796-7bff-b5f7-36a5633c03d1
HTTP 200
{"data":{"roomId":"01a105dc-2796-7bff-b5f7-36a5633c03d1","hotelId":"01a105dc-24d4-7ffc-98e0-32d730d886d1","dateCount":2,"created":0,"updated":2}}
```
### R-API-14 — manager foreign hotel context -> 403
```
GET /admin/inventory/hotels/00000000-0000-0000-0000-000000000000/rooms
HTTP 403
{"success":false,"message":"You do not have access to this hotel."}
```
