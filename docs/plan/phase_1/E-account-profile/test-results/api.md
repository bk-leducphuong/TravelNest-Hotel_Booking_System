# Feature E — Account & Profile · API evidence

_2026-10-09T13:54:21Z_

### E-API-01 — GET /user valid
```
GET /user
HTTP 200
{"data":{"id":"01a11694-721d-7300-8ee1-5f0cd624c0d2","email":"test@travelnest.com","first_name":"Test","last_name":"User","profile_picture_url":null,"phone_number":null,"address":null,"nationality":null,"country":null,"date_of_birth":null,"gender":null,"roles":["user"],"full_name":"Test User","username":"Test User","user_role":"user"}}
```
### E-API-02 — GET /user no token -> 401
```
GET /user
HTTP 401
{"success":false,"message":"Authentication required."}
```
### E-API-03 — PATCH /user address
```
PATCH /user
HTTP 200
{"data":{"message":"User updated successfully"}}
```
### E-API-03b — GET /user after patch
```
GET /user
HTTP 200
{"data":{"id":"01a11694-721d-7300-8ee1-5f0cd624c0d2","email":"test@travelnest.com","first_name":"Test","last_name":"User","profile_picture_url":null,"phone_number":null,"address":"12 E2E Street <b>probe</b>","nationality":null,"country":null,"date_of_birth":null,"gender":null,"roles":["user"],"full_name":"Test User","username":"Test User","user_role":"user"}}
```
### E-API-03c — PATCH /user name
```
PATCH /user
HTTP 200
{"data":{"message":"User updated successfully"}}
```
### E-API-04 — PATCH empty body -> 400
```
PATCH /user
HTTP 400
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request data","fields":{"":"At least one field must be provided for update"}}}
```
### E-API-05 — PATCH invalid email -> 400
```
PATCH /user
HTTP 400
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request data","fields":{"email":"\"email\" must be a valid email"}}}
```
### E-API-06 — PATCH invalid phone -> 400
```
PATCH /user
HTTP 400
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request data","fields":{"phoneNumber":"Phone number must be in international format (e.g., +1234567890)"}}}
```
### E-API-07 — PATCH invalid gender -> 400
```
PATCH /user
HTTP 400
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request data","fields":{"gender":"\"gender\" must be one of [male, female, other, prefer_not_to_say]"}}}
```
### E-API-08 — PATCH mass-assignment -> expect 400
```
PATCH /user
HTTP 400
{"error":{"code":"VALIDATION_ERROR","message":"Invalid request data","fields":{"":"At least one field must be provided for update"}}}
```
### E-API-09 — PATCH /user/password -> 410 removed
```
PATCH /user/password
HTTP 410
{"error":{"code":"PASSWORD_FLOW_REMOVED","message":"Password changes are now managed through Keycloak account management."}}
```
### E-API-10 — PATCH /user/avatar no file -> 400
```
PATCH /user/avatar
HTTP 400
{"error":{"code":"BAD_REQUEST","message":"No file uploaded","fields":{"avatar":"File is required"}}}
```
### E-API-11 — PATCH /user no token -> 401
```
PATCH /user
HTTP 401
{"success":false,"message":"Authentication required."}
```
### E-API-12 — GET /user (address payload stored?)
```
GET /user
HTTP 200
{"data":{"id":"01a11694-721d-7300-8ee1-5f0cd624c0d2","email":"test@travelnest.com","first_name":"Test","last_name":"User","profile_picture_url":null,"phone_number":null,"address":"12 E2E Street <b>probe</b>","nationality":null,"country":null,"date_of_birth":null,"gender":null,"roles":["user"],"full_name":"Test User","username":"Test User","user_role":"user"}}
```
