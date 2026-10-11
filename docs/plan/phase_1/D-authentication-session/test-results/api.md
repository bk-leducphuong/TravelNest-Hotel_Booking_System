# Feature D — Authentication & Session · API/security evidence

_Generated 2026-10-09T13:45:43Z_

### D-API-01 — session no token -> 200 isAuthenticated false
```
GET /auth/session
HTTP 200  time=0.001732s
{"data":{"session":{"id":null,"user":null,"context":null,"authProvider":"keycloak"},"isAuthenticated":false}}
```
### D-API-02 — session valid token -> 200 isAuthenticated true
```
GET /auth/session
HTTP 200  time=0.011961s
{"data":{"session":{"id":"5e0b017f-5377-4545-8895-9eda67418d1d","user":{"id":"01a11694-721d-7300-8ee1-5f0cd624c0d2","type":"USER","email":"test@travelnest.com","roles":["offline_access","default-roles-travelnest","uma_authorization","user"]},"context":null,"authProvider":"keycloak"},"isAuthenticated":true}}
```
### D-API-03 — session malformed token -> 200 false (no 500)
```
GET /auth/session
HTTP 200  time=0.000949s
{"data":{"session":{"id":null,"user":null,"context":null,"authProvider":"keycloak"},"isAuthenticated":false}}
```
### D-API-04 — session tampered signature -> 200 false
```
GET /auth/session
HTTP 200  time=0.000965s
{"data":{"session":{"id":null,"user":null,"context":null,"authProvider":"keycloak"},"isAuthenticated":false}}
```
### D-API-05 — session alg=none forged -> 200 false
```
GET /auth/session
HTTP 200  time=0.000973s
{"data":{"session":{"id":null,"user":null,"context":null,"authProvider":"keycloak"},"isAuthenticated":false}}
```
### D-API-06 — protected no token -> 401
```
GET /user
HTTP 401  time=0.000762s
{"success":false,"message":"Authentication required."}
```
### D-API-07 — protected valid token -> 200
```
GET /user
HTTP 200  time=0.008970s
{"data":{"id":"01a11694-721d-7300-8ee1-5f0cd624c0d2","email":"test@travelnest.com","first_name":"Test","last_name":"User","profile_picture_url":null,"phone_number":null,"address":null,"nationality":null,"country":null,"date_of_birth":null,"gender":null,"roles":["user"],"full_name":"Test User","username":"Test User","user_role":"user"}}
```
### D-API-08 — protected malformed -> 401
```
GET /user
HTTP 401  time=0.000732s
{"success":false,"message":"Unexpected token '�', \"��\" is not valid JSON"}
```
### D-API-09 — protected tampered sig -> 401
```
GET /user
HTTP 401  time=0.001006s
{"success":false,"message":"Invalid JWT signature"}
```
### D-API-10 — protected alg=none forged -> 401
```
GET /user
HTTP 401  time=0.001055s
{"success":false,"message":"Unsupported JWT algorithm: none"}
```
### D-API-11 — protected HS256 forged -> 401
```
GET /user
HTTP 401  time=0.000867s
{"success":false,"message":"Unsupported JWT algorithm: HS256"}
```
### D-API-12 — Authorization without 'Bearer' prefix -> 401
```
GET /user
HTTP 401  time=0.000672s
{"success":false,"message":"Authentication required."}
```
### D-API-12b — empty Bearer -> 401
```
GET /user
HTTP 401  time=0.000853s
{"success":false,"message":"Authentication required."}
```
### D-API-13 — ROPC wrong password -> 401
```
POST http://localhost:8080/realms/travelnest/protocol/openid-connect/token
HTTP 401  time=0.035590s
{"error":"invalid_grant","error_description":"Invalid user credentials"}
```
### D-API-14 — token with unknown client -> 401
```
POST http://localhost:8080/realms/travelnest/protocol/openid-connect/token
HTTP 401  time=0.023633s
{"error":"invalid_client","error_description":"Invalid client or Invalid client credentials"}
```
