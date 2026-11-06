import { describe, it, expect } from "vitest";
import {
  ADMIN_NAV,
  visibleDestinations,
  groupDestinations,
  activeDestination,
} from "../../utils/navigation";

describe("admin navigation", () => {
  it("includes the rooms and settings sections", () => {
    const paths = ADMIN_NAV.map((item) => item.to);
    expect(paths).toContain("/rooms");
    expect(paths).toContain("/reservations");
    expect(paths).toContain("/settings");
    expect(paths).toContain("/settings/team");
  });

  it("uses an i18n label key for every item", () => {
    ADMIN_NAV.forEach((item) =>
      expect(item.labelKey.startsWith("nav.")).toBe(true)
    );
  });

  it("gates the rooms entry on room.read", () => {
    const rooms = ADMIN_NAV.find((item) => item.to === "/rooms");
    expect(rooms?.permission).toBe("room.read");
  });

  it("leaves dashboard and settings ungated", () => {
    expect(
      ADMIN_NAV.find((item) => item.to === "/")?.permission
    ).toBeUndefined();
    expect(
      ADMIN_NAV.find((item) => item.to === "/settings")?.permission
    ).toBeUndefined();
  });
});

describe("grouped destination permissions", () => {
  it("keeps Availability reachable and gates creation independently", () => {
    const readOnly = visibleDestinations(
      (permission) => permission === "room.read"
    );
    expect(readOnly.map((item) => item.to)).toContain("/availability");
    expect(readOnly.map((item) => item.to)).not.toContain("/rooms/new");
    const createOnly = visibleDestinations(
      (permission) => permission === "room.create"
    );
    expect(createOnly.map((item) => item.to)).toContain("/rooms/new");
    expect(createOnly.map((item) => item.to)).not.toContain("/rooms");
  });

  it("drops inaccessible groups when hotel permissions change", () => {
    const finance = groupDestinations(
      visibleDestinations((permission) => permission === "payment.read")
    );
    expect(finance.some((group) => group.key === "finance")).toBe(true);
    const restricted = groupDestinations(visibleDestinations(() => false));
    expect(restricted.some((group) => group.key === "finance")).toBe(false);
    expect(restricted.every((group) => group.items.length > 0)).toBe(true);
  });

  it("selects only the most specific matching destination", () => {
    expect(activeDestination("/settings/team", ADMIN_NAV)?.to).toBe(
      "/settings/team"
    );
    expect(activeDestination("/rooms/new", ADMIN_NAV)?.to).toBe("/rooms/new");
    expect(activeDestination("/payments/transactions/123", ADMIN_NAV)?.to).toBe(
      "/payments"
    );
    expect(activeDestination("/rooms-other", ADMIN_NAV)).toBeUndefined();
  });

  it("keeps Reviews in its own section whatever the hotel permissions allow", () => {
    const owner = groupDestinations(visibleDestinations(() => true));
    const reviews = owner.find((group) => group.key === "reviews");
    expect(reviews?.labelKey).toBe("nav.group.reviews");
    expect(reviews?.items.map((item) => item.to)).toEqual(["/reviews"]);

    // Without finance access Reviews must not fall back into another section.
    const withoutFinance = groupDestinations(
      visibleDestinations((permission) => permission !== "payment.read")
    );
    expect(
      withoutFinance.find((group) => group.key === "finance")
    ).toBeUndefined();
    expect(
      withoutFinance.find((group) => group.key === "reviews")?.items
    ).toEqual([ADMIN_NAV.find((item) => item.to === "/reviews")]);
  });
});
