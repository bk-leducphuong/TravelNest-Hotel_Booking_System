/**
 * Review helpers mirrored from the server domain
 * (`server/modules/review/domain/review-status.js`).
 */

export const REVIEW_STATUSES = ["published", "hidden", "deleted"] as const;

const REVIEW_TRANSITIONS: Record<string, string[]> = {
  published: ["hidden", "deleted"],
  hidden: ["published", "deleted"],
  deleted: [],
};

type TagType = "primary" | "success" | "info" | "warning" | "danger";

export function reviewTransitions(from: string): string[] {
  return REVIEW_TRANSITIONS[from] ?? [];
}

export function canReplyToReview(status: string): boolean {
  return status !== "deleted";
}

export function reviewStatusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function reviewStatusTagType(status: string): TagType {
  switch (status) {
    case "published":
      return "success";
    case "hidden":
      return "warning";
    case "deleted":
      return "danger";
    default:
      return "info";
  }
}

export function formatRating(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(1) : "—";
}
