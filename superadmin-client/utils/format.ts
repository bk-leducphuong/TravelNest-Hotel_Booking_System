/**
 * Small display helpers shared by the platform pages.
 */

export function formatDate(
  value: string | null | undefined,
  locale = "en"
): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "long",
        timeZone: "UTC",
      }).format(date);
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
  currency?: string | null,
  locale = "en"
): string {
  if (
    !currency ||
    !/^[A-Za-z]{3}$/.test(currency) ||
    amount == null ||
    (typeof amount === "number" && !Number.isFinite(amount)) ||
    (typeof amount === "string" && !/^[+-]?\d+(\.\d+)?$/.test(amount.trim()))
  )
    return "—";
  try {
    // Modern Intl accepts decimal strings exactly; the TS overload still expects
    // a number. This assertion does not coerce large decimal strings to Number.
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount as number);
  } catch {
    return "—";
  }
}
