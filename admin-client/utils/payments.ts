/**
 * Payment/refund presentation helpers (pure).
 */

export const TRANSACTION_STATUSES = [
  "pending",
  "processing",
  "completed",
  "failed",
  "cancelled",
  "refunded",
  "partially_refunded",
] as const;

export const TRANSACTION_TYPES = ["payment", "refund", "payout"] as const;

export const REFUND_STATUSES = ["pending", "processing", "succeeded", "failed", "cancelled"] as const;

export const REFUND_REASONS = [
  "free_cancellation",
  "customer_request",
  "hotel_cancelled",
  "duplicate",
  "fraudulent",
  "other",
] as const;

type TagType = "primary" | "success" | "info" | "warning" | "danger";

export function humanize(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function transactionStatusTagType(status: string): TagType {
  switch (status) {
    case "completed":
      return "success";
    case "pending":
    case "processing":
    case "partially_refunded":
      return "warning";
    case "refunded":
      return "info";
    case "failed":
    case "cancelled":
      return "danger";
    default:
      return "info";
  }
}

export function refundStatusTagType(status: string): TagType {
  switch (status) {
    case "succeeded":
      return "success";
    case "pending":
    case "processing":
      return "warning";
    case "failed":
    case "cancelled":
      return "danger";
    default:
      return "info";
  }
}

export function isRefundableTransaction(status: string): boolean {
  return status === "completed" || status === "partially_refunded";
}

export function isRetryableRefund(status: string): boolean {
  return status === "failed";
}

/**
 * Sum of refunds that count against the transaction balance.
 */
export function activeRefundTotal(
  refunds: { amount: string | number; status: string }[] | undefined
): number {
  if (!refunds?.length) {
    return 0;
  }
  return refunds
    .filter((refund) => ["pending", "processing", "succeeded"].includes(refund.status))
    .reduce((sum, refund) => sum + Number(refund.amount || 0), 0);
}

export function remainingRefundable(
  transactionAmount: string | number,
  refunds: { amount: string | number; status: string }[] | undefined
): number {
  return Math.max(0, Math.round((Number(transactionAmount || 0) - activeRefundTotal(refunds)) * 100) / 100);
}
