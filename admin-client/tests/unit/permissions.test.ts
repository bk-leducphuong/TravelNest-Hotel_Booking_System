import { describe, it, expect } from "vitest";
import { hasPermission, hasAnyPermission } from "../../utils/permissions";

describe("permission helpers", () => {
  const permissions = ["booking.read", "room.manage_inventory", "review.moderate"];

  describe("hasPermission", () => {
    it("returns true only for granted permissions", () => {
      expect(hasPermission(permissions, "booking.read")).toBe(true);
      expect(hasPermission(permissions, "payment.refund")).toBe(false);
    });

    it("is safe for missing permission lists", () => {
      expect(hasPermission(undefined, "booking.read")).toBe(false);
      expect(hasPermission(null, "booking.read")).toBe(false);
      expect(hasPermission([], "booking.read")).toBe(false);
    });
  });

  describe("hasAnyPermission", () => {
    it("returns true when at least one permission is granted", () => {
      expect(hasAnyPermission(permissions, ["payment.refund", "review.moderate"])).toBe(true);
      expect(hasAnyPermission(permissions, ["payment.refund", "user.manage"])).toBe(false);
    });

    it("treats an empty requirement as allowed", () => {
      expect(hasAnyPermission(permissions, [])).toBe(true);
    });
  });
});
