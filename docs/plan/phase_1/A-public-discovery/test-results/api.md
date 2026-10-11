# Feature A — Public Discovery & Content · API evidence

_Generated 2026-10-09T13:08:52Z against http://localhost:3000/api/v1_

### A-API-01 — trending (public, limit=3)
```
GET /hotels/trending?limit=3
HTTP 200  time=0.008607s
{"data":[{"id":"01a105dc-24d4-7ffc-98e0-32d730d886d1","name":"View Hotel","address":"59059 Loraine Fall Suite 856","city":{"id":"01a105dc-0eeb-74b6-8a47-5e200f348df5","name":"Ha Noi","slug":"ha-noi"},"country":{"id":"01a105dc-0edc-7ce1-ab3c-a15746869e73","name":"Vietnam","isoCode":"VN"},"latitude":21.1400906,"longitude":105.9170644,"hotelClass":1,"minPrice":770.17,"primaryImageUrl":"hotel/01a105dc-24d4-7ffc-98e0-32d730d886d1/01a105e3-c4c4-72f1-834e-7dc4aad1b3da.avif","views":3},{"id":"01a105dc-252d-7b60-8c85-aedf8ca12ec6","name":"Sunset Amelie Inn","address":"84389 Ridge Road Suite 834","city"
```
### A-API-02 — destinations/trending (public, limit=3)
```
GET /search/destinations/trending?limit=3
HTTP 200  time=0.004283s
{"success":true,"data":{"destinations":[{"id":"01a105dc-0fce-7673-aeb3-b25469da159b","type":"city","cityId":"01a105dc-0eeb-74b6-8a47-5e200f348df5","countryId":"01a105dc-0edc-7ce1-ab3c-a15746869e73","displayName":"Ha Noi","countryName":"Vietnam","searchCount":482,"uniqueUsers":1,"images":{"primary":{"id":"01a105ed-91e6-70da-b617-64e37e7bf7a8","bucketName":"uploads","objectKey":"city/01a105dc-0eeb-74b6-8a47-5e200f348df5/01a105ed-91e6-70da-b617-64e37e7bf7a8.avif","width":900,"height":900,"isPrimary":true,"displayOrder":0,"variants":[{"id":"01a105ed-91e6-70da-b617-64e427237436","variantType":"medi
```
### A-API-03 — nearby-places (public)
```
GET /hotels/01a105dc-24d4-7ffc-98e0-32d730d886d1/nearby-places?limit=5
HTTP 200  time=0.006493s
{"data":[{"id":"01a105df-e315-7255-8c05-4defafbf4ef0","name":"National Bank","category":"bank","description":"Persistent contextually-based instruction set","address":"814 Hudson Road","latitude":21.1255858,"longitude":105.9215441,"distanceKm":1.68,"travelTimeMinutes":21,"travelMode":"walking","rating":3.9,"websiteUrl":"https://personal-bookcase.name/","phoneNumber":"360.603.7841 x22486","openingHours":null,"priceLevel":null,"icon":"bank"},{"id":"01a105df-e315-7255-8c05-4dedc4dcab99","name":"24/7 Drugstore","category":"pharmacy","description":"Distributed needs-based system engine","address":"
```
### A-API-04 — batch (public, 2 valid ids)
```
POST /hotels/batch
HTTP 200  time=0.003436s
{"data":[{"id":"01a105dc-24d4-7ffc-98e0-32d730d886d1","name":"View Hotel","address":"59059 Loraine Fall Suite 856","city":{"id":"01a105dc-0eeb-74b6-8a47-5e200f348df5","name":"Ha Noi","slug":"ha-noi"},"country":{"id":"01a105dc-0edc-7ce1-ab3c-a15746869e73","name":"Vietnam","isoCode":"VN"},"latitude":21.1400906,"longitude":105.9170644,"hotelClass":1,"minPrice":770.17,"primaryImageUrl":"hotel/01a105dc-24d4-7ffc-98e0-32d730d886d1/01a105e3-c4c4-72f1-834e-7dc4aad1b3da.avif"},{"id":"01a105dc-252d-7b60-8c85-aedf8ca12ec6","name":"Sunset Amelie Inn","address":"84389 Ridge Road Suite 834","city":{"id":"01
```
### A-API-05 — recently-viewed without token -> expect 401
```
GET /hotels/recently-viewed?limit=5
HTTP 401  time=0.000673s
{"success":false,"message":"Authentication required."}
```
### A-API-06 — recently-viewed with token
```
GET /hotels/recently-viewed?limit=5
HTTP 200  time=0.012087s
{"data":[{"id":"01a105dc-2563-7af7-9320-56e5f28ba44c","name":"Grand Ha Noi Club","address":"49999 Padberg Estates Suite 125","city":{"id":"01a105dc-0eeb-74b6-8a47-5e200f348df5","name":"Ha Noi","slug":"ha-noi"},"country":{"id":"01a105dc-0edc-7ce1-ab3c-a15746869e73","name":"Vietnam","isoCode":"VN"},"latitude":20.9711079,"longitude":105.9452755,"hotelClass":5,"minPrice":197.09,"primaryImageUrl":"hotel/01a105dc-2563-7af7-9320-56e5f28ba44c/01a105e4-1db3-7409-ab8e-6fe59bce1fa3.avif"},{"id":"01a105dc-24d4-7ffc-98e0-32d730d886d1","name":"View Hotel","address":"59059 Loraine Fall Suite 856","city":{"id
```
### A-API-07 — recently-viewed bad token -> expect 401
```
GET /hotels/recently-viewed
HTTP 401  time=0.000856s
{"success":false,"message":"Malformed JWT"}
```
### A-API-08 — trending limit=51 (max 50) -> expect 400
```
GET /hotels/trending?limit=51
HTTP 400  time=0.001570s
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request data","fields":{"limit":"\"limit\" must be less than or equal to 50"}}}
```
### A-API-09 — trending limit=0 -> expect 400
```
GET /hotels/trending?limit=0
HTTP 400  time=0.001354s
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request data","fields":{"limit":"\"limit\" must be greater than or equal to 1"}}}
```
### A-API-10 — trending days=366 -> expect 400
```
GET /hotels/trending?days=366
HTTP 400  time=0.001045s
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request data","fields":{"days":"\"days\" must be less than or equal to 365"}}}
```
### A-API-11 — trending limit=abc -> expect 400
```
GET /hotels/trending?limit=abc
HTTP 400  time=0.001379s
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request data","fields":{"limit":"\"limit\" must be a number"}}}
```
### A-API-12 — recently-viewed limit=51 -> expect 400
```
GET /hotels/recently-viewed?limit=51
HTTP 400  time=0.008053s
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request data","fields":{"limit":"\"limit\" must be less than or equal to 50"}}}
```
### A-API-13 — destinations/trending limit=21 -> expect 400
```
GET /search/destinations/trending?limit=21
HTTP 400  time=0.000932s
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request data","fields":{"limit":"\"limit\" must be less than or equal to 20"}}}
```
### A-API-14 — nearby-places invalid category -> expect 400
```
GET /hotels/01a105dc-24d4-7ffc-98e0-32d730d886d1/nearby-places?category=nonsense
HTTP 400  time=0.001613s
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request data","fields":{"category":"Invalid category"}}}
```
### A-API-15 — nearby-places non-uuid hotelId -> expect 400
```
GET /hotels/not-a-uuid/nearby-places
HTTP 404  time=0.001598s
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Error</title>
</head>
<body>
<pre>Cannot GET /api/v1/hotels/not-a-uuid/nearby-places</pre>
</body>
</html>
```
### A-API-16 — nearby-places valid-but-missing hotel uuid -> ?
```
GET /hotels/00000000-0000-0000-0000-000000000000/nearby-places
HTTP 404  time=0.004362s
{"error":{"code":"HOTEL_NOT_FOUND","message":"Hotel not found"}}
```
### A-API-17 — batch empty array -> expect 200 []
```
POST /hotels/batch
HTTP 200  time=0.000707s
{"data":[]}
```
### A-API-18 — batch missing ids -> ?
```
POST /hotels/batch
HTTP 200  time=0.000998s
{"data":[]}
```
### A-API-19 — batch ids not array -> ?
```
POST /hotels/batch
HTTP 200  time=0.000891s
{"data":[]}
```
### A-API-20 — batch with invalid uuid strings -> ?
```
POST /hotels/batch
HTTP 200  time=0.003196s
{"data":[]}
```
### A-API-21 — batch with 60 ids (caps at 50) -> expect 200
```
POST /hotels/batch
HTTP 200  time=0.004772s
{"data":[{"id":"01a105dc-24d4-7ffc-98e0-32d730d886d1","name":"View Hotel","address":"59059 Loraine Fall Suite 856","city":{"id":"01a105dc-0eeb-74b6-8a47-5e200f348df5","name":"Ha Noi","slug":"ha-noi"},"country":{"id":"01a105dc-0edc-7ce1-ab3c-a15746869e73","name":"Vietnam","isoCode":"VN"},"latitude":21.1400906,"longitude":105.9170644,"hotelClass":1,"minPrice":770.17,"primaryImageUrl":"hotel/01a105dc-24d4-7ffc-98e0-32d730d886d1/01a105e3-c4c4-72f1-834e-7dc4aad1b3da.avif"},{"id":"01a105dc-24d4-7ffc-98e0-32d730d886d1","name":"View Hotel","address":"59059 Loraine Fall Suite 856","city":{"id":"01a105d
```
### A-API-22 — trending raw envelope (no success field?)
```
GET /hotels/trending?limit=1
HTTP 200  time=0.003835s
{"data":[{"id":"01a105dc-24d4-7ffc-98e0-32d730d886d1","name":"View Hotel","address":"59059 Loraine Fall Suite 856","city":{"id":"01a105dc-0eeb-74b6-8a47-5e200f348df5","name":"Ha Noi","slug":"ha-noi"},"country":{"id":"01a105dc-0edc-7ce1-ab3c-a15746869e73","name":"Vietnam","isoCode":"VN"},"latitude":21.1400906,"longitude":105.9170644,"hotelClass":1,"minPrice":770.17,"primaryImageUrl":"hotel/01a105dc-24d4-7ffc-98e0-32d730d886d1/01a105e3-c4c4-72f1-834e-7dc4aad1b3da.avif","views":3}]}
```
### A-API-23 — destination trending raw envelope (success field?)
```
GET /search/destinations/trending?limit=1
HTTP 200  time=0.029928s
{"success":true,"data":{"destinations":[{"id":"01a105dc-0fce-7673-aeb3-b25469da159b","type":"city","cityId":"01a105dc-0eeb-74b6-8a47-5e200f348df5","countryId":"01a105dc-0edc-7ce1-ab3c-a15746869e73","displayName":"Ha Noi","countryName":"Vietnam","searchCount":485,"uniqueUsers":1,"images":{"primary":{"id":"01a105ed-91e6-70da-b617-64e37e7bf7a8","bucketName":"uploads","objectKey":"city/01a105dc-0eeb-74b6-8a47-5e200f348df5/01a105ed-91e6-70da-b617-64e37e7bf7a8.avif","width":900,"height":900,"isPrimary":true,"displayOrder":0,"variants":[{"id":"01a105ed-91e6-70da-b617-64e427237436","variantType":"medi
```
## Performance (repeat trending x5)
  run1: 200 0.005870s
  run2: 200 0.003971s
  run3: 200 0.004997s
  run4: 200 0.004743s
  run5: 200 0.004758s
