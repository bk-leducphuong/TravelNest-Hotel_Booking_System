# M — Onboarding / Become a Host: Browser evidence

Authenticated as **Test User** (the `/join` pages themselves are public), 2026-10-09.

## Pages render ✅

| URL | Result |
|---|---|
| `/join` | "Đăng bất cứ chỗ nghỉ nào trên TravelNest" + "Bắt đầu ngay"; header "Đã là đối tác? Đăng nhập" |
| `/join/become-a-host` | 6-step wizard (1…6); step 1 "Chỗ nghỉ Quý vị muốn đăng ký nằm ở đâu?" with street/postal/city inputs + "Tiếp tục" |

## M-F2 — legacy endpoints

`client/src/components/join-forms/Form6.vue`:

```js
axios.post(`${import.meta.env.VITE_SERVER_HOST}/api/join/upload-photos`, …)   // line 117
axios.post(`${import.meta.env.VITE_SERVER_HOST}/api/join`, …)                 // line 159
```

Both verified **404** (`POST /api/join` → 404, `POST /api/join/upload-photos` → 404). The correct
backend mount is `/api/v1/join`.

## M-F3 — public page, auth-required API

`/join` landing shows a "Đăng nhập" (login) link, but the flow itself is reachable without login;
`POST /api/v1/join` without a token → `401`. So an anonymous visitor can fill the wizard and then
fail.

## M-F1 — backend 500 (from server error.log)

```
POST /api/v1/join -> 500 {"error":{"code":"INTERNAL_ERROR","message":"Internal server error"}}
msg: "Error: Incorrect time value: '14:00-22:00' for column 'check_in_time' at row 1"
  at hotels.upsert (... catalog/infrastructure/hotel/write.js:10)
  at JoinService.submitJoinForm (... onboarding/application/join.service.js:86)
```

The valid payload used `checkInFrom:"14:00"`, `checkInTo:"22:00"`, `checkOutFrom:"06:00"`,
`checkOutTo:"12:00"`, which the service joins into `"14:00-22:00"` for a `TIME` column.
