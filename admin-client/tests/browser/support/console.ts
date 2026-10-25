import type { Page } from "@playwright/test";

export const sampleRoom = {
  id: "room-1",
  hotel_id: "hotel-1",
  room_name: "Deluxe Suite",
  room_type: "Suite",
  bed_type: "king",
  max_guests: 3,
  quantity: 8,
  room_size: 55,
  status: "active",
};
export const sampleHotel = {
  id: "hotel-1",
  name: "TravelNest Riverside",
  address: "12 River Road",
  description: "Riverside hotel",
  status: "active",
  city_id: "city-1",
  country_id: "country-1",
  timezone: "Asia/Ho_Chi_Minh",
  check_in_time: "14:00",
  check_out_time: "12:00",
  check_in_policy: "Bring identification",
  check_out_policy: "Return the key",
  phone_number: "+84123456789",
  hotel_class: 4,
  min_price: 150,
  latitude: 10,
  longitude: 106,
};
const date = new Date().toISOString().slice(0, 10);
export const sampleBooking = {
  id: "booking-1",
  booking_code: "TN-1042",
  hotel_id: "hotel-1",
  room_id: "room-1",
  status: "confirmed",
  check_in_date: date,
  check_out_date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
  number_of_guests: 2,
  quantity: 1,
  total_price: "2400000",
  currency: "VND",
  created_at: `${date}T08:00:00Z`,
  buyer: {
    id: "guest-1",
    first_name: "Linh",
    last_name: "Tran",
    email: "guest@example.test",
  },
  room: { id: "room-1", room_name: "Deluxe Suite" },
  hotel: { id: "hotel-1", name: "TravelNest Riverside" },
};
export const sampleTransaction = {
  id: "transaction-1",
  hotel_id: "hotel-1",
  buyer_id: "guest-1",
  booking_id: "booking-1",
  amount: "2400000",
  currency: "VND",
  status: "completed",
  transaction_type: "payment",
  created_at: `${date}T08:00:00Z`,
  completed_at: `${date}T08:05:00Z`,
  refunds: [],
  booking: { id: "booking-1", booking_code: "TN-1042" },
  transaction_buyer: sampleBooking.buyer,
};
export const sampleReview = {
  id: "review-1",
  hotel_id: "hotel-1",
  rating_overall: 8.6,
  rating_cleanliness: 9,
  rating_service: 8,
  rating_location: 9,
  rating_value: 8,
  status: "published",
  is_verified: true,
  helpful_count: 2,
  created_at: `${date}T09:00:00Z`,
  title: "A peaceful stay",
  comment: "Friendly staff and a comfortable room.",
  user: sampleBooking.buyer,
  reply: null,
};

