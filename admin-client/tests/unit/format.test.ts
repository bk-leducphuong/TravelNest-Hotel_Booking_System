import { describe, it, expect } from "vitest";
import { formatDateTime, formatMoney } from "../../utils/format";

describe("format helpers", () => {
  it("formats money with two decimals", () => {
    expect(formatMoney(1234.5, "USD")).toBe("$1,234.50");
    expect(formatMoney("0", "USD")).toBe("$0.00");
    expect(formatMoney(undefined)).toBe("$0.00");
  });

  it("formats date-times and handles missing values", () => {
    expect(formatDateTime(null)).toBe("—");
    expect(formatDateTime("not-a-date")).toBe("—");
    expect(formatDateTime("2026-03-15T10:00:00.000Z")).not.toBe("—");
  });
});
