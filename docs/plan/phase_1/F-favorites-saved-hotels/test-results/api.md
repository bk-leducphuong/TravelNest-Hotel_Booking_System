# Feature F — Favorites / Saved Hotels · API evidence

_2026-10-09T13:58:46Z_

### F-API-01 — list favorites (auth)
```
GET /user/favorite-hotels
HTTP 200
{"data":[],"meta":{"page":1,"limit":20,"total":0}}
```
### F-API-02 — add favorite H1
```
POST /user/favorite-hotels
HTTP 201
{"data":{"message":"Hotel added to favorites"}}
```
### F-API-03 — check H1 favorite
```
GET /user/favorite-hotels/01a105dc-24d4-7ffc-98e0-32d730d886d1
HTTP 200
{"data":{"isFavorite":true}}
```
### F-API-04 — add duplicate H1
```
POST /user/favorite-hotels
HTTP 409
{"error":{"code":"HOTEL_ALREADY_FAVORITE","message":"Hotel already in favorites"}}
```
### F-API-05 — list favorites (has H1)
```
GET /user/favorite-hotels
HTTP 200
{"data":[{"hotel_id":"01a105dc-24d4-7ffc-98e0-32d730d886d1","hotelInformation":{"id":"01a105dc-24d4-7ffc-98e0-32d730d886d1","name":"View Hotel","address":"59059 Loraine Fall Suite 856","hotel_class":1,"check_in_time":"14:00:00","check_out_time":"12:00:00","min_price":"770.17","overall_rating":"8.43","image_urls":["hotel/01a105dc-24d4-7ffc-98e0-32d730d886d1/01a105e3-c4c4-72f1-834e-7dc4aad1b3da.avif","hotel/01a105dc-24d4-7ffc-98e0-32d730d886d1/01a1
```
### F-API-06 — add favorite H2
```
POST /user/favorite-hotels
HTTP 201
{"data":{"message":"Hotel added to favorites"}}
```
### F-API-07 — add invalid uuid -> 400
```
POST /user/favorite-hotels
HTTP 400
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request data","fields":{"hotelId":"hotelId must be a valid UUID"}}}
```
### F-API-08 — add missing hotel uuid -> 404
```
POST /user/favorite-hotels
HTTP 404
{"error":{"code":"HOTEL_NOT_FOUND","message":"Hotel not found"}}
```
### F-API-09 — add missing hotelId -> 400
```
POST /user/favorite-hotels
HTTP 400
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request data","fields":{"hotelId":"hotelId is required"}}}
```
### F-API-10 — check non-uuid hotelId -> 400
```
GET /user/favorite-hotels/not-a-uuid
HTTP 400
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request data","fields":{"hotelId":"hotelId must be a valid UUID"}}}
```
### F-API-11 — remove non-favorited hotel -> ?
```
DELETE /user/favorite-hotels/01a105dc-252d-7b60-8c85-aedf8ca12ec6
HTTP 204

```
### F-API-12 — remove H1
```
DELETE /user/favorite-hotels/01a105dc-24d4-7ffc-98e0-32d730d886d1
HTTP 204

```
### F-API-13 — check H1 after remove
```
GET /user/favorite-hotels/01a105dc-24d4-7ffc-98e0-32d730d886d1
HTTP 200
{"data":{"isFavorite":false}}
```
### F-API-14 — list no token -> 401
```
GET /user/favorite-hotels
HTTP 401
{"success":false,"message":"Authentication required."}
```
### F-API-15 — user B list (scoped)
```
GET /user/favorite-hotels
HTTP 200
{"data":[{"hotel_id":"01a105dc-24df-7d21-ac7f-f628f7a1507d","hotelInformation":{"id":"01a105dc-24df-7d21-ac7f-f628f7a1507d","name":"Resort Lao Cai Tower","address":"881 Kunde Gardens Suite 565","hotel_class":1,"check_in_time":"14:00:00","check_out_time":"12:00:00","min_price":"797.97","overall_rating":"6.67","image_urls":["hotel/01a105dc-24df-7d21-ac7f-f628f7a1507d/01a105e3-cafe-7299-b101-4e4cf8c5908e.avif","hotel/01a105dc-24df-7d21-ac7f-f628f7a1
```
### F-API-16 — user B check H1 (not their favorite)
```
GET /user/favorite-hotels/01a105dc-24d4-7ffc-98e0-32d730d886d1
HTTP 200
{"data":{"isFavorite":false}}
```
