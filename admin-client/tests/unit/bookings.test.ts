import { describe, it, expect } from "vitest";
import {
  allowedNextStatuses,
  canCancelBooking,
  bookingStatusLabel,
  bookingStatusTagType,
} from "../../utils/bookings";

describe("booking rules", () => {
  describe("allowedNextStatuses", () => {
    it("exposes valid transitions but never cancelling (dedicated endpoint)", () => {
      expect(allowedNextStatuses("confirmed").sort()).toEqual(["checked_in", "no_show"]);
      expect(allowedNextStatuses("checked_in")).toEqual(["completed"]);
      expect(allowedNextStatuses("pending_payment")).toEqual(["confirmed"]);
    });

    it("returns nothing for terminal statuses", () => {
      expect(allowedNextStatuses("completed")).toEqual([]);
      expect(allowedNextStatuses("cancelled")).toEqual([]);
      expect(allowedNextStatuses("no_show")).toEqual([]);
    });
  });

  describe("canCancelBooking", () => {
    it("allows cancelling active bookings only", () => {
      expect(canCancelBooking("pending")).toBe(true);
      expect(canCancelBooking("confirmed")).toBe(true);
      expect(canCancelBooking("checked_in")).toBe(true);
      expect(canCancelBooking("completed")).toBe(false);
      expect(canCancelBooking("cancelled")).toBe(false);
    });
  });

  describe("presentation helpers", () => {
    it("labels statuses", () => {
      expect(bookingStatusLabel("pending_payment")).toBe("Pending Payment");
      expect(bookingStatusLabel("no_show")).toBe("No Show");
    });

    it("maps statuses to tag types", () => {
      expect(bookingStatusTagType("confirmed")).toBe("success");
      expect(bookingStatusTagType("cancelled")).toBe("danger");
      expect(bookingStatusTagType("completed")).toBe("info");
      expect(bookingStatusTagType("pending")).toBe("warning");
    });
  });
});
