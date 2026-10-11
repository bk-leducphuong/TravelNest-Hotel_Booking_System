# Feature L — Media / Images · API evidence

_2026-10-09T17:31:23Z_

### L-API-01 — get hotel images (public)
```
GET /images/hotel/01a105dc-24d4-7ffc-98e0-32d730d886d1
HTTP 200
{"success":true,"message":"Images retrieved successfully","data":{"count":3,"images":[{"id":"01a105e3-c4c4-72f1-834e-7dc4aad1b3da","originalFilename":"hotel_1.avif","fileSize":115999,"mimeType":"image/avif","width":1254,"height":836,"isPrimary":true,"displayOrder":0,"status":"active","uploadedAt":"2026-10-04T07:49:36Z","url":"hotel/01a105dc-24d4-7ffc-98e0-32d730d886d1/01a105e3-c4c4-72f1-834e-7dc4aad1b3da.avif","variants":{"medium_webp":{"url":"ho
```
### L-API-02 — get images unknown hotel (public)
```
GET /images/hotel/00000000-0000-0000-0000-000000000000
HTTP 200
{"success":true,"message":"Images retrieved successfully","data":{"count":0,"images":[]}}
```
### L-API-03 — upload no auth -> 401
```
POST /images/hotel/01a105dc-24d4-7ffc-98e0-32d730d886d1
HTTP 401
{"success":false,"message":"Authentication required."}
```
### L-API-04 — upload to hotel as guest -> 403
```
POST /images/hotel/01a105dc-24d4-7ffc-98e0-32d730d886d1
HTTP 403
{"success":false,"message":"You do not have permission to manage images for this entity."}
```
### L-API-05 — upload self avatar -> 201
```
POST /images/user_avatar/01a11694-721d-7300-8ee1-5f0cd624c0d2
HTTP 201
{"success":true,"message":"Image uploaded successfully","data":{"id":"01a121b8-3903-793b-a548-dc841451f1b3","entityType":"user_avatar","entityId":"01a11694-721d-7300-8ee1-5f0cd624c0d2","originalFilename":"ok.png","fileSize":70,"mimeType":"image/png","isPrimary":false,"status":"processing","message":"Image uploaded and queued for processing"}}
```
avatarImageId=01a121b8-3903-793b-a548-dc841451f1b3
### L-API-06 — upload other user's avatar -> 403
```
POST /images/user_avatar/00000000-0000-0000-0000-0000000000aa
HTTP 403
{"success":false,"message":"You do not have permission to manage images for this entity."}
```
### L-API-07 — upload non-image -> 400
```
POST /images/user_avatar/01a11694-721d-7300-8ee1-5f0cd624c0d2
HTTP 500
{"error":{"code":"INTERNAL_ERROR","message":"Internal server error"}}
```
### L-API-08 — upload invalid entity type -> 400
```
POST /images/foo/01a11694-721d-7300-8ee1-5f0cd624c0d2
HTTP 403
{"success":false,"message":"You do not have permission to manage images for this entity."}
```
### L-API-09 — upload no file -> 400
```
POST /images/user_avatar/01a11694-721d-7300-8ee1-5f0cd624c0d2
HTTP 400
{"error":{"code":"NO_FILE_PROVIDED","message":"No file provided"}}
```
### L-API-10 — set primary no auth -> 401
```
PUT /images/hotel/01a105dc-24d4-7ffc-98e0-32d730d886d1/primary/01a121b8-3903-793b-a548-dc841451f1b3
HTTP 401
{"success":false,"message":"Authentication required."}
```
### L-API-11 — set primary hotel as guest -> 403
```
PUT /images/hotel/01a105dc-24d4-7ffc-98e0-32d730d886d1/primary/01a121b8-3903-793b-a548-dc841451f1b3
HTTP 403
{"success":false,"message":"You do not have permission to manage images for this entity."}
```
### L-API-12 — delete no auth -> 401
```
DELETE /images/01a121b8-3903-793b-a548-dc841451f1b3
HTTP 401
{"success":false,"message":"Authentication required."}
```
### L-API-13 — delete unknown image (auth) -> 404
```
DELETE /images/00000000-0000-0000-0000-000000000000
HTTP 404
{"error":{"code":"IMAGE_NOT_FOUND","message":"Image not found"}}
```
### L-API-14 — delete own avatar -> 200
```
DELETE /images/01a121b8-3903-793b-a548-dc841451f1b3
HTTP 200
{"success":true,"message":"Image deleted successfully","data":{"id":"01a121b8-3903-793b-a548-dc841451f1b3","message":"Image deleted successfully"}}
```
