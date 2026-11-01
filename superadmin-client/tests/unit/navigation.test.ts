import { describe, it, expect } from "vitest";
import { navigationForPath, firstPermittedPath } from "../../utils/navigation";

describe("platform route permissions", () => {
  it("maps detail and finance routes to the enclosing global permission", () => {
    expect(navigationForPath("/hotels/hotel-1")?.permission).toBe(
      "platform.hotel.read"
    );
    expect(navigationForPath("/finance/ledger")?.permission).toBe(
      "platform.finance.read"
    );
    expect(navigationForPath("/users/user-1")?.permission).toBe(
      "platform.user.read"
    );
  });
  it("does not apply the overview permission to unknown or similarly prefixed paths", () => {
    expect(navigationForPath("/hotels-unrelated")).toBeUndefined();
    expect(navigationForPath("/missing")).toBeUndefined();
    expect(navigationForPath("/403")).toBeUndefined();
  });
  it("finds an accessible landing page without assuming overview access", () => {
    expect(firstPermittedPath(["platform.hotel.read"])).toBe("/hotels");
    expect(firstPermittedPath([])).toBeUndefined();
  });
});
