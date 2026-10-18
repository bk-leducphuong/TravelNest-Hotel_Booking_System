import { describe, it, expect } from "vitest";
import { ADMIN_NAV } from "../../utils/navigation";

describe("admin navigation", () => {
  it("includes the rooms and settings sections", () => {
    const paths = ADMIN_NAV.map((item) => item.to);
    expect(paths).toContain("/rooms");
    expect(paths).toContain("/reservations");
    expect(paths).toContain("/settings");
    expect(paths).toContain("/settings/team");
  });

  it("uses an i18n label key for every item", () => {
    ADMIN_NAV.forEach((item) => expect(item.labelKey.startsWith("nav.")).toBe(true));
  });

  it("gates the rooms entry on room.read", () => {
    const rooms = ADMIN_NAV.find((item) => item.to === "/rooms");
    expect(rooms?.permission).toBe("room.read");
  });

  it("leaves dashboard and settings ungated", () => {
    expect(ADMIN_NAV.find((item) => item.to === "/")?.permission).toBeUndefined();
    expect(ADMIN_NAV.find((item) => item.to === "/settings")?.permission).toBeUndefined();
  });
});
