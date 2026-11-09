import type { Page } from "@playwright/test";

export const snapshot = {
  hotels: { total: 12600, byStatus: { active: 12000, pending: 600 } },
  users: { total: 83, byStatus: { active: 80, banned: 3 } },
  bookings: { total: 441740 },
  generatedAt: "2026-10-31T09:00:00Z",
  stale: false,
};
export const hotel = {
  id: "hotel-1",
  name: "Trestay Riverside",
  status: "active",
  hotelClass: 4,
  city: { id: "city-1", name: "Hanoi" },
  country: { id: "country-1", name: "Vietnam" },
  owner: { id: "user-1", email: "ow•••@…" },
  createdAt: "2026-01-01T00:00:00Z",
  counts: { rooms: 12, bookings: 67, reviews: 8 },
  timezone: "Asia/Ho_Chi_Minh",
  address: "12 Riverside Road",
  phoneNumber: "+84 •••• 67",
  description: "A riverside property.",
  latitude: "21.03",
  longitude: "105.85",
  members: [
    {
      userId: "user-1",
      role: "owner",
      isPrimaryOwner: true,
      joinedAt: "2026-01-01T00:00:00Z",
      user: { id: "user-1", email: "ow•••@…", status: "active" },
    },
  ],
  rating: { overall: 8.6, total: 8 },
};
export const user = {
  id: "user-1",
  email: "ow•••@…",
  fullName: "Fixture owner",
  status: "active",
  globalRoles: ["owner"],
  createdAt: "2026-01-01T00:00:00Z",
  phoneNumber: "•••67",
  address: "•••",
  dateOfBirth: "•••",
  lastLoginAt: "2026-10-30T09:00:00Z",
  emailVerifiedAt: "2026-01-02T00:00:00Z",
  memberships: [
    {
      hotelId: "hotel-1",
      hotelName: "Trestay Riverside",
      hotelStatus: "active",
      role: "owner",
      isPrimaryOwner: true,
    },
  ],
  bookings: { total: 2 },
};
export const payment = {
  id: "payment-1",
  bookingId: "booking-123",
  amount: "120.50",
  currency: "USD",
  status: "completed",
  method: "card",
  createdAt: "2026-10-30T08:00:00Z",
  completedAt: "2026-10-30T08:01:00Z",
  hotel: { id: hotel.id, name: hotel.name },
  buyer: { id: user.id, email: user.email },
};
export const refund = {
  id: "refund-1",
  bookingId: "booking-123",
  transactionId: "transaction-456",
  amount: "12.345",
  currency: "KWD",
  status: "succeeded",
  reason: "Guest cancellation",
  eligibility: "eligible",
  requestedAt: "2026-10-30T09:00:00Z",
  processedAt: "2026-10-30T09:01:00Z",
  hotel: payment.hotel,
  buyer: payment.buyer,
};
export const payout = {
  id: "payout-1",
  amount: "1000",
  currency: "JPY",
  platformFeeAmount: "50",
  status: "paid",
  periodStart: "2026-10-01T00:00:00Z",
  periodEnd: "2026-10-31T00:00:00Z",
  paidAt: "2026-10-31T09:00:00Z",
  createdAt: "2026-10-30T09:00:00Z",
  hotel: payment.hotel,
  owner: payment.buyer,
};
export const ledger = {
  id: "ledger-1",
  direction: "credit",
  amount: "120.50",
  currency: "USD",
  eventType: "payment_succeeded",
  description: "Provider settlement",
  postedAt: "2026-10-30T08:01:00Z",
  account: {
    id: "account-1",
    name: "Platform cash",
    accountType: "platform_cash",
    currency: "USD",
  },
  hotel: payment.hotel,
  refs: {
    bookingId: payment.bookingId,
    transactionId: "transaction-456",
    paymentId: payment.id,
    refundId: null,
    payoutId: null,
  },
};
export const audit = {
  id: "audit-1",
  action: "platform.pii.read",
  entityType: "user",
  entityId: user.id,
  actorUserId: "019b637c-5eb2-7000-8000-000000000001",
  actorType: "user",
  hotelId: null,
  reason: "Support investigation",
  requestId: "request-long-1234567890",
  metadata: { source: "<img src=x onerror=alert(1)>", count: 1 },
  createdAt: "2026-10-31T09:00:00Z",
};
export async function stubPlatform(page: Page) {
  // Fail closed: the fixture cannot reach a real API or identity provider.
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace(
      "/api/v1/superadmin",
      ""
    );
    const empty = { data: [], meta: { page: 1, limit: 20, total: 0 } };
    const responses: Record<string, unknown> = {
      "/overview": { data: snapshot },
      "/hotels": {
        ...empty,
        data: [hotel],
        meta: { page: 1, limit: 20, total: 1 },
      },
      "/hotels/hotel-1": { data: hotel },
      "/users": {
        ...empty,
        data: [user],
        meta: { page: 1, limit: 20, total: 1 },
      },
      "/users/user-1": { data: user },
      "/finance/overview": {
        data: {
          gross: [
            { currency: "USD", amount: 120.5, count: 1 },
            { currency: "JPY", amount: 1000, count: 2 },
          ],
          refunds: [],
          payoutsPaid: [],
          payoutsPending: [],
          generatedAt: snapshot.generatedAt,
          stale: false,
        },
      },
      "/finance/payments": {
        ...empty,
        data: [payment],
        meta: { page: 1, limit: 20, total: 1 },
      },
      "/finance/refunds": {
        ...empty,
        data: [refund],
        meta: { page: 1, limit: 20, total: 1 },
      },
      "/finance/payouts": {
        ...empty,
        data: [payout],
        meta: { page: 1, limit: 20, total: 1 },
      },
      "/finance/ledger": {
        ...empty,
        data: [ledger],
        meta: { page: 1, limit: 20, total: 1 },
      },
      "/audit": {
        ...empty,
        data: [audit],
        meta: { page: 1, limit: 50, total: 1 },
      },
    };
    const response = responses[path];
    await route.fulfill({
      status: response ? 200 : 501,
      json: response ?? {
        error: { message: `No platform fixture for ${path}` },
      },
    });
  });
}
