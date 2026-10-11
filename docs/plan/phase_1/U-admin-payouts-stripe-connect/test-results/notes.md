# U — Admin Payouts & Stripe Connect: Supplementary evidence

## U-F1 — cross-hotel IDOR

A minimal payout (`aaaaaaaa-…-01`, hotel `01a105dc-24d4-…`) + connected account
(`aaaaaaaa-…-02`) were inserted to have data. Actor: **owner** of hotel `01a105dc-2510-…`,
sending `X-Hotel-Id: 01a105dc-2510-…`.

```
GET   /admin/payouts/aaaaaaaa-…-01                              -> 200  (foreign payout data)
PATCH /admin/payouts/aaaaaaaa-…-01/status {"status":"processing"} -> 200  (status changed!)
POST  /admin/payouts/aaaaaaaa-…-01/process                      -> 409 PAYOUT_NOT_PROCESSABLE  (reached logic)
POST  /admin/payouts/connected-accounts/aaaaaaaa-…-02/link
      {"refreshUrl":"…","returnUrl":"…"}                        -> 400 resource_missing (reached Stripe)
```

Contrast: `GET /admin/payouts/hotels/<foreign>/summary` → `403` (hotel in the path → checked).

## U-F2 — generate eligible fails uncleanly

```
POST /admin/payouts/eligible {}   (no connected accounts)       -> 500
  server log: "Error: No payout-ready connected payment account found"
              at PayoutService.createManualPayout (payout.service.js:31)

POST /admin/payouts/eligible {}   (with a fake ready account)   -> no response (>30 s timeout)
```

## Payout state machine ✅

```
PATCH /admin/payouts/<id>/status {"status":"processing"}   (from pending) -> 200
PATCH /admin/payouts/<id>/status {"status":"cancelled"}    (from processing) -> 409
PATCH /admin/payouts/<id>/status {"status":"banana"}       -> 400
```

## Cleanup

The inserted payout and connected-account rows were deleted after the run (0 remaining).
