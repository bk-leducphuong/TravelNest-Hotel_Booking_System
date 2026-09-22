import { describe, it, expect } from "vitest";
import {
  canProcessPayout,
  isAccountPayoutReady,
  onboardingStatusTagType,
  payoutStatusTagType,
  payoutTransitions,
} from "../../utils/payouts";

describe("payout helpers", () => {
  describe("payoutTransitions", () => {
    it("mirrors the server state machine", () => {
      expect(payoutTransitions("pending").sort()).toEqual([
        "cancelled",
        "failed",
        "paid",
        "processing",
      ]);
      expect(payoutTransitions("processing").sort()).toEqual(["failed", "paid"]);
      expect(payoutTransitions("failed").sort()).toEqual(["cancelled", "pending", "processing"]);
    });

    it("treats paid/cancelled as terminal", () => {
      expect(payoutTransitions("paid")).toEqual([]);
      expect(payoutTransitions("cancelled")).toEqual([]);
    });
  });

  describe("canProcessPayout", () => {
    it("only pending payouts can be processed", () => {
      expect(canProcessPayout("pending")).toBe(true);
      expect(canProcessPayout("processing")).toBe(false);
      expect(canProcessPayout("paid")).toBe(false);
    });
  });

  describe("presentation", () => {
    it("maps payout statuses to tag types", () => {
      expect(payoutStatusTagType("paid")).toBe("success");
      expect(payoutStatusTagType("pending")).toBe("warning");
      expect(payoutStatusTagType("failed")).toBe("danger");
    });

    it("maps onboarding statuses to tag types", () => {
      expect(onboardingStatusTagType("completed")).toBe("success");
      expect(onboardingStatusTagType("pending")).toBe("warning");
      expect(onboardingStatusTagType("restricted")).toBe("danger");
    });
  });

  describe("isAccountPayoutReady", () => {
    it("requires payouts enabled and completed onboarding", () => {
      expect(isAccountPayoutReady({ payouts_enabled: true, onboarding_status: "completed" })).toBe(true);
      expect(isAccountPayoutReady({ payouts_enabled: true, onboarding_status: "pending" })).toBe(false);
      expect(isAccountPayoutReady(null)).toBe(false);
    });
  });
});