export async function stubConsole(page: Page) {
  let hotel = { ...sampleHotel };
  let booking = { ...sampleBooking };
  let review = { ...sampleReview } as Omit<typeof sampleReview, "reply"> & {
    reply: null | { reply_text: string };
  };
  let profile = {
    id: "test-user",
    full_name: "Hotel Manager",
    email: "manager@example.test",
    phone_number: "+84123456789",
  };
  let dayStatus = "open";
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace("/api/v1", "");
    const method = request.method();
    const payload = method === "GET" ? {} : (request.postDataJSON() ?? {});
    const meta = {
      total: 61,
      limit: 20,
      page: Number(url.searchParams.get("page") ?? 1),
    };
    let data: unknown;
    let pagination = false;
    if (path.endsWith("/rooms") && path.includes("/inventory/"))
      data = {
        hotelId: "hotel-1",
        startDate: date,
        endDate: date,
        rooms: [
          {
            roomId: "room-1",
            roomName: "Deluxe Suite",
            roomType: "Suite",
            roomStatus: "active",
            quantity: 8,
            hasInventory: true,
            inventory: {
              totalRooms: 8,
              bookedRooms: 2,
              heldRooms: 1,
              availableRooms: 5,
              dayCount: 1,
            },
          },
        ],
      };
    else if (path === "/admin/inventory/rooms/room-1") {
      if (method === "PATCH") {
        dayStatus = payload.entries?.[0]?.status ?? dayStatus;
        data = { created: 0, updated: payload.entries.length };
      } else {
        const start = url.searchParams.get("startDate") ?? date;
        data = {
          roomId: "room-1",
          hotelId: "hotel-1",
          startDate: start,
          endDate: url.searchParams.get("endDate"),
          days: [
            {
              date: start,
              totalRooms: 8,
              bookedRooms: 2,
              heldRooms: 1,
              availableRooms: 5,
              pricePerNight: 1200000,
              currency: "VND",
              status: dayStatus,
            },
          ],
        };
      }
    } else if (path.endsWith("/occupancy"))
      data = {
        hotelId: "hotel-1",
        startDate: date,
        endDate: date,
        totalRooms: 8,
        bookedRooms: 2,
        heldRooms: 1,
        availableRooms: 5,
        occupancyRate: 25,
        roomCount: 1,
        dayCount: 1,
      };
    else if (path.endsWith("/stats"))
      data = {
        hotelId: "hotel-1",
        total: 67,
        byStatus: { confirmed: 40, completed: 27 },
        arrivalsToday: 3,
        departuresToday: 2,
      };
    else if (path.endsWith("/trend"))
      data = { hotelId: "hotel-1", days: 14, points: [{ date, count: 4 }] };
    else if (path.endsWith("/summary") && path.includes("/payments/"))
      data = {
        hotelId: "hotel-1",
        totalTransactions: 120,
        byStatus: { completed: 110, refunded: 10 },
        grossAmount: 99999999,
        refundedAmount: 1000,
        netAmount: 99998999,
      };
    else if (path.endsWith("/summary") && path.includes("/payouts/"))
      data = {
        hotelId: "hotel-1",
        byStatus: {
          paid: { count: 4, amount: 999999 },
          pending: { count: 2, amount: 888888 },
        },
        totalAmount: 1888887,
        payoutReady: true,
      };
    else if (path === "/admin/reviews/summary")
      data = {
        hotelId: "hotel-1",
        totalReviews: 25,
        publishedCount: 20,
        averageRating: 8.6,
        repliedCount: 18,
        unrepliedCount: 2,
        byStatus: { published: 20, hidden: 5 },
      };
    else if (path === "/admin/reviews") {
      data = [review];
      pagination = true;
    } else if (path === "/admin/reviews/review-1") data = review;
    else if (path === "/admin/reviews/review-1/reply") {
      review = {
        ...review,
        reply: method === "DELETE" ? null : { reply_text: payload.reply },
      };
      data = { reviewId: review.id, reply: payload.reply };
    } else if (path === "/admin/bookings") {
      data = [booking];
      pagination = true;
    } else if (path === "/admin/bookings/booking-1") data = booking;
    else if (path === "/admin/bookings/booking-1/status") {
      booking = { ...booking, status: payload.status };
      data = {
        bookingId: booking.id,
        previousStatus: "confirmed",
        status: payload.status,
      };
    } else if (path.endsWith("/board"))
      data = { date, arrivals: [booking], departures: [], inHouse: [] };
    else if (path.endsWith("/calendar"))
      data = { hotelId: "hotel-1", bookings: [booking] };
    else if (path === "/admin/payments/transactions") {
      data = [sampleTransaction];
      pagination = true;
    } else if (path === "/admin/payments/transactions/transaction-1")
      data = sampleTransaction;
    else if (path === "/admin/payments/transactions/transaction-1/refunds")
      data = {
        refundId: "refund-1",
        status: "succeeded",
        amount: payload.amount ?? 2400000,
        currency: "VND",
      };
    else if (path === "/admin/payments/refunds") {
      data = [];
      pagination = true;
    } else if (path === "/admin/payouts") {
      data = [
        {
          id: "payout-1",
          hotel_id: "hotel-1",
          owner_id: "owner-1",
          amount: "1000000",
          platform_fee_amount: "50000",
          currency: "VND",
          status: "paid",
          provider: "stripe",
          created_at: `${date}T08:00:00Z`,
        },
      ];
      pagination = true;
    } else if (path === "/admin/payouts/payout-1")
      data = {
        id: "payout-1",
        amount: "1000000",
        platform_fee_amount: "50000",
        currency: "VND",
        status: "paid",
        owner_id: "owner-1",
        created_at: `${date}T08:00:00Z`,
        items: [],
      };
    else if (path === "/admin/payouts/connected-accounts/check")
      data = { configured: false, ready: false };
    else if (path === "/admin/payouts/connected-accounts") data = [];
    else if (path === "/admin/hotels") {
      data = [hotel];
      pagination = true;
    } else if (path === "/admin/hotels/hotel-1") {
      if (method === "PATCH") {
        hotel = {
          ...hotel,
          ...Object.fromEntries(
            Object.entries(payload).map(([key, value]) => [
              (
                {
                  phoneNumber: "phone_number",
                  cityId: "city_id",
                  countryId: "country_id",
                  checkInTime: "check_in_time",
                  checkOutTime: "check_out_time",
                  checkInPolicy: "check_in_policy",
                  checkOutPolicy: "check_out_policy",
                  hotelClass: "hotel_class",
                  minPrice: "min_price",
                } as Record<string, string>
              )[key] ?? key,
              value,
            ])
          ),
        };
        data = { hotel };
      } else data = { hotel, rooms: [sampleRoom], policies: [] };
    } else if (path.endsWith("/staff")) {
      data = {
        staff: [
          {
            id: "staff-1",
            userId: "user-1",
            hotelId: "hotel-1",
            role: "owner",
            isPrimaryOwner: true,
            email: "owner@example.test",
            firstName: "Olivia",
            lastName: "Owner",
          },
          {
            id: "staff-2",
            userId: "user-2",
            hotelId: "hotel-1",
            role: "manager",
            isPrimaryOwner: false,
            email: "manager@example.test",
            firstName: "Mia",
            lastName: "Manager",
          },
        ],
      };
    } else if (path.endsWith("/rooms")) data = { rooms: [sampleRoom] };
    else if (path.includes("/images/")) data = { images: [] };
    else if (path.endsWith("/cancellation-rules")) data = { rules: [] };
    else if (path.endsWith("/amenities") && path.includes("/hotels/"))
      data = { amenityIds: [] };
    else if (path === "/admin/amenities") {
      data = [];
      pagination = true;
    } else if (path.endsWith("/cities")) {
      data = [{ id: "city-1", name: "Ho Chi Minh City" }];
      pagination = true;
    } else if (path.endsWith("/countries")) {
      data = [{ id: "country-1", name: "Vietnam" }];
      pagination = true;
    } else if (path === "/user") {
      if (method === "PATCH")
        profile = {
          ...profile,
          full_name: payload.name,
          email: payload.email ?? profile.email,
          phone_number: payload.phoneNumber ?? profile.phone_number,
        };
      data = profile;
    } else {
      await route.fulfill({
        status: 404,
        json: { error: { message: `No test fixture for ${method} ${path}` } },
      });
      return;
    }
    await route.fulfill({ json: pagination ? { data, meta } : { data } });
  });
}
