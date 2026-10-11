# Feature N — Analytics (guest) · API evidence

_2026-10-09T17:40:09Z_

## Public
### N-API-01 — search demand (public)
```
GET /analytics/search/demand
HTTP 200
{"success":true,"data":{"demand":[{"checkInDate":"2026-10-14","destinationId":"01a105dc-0fce-7673-aeb3-b25469da159b","destinationType":"city","searchCount":44,"avgNights":2.1818181818181817,"avgGuests":1.3409090909090908},{"checkInDate":"2026-10-11","destinationId":"01a105dc-0fce-7673-aeb3-b25469da159b","destinationType":"city","searchCount":37,"avgNights":2.7567567567567566,"avgGuests":2.3513513513513513},{"checkInDate":"2026-10-10","destinationId":"01a105dc-0fce-7673-aeb3-b25469da159b","destin
```
### N-API-02 — search demand limit=5 nextDays=30
```
GET /analytics/search/demand?limit=5&nextDays=30
HTTP 200
{"success":true,"data":{"demand":[{"checkInDate":"2026-10-14","destinationId":"01a105dc-0fce-7673-aeb3-b25469da159b","destinationType":"city","searchCount":44,"avgNights":2.1818181818181817,"avgGuests":1.3409090909090908},{"checkInDate":"2026-10-11","destinationId":"01a105dc-0fce-7673-aeb3-b25469da159b","destinationType":"city","searchCount":37,"avgNights":2.7567567567567566,"avgGuests":2.3513513513513513},{"checkInDate":"2026-10-10","destinationId":"01a105dc-0fce-7673-aeb3-b25469da159b","destin
```
### N-API-03 — search demand limit=999 -> 400
```
GET /analytics/search/demand?limit=999
HTTP 400
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request data","fields":{"limit":"\"limit\" must be less than or equal to 500"}}}
```
## Mine (auth)
### N-API-04 — my search summary
```
GET /analytics/users/me/search-summary
HTTP 200
{"success":true,"data":{"summary":{"userId":"01a11694-721d-7300-8ee1-5f0cd624c0d2","totalSearches":259,"locationsVisited":["01a105dc-0fce-7673-aeb3-b25469da159b"],"lastSearchTime":"2026-10-09T14:35:40.093Z","firstSearchTime":"2026-10-07T13:52:48.599Z","uniqueLocations":1}}}
```
### N-API-05 — my searches
```
GET /analytics/users/me/searches?limit=5
HTTP 200
{"success":true,"data":{"searches":[{"searchId":"5079b9c4-0d45-4cc1-836e-5bbcba893676","checkInDate":"2026-10-29T00:00:00Z","checkOutDate":"2026-10-31T00:00:00Z","adults":2,"children":0,"rooms":1,"searchTime":"2026-10-09T14:35:40.093Z"},{"searchId":"6fbf55fd-3c3e-4a5d-b228-fd5c129c0483","checkInDate":"2026-10-29T00:00:00Z","checkOutDate":"2026-10-31T00:00:00Z","adults":2,"children":0,"rooms":1,"searchTime":"2026-10-09T14:35:39.992Z"},{"searchId":"537339d6-59e7-4c08-81d1-b7f80b0a3c40","checkInDat
```
### N-API-06 — user B search summary (scoped)
```
GET /analytics/users/me/search-summary
HTTP 200
{"success":true,"data":{"summary":{"locationsVisited":[],"totalSearches":0,"uniqueLocations":0,"userId":"01a105e0-231f-7c5b-9020-2ac93a35114f"}}}
```
## Auth
### N-API-07 — search-summary no token -> 401
```
GET /analytics/users/me/search-summary
HTTP 401
{"success":false,"message":"Authentication required."}
```
### N-API-08 — my searches no token -> 401
```
GET /analytics/users/me/searches
HTTP 401
{"success":false,"message":"Authentication required."}
```
## IDOR probe (arbitrary user id in path?)
### N-API-09 — GET /analytics/users/<other>/search-summary -> ?
```
GET /analytics/users/00000000-0000-0000-0000-000000000000/search-summary
HTTP 404
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Error</title>
</head>
<body>
<pre>Cannot GET /api/v1/analytics/users/00000000-0000-0000-0000-000000000000/search-summary</pre>
</body>
</html>
```
