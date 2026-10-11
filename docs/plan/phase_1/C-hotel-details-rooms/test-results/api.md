# Feature C — Hotel Details, Rooms & Policies · API evidence

_Generated 2026-10-09T13:28:30Z · hotel=01a105dc-24d4-7ffc-98e0-32d730d886d1 window=2026-10-11..2026-10-13_

### C-API-01 — hotel details (no query)
```
GET /hotels/01a105dc-24d4-7ffc-98e0-32d730d886d1
HTTP 200  time=0.021532s
{"data":{"hotel":{"id":"01a105dc-24d4-7ffc-98e0-32d730d886d1","name":"View Hotel","description":"Conservo quibusdam contabesco corona ocer conservo vicissitudo. Vinco chirographum suppellex deleo talio delectatio umerus tenus. Rem subito vos conculco varius. Valde succurro tener qui. Vae viscus ventito stillicidium auctus defetiscor approbo decor. Rerum ceno odio facere adulescens compono ubi universe via.","address":"59059 Loraine Fall Suite 856","city":{"id":"01a105dc-0eeb-74b6-8a47-5e200f348df5","name":"Ha Noi","slug":"ha-noi","latitude":"21.0278000","longitude":"105.8342000"},"country":{"id":"01a105dc-0edc-7ce1-ab3c-a15746869e73","name":"
```
### C-API-02 — hotel details with dates+guests
```
GET /hotels/01a105dc-24d4-7ffc-98e0-32d730d886d1
HTTP 200  time=0.015916s
{"data":{"hotel":{"id":"01a105dc-24d4-7ffc-98e0-32d730d886d1","name":"View Hotel","description":"Conservo quibusdam contabesco corona ocer conservo vicissitudo. Vinco chirographum suppellex deleo talio delectatio umerus tenus. Rem subito vos conculco varius. Valde succurro tener qui. Vae viscus ventito stillicidium auctus defetiscor approbo decor. Rerum ceno odio facere adulescens compono ubi universe via.","address":"59059 Loraine Fall Suite 856","city":{"id":"01a105dc-0eeb-74b6-8a47-5e200f348df5","name":"Ha Noi","slug":"ha-noi","latitude":"21.0278000","longitude":"105.8342000"},"country":{"id":"01a105dc-0edc-7ce1-ab3c-a15746869e73","name":"
```
### C-API-03 — hotel rooms
```
GET /hotels/01a105dc-24d4-7ffc-98e0-32d730d886d1/rooms
HTTP 200  time=0.014049s
{"data":[{"roomId":"01a105dc-2796-7bff-b5f7-36a5633c03d1","roomName":"Single 733","maxGuests":3,"roomImageUrls":[{"id":"01a105e5-f665-7ab2-920d-23c7f7b8deae","bucket_name":"uploads","object_key":"room/01a105dc-2796-7bff-b5f7-36a5633c03d1/01a105e5-f665-7ab2-920d-23c7f7b8deae.avif","original_filename":"room_1.avif","width":323,"height":156,"is_primary":true,"display_order":0,"image_variants":[{"id":"01a105e5-f665-7ab2-920d-23c835f184a0","variant_type":"medium_webp","bucket_name":"uploads","object_key":"room/01a105dc-2796-7bff-b5f7-36a5633c03d1/01a105e5-f665-7ab2-920d-23c7f7b8deae_medium.webp","width":323,"height":156}]},{"id":"01a105e5-f665-7ab
```
### C-API-04 — hotel policies
```
GET /hotels/01a105dc-24d4-7ffc-98e0-32d730d886d1/policies
HTTP 200  time=0.007226s
{"data":[{"id":"01a105df-d456-7048-baff-7a7d9ea86152","policyType":"cancellation","title":"Free Cancellation","description":"Free cancellation up to 24 hours before check-in. After that, a cancellation fee equal to one night stay will be charged.","displayOrder":0,"icon":"cancel"},{"id":"01a105df-d456-7048-baff-7a7e945b35b2","policyType":"children","title":"Adults Only","description":"This property does not accommodate children. Guests must be 18 years or older to book.","displayOrder":1,"icon":"adults-only"},{"id":"01a105df-d456-7048-baff-7a7f2bfb3ce1","policyType":"pets","title":"Pet Friendly","description":"We welcome your furry friends! N
```
### C-API-05 — details: only checkInDate -> 400
```
GET /hotels/01a105dc-24d4-7ffc-98e0-32d730d886d1
HTTP 400  time=0.002038s
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request data","fields":{"":"\"value\" failed custom validation because "}}}
```
### C-API-06 — details: checkOut<=checkIn -> 400
```
GET /hotels/01a105dc-24d4-7ffc-98e0-32d730d886d1
HTTP 400  time=0.000913s
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request data","fields":{"":"\"value\" failed custom validation because "}}}
```
### C-API-07 — details: non-uuid hotelId -> ?
```
GET /hotels/not-a-uuid
HTTP 404  time=0.001969s
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Error</title>
</head>
<body>
<pre>Cannot GET /api/v1/hotels/not-a-uuid</pre>
</body>
</html>
```
### C-API-08 — details: missing hotel uuid -> ?
```
GET /hotels/00000000-0000-0000-0000-000000000000
HTTP 404  time=0.004887s
{"error":{"code":"HOTEL_NOT_FOUND","message":"Hotel not found"}}
```
### C-API-09 — rooms: missing dates -> 400
```
GET /hotels/01a105dc-24d4-7ffc-98e0-32d730d886d1/rooms
HTTP 400  time=0.001174s
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request data","fields":{"checkInDate":"checkInDate is required","checkOutDate":"checkOutDate is required"}}}
```
### C-API-10 — rooms: checkOut<=checkIn -> 400
```
GET /hotels/01a105dc-24d4-7ffc-98e0-32d730d886d1/rooms
HTTP 400  time=0.001479s
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request data","fields":{"":"\"value\" failed custom validation because "}}}
```
### C-API-11 — rooms: numberOfRooms=0 -> 400
```
GET /hotels/01a105dc-24d4-7ffc-98e0-32d730d886d1/rooms
HTTP 400  time=0.000849s
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request data","fields":{"numberOfRooms":"Must be a positive number"}}}
```
### C-API-12 — rooms: missing hotel uuid -> ?
```
GET /hotels/00000000-0000-0000-0000-000000000000/rooms
HTTP 404  time=0.002634s
{"error":{"code":"HOTEL_NOT_FOUND","message":"Hotel not found"}}
```
### C-API-13 — policies: non-uuid hotelId -> ?
```
GET /hotels/not-a-uuid/policies
HTTP 404  time=0.000977s
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Error</title>
</head>
<body>
<pre>Cannot GET /api/v1/hotels/not-a-uuid/policies</pre>
</body>
</html>
```
### C-API-14 — policies: missing hotel uuid -> ?
```
GET /hotels/00000000-0000-0000-0000-000000000000/policies
HTTP 404  time=0.002629s
{"error":{"code":"HOTEL_NOT_FOUND","message":"Hotel not found"}}
```
### C-API-15 — rooms: pagination limit=2
```
GET /hotels/01a105dc-24d4-7ffc-98e0-32d730d886d1/rooms
HTTP 200  time=0.011345s
{"data":[{"roomId":"01a105dc-2796-7bff-b5f7-36a5633c03d1","roomName":"Single 733","maxGuests":3,"roomImageUrls":[{"id":"01a105e5-f665-7ab2-920d-23c7f7b8deae","bucket_name":"uploads","object_key":"room/01a105dc-2796-7bff-b5f7-36a5633c03d1/01a105e5-f665-7ab2-920d-23c7f7b8deae.avif","original_filename":"room_1.avif","width":323,"height":156,"is_primary":true,"display_order":0,"image_variants":[{"id":"01a105e5-f665-7ab2-920d-23c835f184a0","variant_type":"medium_webp","bucket_name":"uploads","object_key":"room/01a105dc-2796-7bff-b5f7-36a5633c03d1/01a105e5-f665-7ab2-920d-23c7f7b8deae_medium.webp","width":323,"height":156}]},{"id":"01a105e5-f665-7ab
```
## Performance (details/rooms x5)
  details run1: 200 0.006598s
  details run2: 200 0.006342s
  details run3: 200 0.006867s
  details run4: 200 0.005796s
  details run5: 200 0.005742s
  rooms   run1: 200 0.007595s
  rooms   run2: 200 0.006385s
  rooms   run3: 200 0.007133s
  rooms   run4: 200 0.010348s
  rooms   run5: 200 0.006110s
