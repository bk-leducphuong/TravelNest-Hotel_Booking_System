import { describe, it, expect } from "vitest";
import { formatDate, statusTagType, formatMoney } from "../../utils/format";

describe("format helpers", () => {
  describe("formatDate", () => {
    it("returns an em dash for missing or invalid values", () => {
      expect(formatDate(null)).toBe("—");
      expect(formatDate(undefined)).toBe("—");
      expect(formatDate("not-a-date")).toBe("—");
    });

    it("formats a valid ISO timestamp", () => {
      const result = formatDate("2024-01-01T00:00:00.000Z");
      expect(result).not.toBe("—");
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("statusTagType", () => {
    it("maps statuses to Element Plus tag types", () => {
      expect(statusTagType("active")).toBe("success");
      expect(statusTagType("completed")).toBe("success");
      expect(statusTagType("succeeded")).toBe("success");
      expect(statusTagType("paid")).toBe("success");
      expect(statusTagType("pending")).toBe("warning");
      expect(statusTagType("processing")).toBe("warning");
      expect(statusTagType("suspended")).toBe("danger");
      expect(statusTagType("banned")).toBe("danger");
      expect(statusTagType("failed")).toBe("danger");
      expect(statusTagType("inactive")).toBe("info");
      expect(statusTagType(null)).toBe("info");
    });
  });

  describe("formatMoney", () => {
    it("formats numbers and numeric strings", () => {
      expect(formatMoney(120, "USD")).toContain("120");
      expect(formatMoney("120.50", "USD")).toContain("120.5");
    });

    it("returns an em dash for missing or invalid values", () => {
      expect(formatMoney(null)).toBe("—");
      expect(formatMoney(undefined)).toBe("—");
      expect(formatMoney("not-a-number")).toBe("—");
    });
  });
});

describe("currency and locale integrity", () => {
  it("uses currency precision and the requested locale", () => {
    expect(formatMoney("12.345", "KWD", "en")).toContain("12.345");
    expect(formatMoney("1200", "JPY", "en")).not.toContain(".00");
    expect(formatMoney("1200.50", "USD", "vi")).toContain("1.200,50");
    expect(formatDate("2026-10-31T09:00:00Z", "en")).toContain("UTC");
  });
  it("preserves large decimal strings without a Number conversion", () => {
    expect(formatMoney("100000000000000001.01", "USD", "en")).toContain(
      "100,000,000,000,000,001.01"
    );
  });
  it("does not invent a currency or format invalid/empty monetary values", () => {
    expect(formatMoney("5")).toBe("—");
    expect(formatMoney("", "USD")).toBe("—");
    expect(formatMoney(Infinity, "USD")).toBe("—");
    expect(formatMoney("5", "INVALID")).toBe("—");
  });
});
