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
      permissions: ["room.read", "room.create", "room.update", "room.delete"],
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
});
