import { describe, it, expect } from "vitest";
import {
  activeRefundTotal,
  isRefundableTransaction,
  isRetryableRefund,
  refundStatusTagType,
  remainingRefundable,
  transactionStatusTagType,
} from "../../utils/payments";

describe("payment helpers", () => {
  describe("status guards", () => {
    it("marks completed/partially refunded transactions refundable", () => {
      expect(isRefundableTransaction("completed")).toBe(true);
      expect(isRefundableTransaction("partially_refunded")).toBe(true);
      expect(isRefundableTransaction("pending")).toBe(false);
      expect(isRefundableTransaction("refunded")).toBe(false);
    });

    it("only retries failed refunds", () => {
      expect(isRetryableRefund("failed")).toBe(true);
      expect(isRetryableRefund("succeeded")).toBe(false);
      expect(isRetryableRefund("processing")).toBe(false);
    });
  });

  describe("refund totals", () => {
    it("sums only active refunds", () => {
      const refunds = [
        { amount: "10.00", status: "succeeded" },
        { amount: "5.00", status: "processing" },
        { amount: "3.00", status: "failed" },
        { amount: "2.00", status: "cancelled" },
      ];
      expect(activeRefundTotal(refunds)).toBe(15);
    });

    it("computes the remaining refundable balance", () => {
      expect(remainingRefundable("100.00", [{ amount: "30.00", status: "succeeded" }])).toBe(70);
      expect(remainingRefundable("100.00", [])).toBe(100);
      expect(remainingRefundable("100.00", [{ amount: "150", status: "succeeded" }])).toBe(0);
    });
  });

  describe("tag types", () => {
    it("maps transaction statuses", () => {
      expect(transactionStatusTagType("completed")).toBe("success");
      expect(transactionStatusTagType("refunded")).toBe("info");
      expect(transactionStatusTagType("failed")).toBe("danger");
      expect(transactionStatusTagType("partially_refunded")).toBe("warning");
    });

    it("maps refund statuses", () => {
      expect(refundStatusTagType("succeeded")).toBe("success");
      expect(refundStatusTagType("processing")).toBe("warning");
      expect(refundStatusTagType("failed")).toBe("danger");
    });
  });
});
