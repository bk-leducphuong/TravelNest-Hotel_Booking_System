import { describe, it, expect } from "vitest";
import {
  hasPermission,
  hasAnyPermission,
  isPlatformStaffRole,
  PLATFORM_STAFF_ROLES,
} from "../../utils/permissions";

describe("permission helpers", () => {
  describe("hasPermission", () => {
    it("returns true when the permission is present", () => {
      expect(
        hasPermission(["platform.hotel.read"], "platform.hotel.read")
      ).toBe(true);
    });

    it("returns false when the permission is absent", () => {
      expect(hasPermission(["platform.hotel.read"], "platform.user.read")).toBe(
        false
      );
    });

    it("handles null/undefined permission lists", () => {
      expect(hasPermission(null, "platform.hotel.read")).toBe(false);
      expect(hasPermission(undefined, "platform.hotel.read")).toBe(false);
    });
  });

  describe("hasAnyPermission", () => {
    it("returns true when at least one permission matches", () => {
      expect(
        hasAnyPermission(
          ["platform.user.read"],
          ["platform.hotel.read", "platform.user.read"]
        )
      ).toBe(true);
    });

    it("returns false when none match", () => {
      expect(
        hasAnyPermission(["platform.audit.read"], ["platform.hotel.read"])
      ).toBe(false);
    });

    it("returns true for an empty requirement list", () => {
      expect(hasAnyPermission([], [])).toBe(true);
    });
  });

  describe("isPlatformStaffRole", () => {
    it("recognises platform staff roles", () => {
      expect(isPlatformStaffRole(["admin"])).toBe(true);
      expect(isPlatformStaffRole(["support_agent"])).toBe(true);
      expect(isPlatformStaffRole(["owner", "admin"])).toBe(true);
    });

    it("rejects non-platform roles", () => {
      expect(isPlatformStaffRole(["owner", "manager", "staff"])).toBe(false);
      expect(isPlatformStaffRole(["user"])).toBe(false);
      expect(isPlatformStaffRole(null)).toBe(false);
      expect(isPlatformStaffRole(undefined)).toBe(false);
    });

    it("exposes the platform staff role list", () => {
      expect(PLATFORM_STAFF_ROLES).toEqual(["admin", "support_agent"]);
    });
  });
});
