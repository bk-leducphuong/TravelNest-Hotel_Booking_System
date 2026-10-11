/**
 * Small display helpers shared by the platform pages.
 */

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

export function statusTagType(
  status: string | null | undefined
): "success" | "info" | "warning" | "danger" {
  switch (status) {
    case "active":
      return "success";
    case "pending":
      return "warning";
    case "suspended":
    case "banned":
      return "danger";
    default:
      return "info";
  }
}
