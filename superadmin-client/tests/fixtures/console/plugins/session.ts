import { useAuthStore } from "../../../../stores/auth";

export default defineNuxtPlugin(() => {
  const auth = useAuthStore();
  const scenario = new URL(window.location.href).searchParams.get("fixture");
  auth.initialized = true;
  auth.authenticated = scenario !== "anonymous";
  auth.sessionLoaded = true;
  auth.user = { id: "platform-fixture-user", email: "operator@example.test" };
  auth.globalRoles = [
    scenario === "nonstaff"
      ? "owner"
      : scenario === "support"
        ? "support_agent"
        : "admin",
  ];
  auth.permissions =
    scenario === "none" || scenario === "nonstaff"
      ? []
      : scenario === "hotelsonly"
        ? ["platform.hotel.read"]
        : [
            "platform.overview.read",
            "platform.hotel.read",
            "platform.user.read",
            "platform.finance.read",
            "platform.audit.read",
          ];
});
