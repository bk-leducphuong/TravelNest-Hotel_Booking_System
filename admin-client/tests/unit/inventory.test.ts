import { describe, it, expect } from "vitest";
import {
  MONTH_KEYS,
  WEEKDAY_KEYS,
  addMonths,
  inventoryStatusKey,
  inventoryStatusTagType,
  monthBounds,
  monthMatrix,
} from "../../utils/inventory";

describe("inventory helpers", () => {
  describe("addMonths", () => {
    it("rolls across year boundaries", () => {
      expect(addMonths(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
      expect(addMonths(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
      expect(addMonths(2026, 6, 0)).toEqual({ year: 2026, month: 6 });
    });
  });

  describe("monthBounds", () => {
    it("returns the first and last day of the month", () => {
      expect(monthBounds(2026, 9)).toEqual({ startDate: "2026-09-01", endDate: "2026-09-30" });
      expect(monthBounds(2024, 2)).toEqual({ startDate: "2024-02-01", endDate: "2024-02-29" });
    });
  });

  describe("monthMatrix", () => {
    it("builds a Monday-first grid of ISO dates padded to full weeks", () => {
      const weeks = monthMatrix(2026, 9);
      expect(weeks.length).toBeGreaterThanOrEqual(4);
      weeks.forEach((week) => expect(week).toHaveLength(7));

      // 2026-09-01 is a Tuesday -> one leading blank (Monday).
      expect(weeks[0][0]).toBeNull();
      expect(weeks[0][1]).toBe("2026-09-01");

      const allDates = weeks.flat().filter(Boolean);
      expect(allDates).toContain("2026-09-30");
      expect(allDates).not.toContain("2026-10-01");
    });
  });

  describe("status presentation", () => {
    it("maps statuses to i18n keys", () => {
      expect(inventoryStatusKey("close")).toBe("inventory.status.close");
      expect(inventoryStatusKey("open")).toBe("inventory.status.open");
      expect(inventoryStatusKey("sold_out")).toBe("inventory.status.sold_out");
      expect(inventoryStatusKey("maintenance")).toBe("inventory.status.maintenance");
    });

    it("falls back to the raw status for unknown values", () => {
      expect(inventoryStatusKey("mystery")).toBe("mystery");
    });

    it("maps statuses to tag types", () => {
      expect(inventoryStatusTagType("open")).toBe("success");
      expect(inventoryStatusTagType("close")).toBe("danger");
      expect(inventoryStatusTagType("sold_out")).toBe("warning");
      expect(inventoryStatusTagType("maintenance")).toBe("info");
    });
  });

  describe("calendar labels", () => {
    it("exposes i18n keys for months and weekdays", () => {
      expect(MONTH_KEYS).toHaveLength(12);
      expect(MONTH_KEYS[0]).toBe("inventory.month.1");
      expect(MONTH_KEYS[11]).toBe("inventory.month.12");
      expect(WEEKDAY_KEYS).toHaveLength(7);
      expect(WEEKDAY_KEYS[0]).toBe("inventory.weekday.mon");
    });
  });
});
