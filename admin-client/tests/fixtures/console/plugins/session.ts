import { useAuthStore } from "../../../../stores/auth";

export default defineNuxtPlugin(() => {
  const auth = useAuthStore();
  auth.initialized = true;
  auth.authenticated = true;
  auth.sessionLoaded = true;
  auth.user = { id: "test-user", email: "manager@example.test" };
  auth.hotels = [
    {
      id: "hotel-1",
      name: "TravelNest Riverside",
      role: "manager",
      isPrimaryOwner: false,
      permissions: [
        "room.read",
        "room.create",
        "room.update",
        "room.delete",
        "room.manage_inventory",
        "booking.read",
        "booking.create",
        "booking.manage",
        "booking.cancel",
        "payment.read",
        "payment.refund",
        "payment.process",
        "review.read",
        "review.reply",
        "review.moderate",
        "hotel.read",
        "hotel.update",
        "hotel.manage_staff",
      ],
    },
    {
      id: "hotel-2",
      name: "TravelNest Garden",
      role: "viewer",
      isPrimaryOwner: false,
      permissions: ["room.read"],
    },
  ];
  auth.activeHotelId = "hotel-1";
  // Explicit test-only scenarios; this plugin is absent from production builds.
  const scenario = new URL(window.location.href).searchParams.get("fixture");
  if (scenario === "readonly") {
    auth.hotels[0]!.permissions = [
      "room.read",
      "hotel.read",
      "booking.read",
      "payment.read",
      "review.read",
    ];
    auth.hotels[0]!.role = "viewer";
  } else if (scenario === "roomsonly") {
    auth.activeHotelId = "hotel-2";
  } else if (scenario === "nohotel") {
    auth.permissions = [...auth.hotels[0]!.permissions];
    auth.globalRoles = ["admin"];
    auth.hotels = [];
    auth.activeHotelId = null;
  }
});
