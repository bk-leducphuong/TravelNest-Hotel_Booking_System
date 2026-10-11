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
    case "completed":
    case "succeeded":
    case "paid":
      return "success";
    case "pending":
    case "processing":
      return "warning";
    case "suspended":
    case "banned":
    case "failed":
    case "cancelled":
      return "danger";
    default:
      return "info";
  }
}

export function formatMoney(
  amount: number | string | null | undefined,
  currency = "USD"
): string {
  const value = typeof amount === "string" ? Number(amount) : amount;
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}
