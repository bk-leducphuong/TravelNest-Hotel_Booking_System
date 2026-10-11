import { describe, it, expect } from "vitest";
import { formatDate, statusTagType } from "../../utils/format";

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
      expect(statusTagType("pending")).toBe("warning");
      expect(statusTagType("suspended")).toBe("danger");
      expect(statusTagType("banned")).toBe("danger");
      expect(statusTagType("inactive")).toBe("info");
      expect(statusTagType(null)).toBe("info");
    });
  });
});
