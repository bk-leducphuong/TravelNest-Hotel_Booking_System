# P — Admin Dashboard: Evidence

## API sources (owner hotel `01a105dc-2510-74f5-a07f-c79bab3b0002`)

```json
// /admin/bookings/hotels/:id/stats
{"total":41,"byStatus":{"completed":20,"confirmed":15,"cancelled":4,"no_show":1,"checked_in":1},"arrivalsToday":0,"departuresToday":0}

// /admin/bookings/hotels/:id/trend?days=14
{"days":14,"points":[{"date":"2026-09-26","count":0}, … {"date":"2026-09-30","count":2}, … {"date":"2026-10-09","count":0}]}

// /admin/payments/hotels/:id/summary
{"totalTransactions":41,"byStatus":{"completed":37,"refunded":2,"cancelled":2},
 "grossAmount":174831.65,"refundedAmount":0,"netAmount":174831.65}   // P-F1: refunded 2 but amount 0

// /admin/payouts/hotels/:id/summary
{"byStatus":{},"totalAmount":0,"paidAmount":0,"pendingAmount":0,"payoutReady":false}

// /admin/inventory/hotels/:id/occupancy
{"startDate":"2026-10-09","endDate":"2026-11-08","totalRooms":992,"bookedRooms":24,
 "availableRooms":968,"avgPrice":217.18,"occupancyRate":2.42,"dayCount":248,"roomCount":8}

// /admin/reviews/summary?hotelId=:id
{"totalReviews":26,"byStatus":{"published":23,"hidden":3,"deleted":0},"publishedCount":23,
 "averageRating":7.74,"repliedCount":9,"unrepliedCount":14}
```

## Dashboard DOM (owner)

```
GROSS REVENUE      $174,832   41 transactions
NET REVENUE        $174,832   $0 refunded
OCCUPANCY          2.42%      24/992 room-nights
BOOKINGS           41         0 arrivals today
AVERAGE RATING     7.7        23 published reviews
PENDING PAYOUTS    $0         Onboarding incomplete
Bookings — last 14 days  (TrendChart; peak 2 / total 2)
Occupancy                (DonutChart; 2% booked / 98% available)
Revenue                  (BarChart; Gross $174,832 / Net $174,832 / Refunded $0)
Bookings by status       Completed 49% 20 · Confirmed 37% 15 · Cancelled 10% 4 · …
```

The `refundedAmount:0` propagates to the "Refunded" bar and "Net revenue" (P-F1).
