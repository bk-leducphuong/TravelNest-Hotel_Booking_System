/**
 * Inventory/availability helpers (pure, unit-testable).
 */

export const INVENTORY_STATUSES = ["open", "close", "sold_out", "maintenance"] as const;
export type InventoryStatus = (typeof INVENTORY_STATUSES)[number];

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  close: "Closed",
  sold_out: "Sold out",
  maintenance: "Maintenance",
};

export function inventoryStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

export function inventoryStatusTagType(
  status: string
): "primary" | "success" | "info" | "warning" | "danger" {
  switch (status) {
    case "open":
      return "success";
    case "close":
      return "danger";
    case "sold_out":
      return "warning";
    case "maintenance":
      return "info";
    default:
      return "info";
  }
}

export function inventoryStatusTextClass(status: string): string {
  switch (status) {
    case "open":
      return "text-emerald-600";
    case "close":
      return "text-rose-600";
    case "sold_out":
      return "text-amber-600";
    case "maintenance":
      return "text-sky-600";
    default:
      return "text-slate-500";
  }
}

export function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function monthBounds(year: number, month: number): { startDate: string; endDate: string } {
  const startDate = toDateOnly(new Date(Date.UTC(year, month - 1, 1)));
  const endDate = toDateOnly(new Date(Date.UTC(year, month, 0)));
  return { startDate, endDate };
}

export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const zeroBased = month - 1 + delta;
  return {
    year: year + Math.floor(zeroBased / 12),
    month: ((zeroBased % 12) + 12) % 12 + 1,
  };
}

/**
 * Build a Monday-first month grid of ISO dates (null = padding cell).
 */
export function monthMatrix(year: number, month: number): (string | null)[][] {
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const leadingBlanks = (firstDay.getUTCDay() + 6) % 7; // Monday-first

  const cells: (string | null)[] = [];
  for (let i = 0; i < leadingBlanks; i += 1) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(toDateOnly(new Date(Date.UTC(year, month - 1, day))));
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

export const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
