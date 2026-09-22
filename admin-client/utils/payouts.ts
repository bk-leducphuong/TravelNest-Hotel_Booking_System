/**
 * Payout helpers mirrored from the server domain
 * (`server/modules/payout/domain/payout-rules.js`).
 */

export const PAYOUT_STATUSES = ["pending", "processing", "paid", "failed", "cancelled"] as const;

const PAYOUT_TRANSITIONS: Record<string, string[]> = {
  pending: ["processing", "paid", "failed", "cancelled"],
  processing: ["paid", "failed"],
  failed: ["pending", "processing", "cancelled"],
  paid: [],
  cancelled: [],
};

export const ONBOARDING_STATUSES = [
  "not_started",
  "pending",
  "completed",
  "restricted",
  "disabled",
] as const;

type TagType = "primary" | "success" | "info" | "warning" | "danger";

export function humanize(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function payoutStatusTagType(status: string): TagType {
  switch (status) {
    case "paid":
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

export function payoutTransitions(from: string): string[] {
  return PAYOUT_TRANSITIONS[from] ?? [];
}

export function canProcessPayout(status: string): boolean {
  return status === "pending";
}

export function onboardingStatusTagType(status: string): TagType {
  switch (status) {
    case "completed":
      return "success";
    case "pending":
      return "warning";
    case "restricted":
    case "disabled":
      return "danger";
    default:
      return "info";
  }
}

export function isAccountPayoutReady(
  account: { payouts_enabled?: boolean; onboarding_status?: string } | null | undefined
): boolean {
  return Boolean(account?.payouts_enabled) && account?.onboarding_status === "completed";
}
