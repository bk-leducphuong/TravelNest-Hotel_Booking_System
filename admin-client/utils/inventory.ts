/**
 * Inventory/availability helpers (pure, unit-testable).
 */

export const INVENTORY_STATUSES = ["open", "close", "sold_out", "maintenance"] as const;
export type InventoryStatus = (typeof INVENTORY_STATUSES)[number];

const STATUS_KEYS: Record<string, string> = {
  open: "inventory.status.open",
  close: "inventory.status.close",
  sold_out: "inventory.status.sold_out",
  maintenance: "inventory.status.maintenance",
};

/** i18n key for a status; unknown statuses fall through unchanged. */
export function inventoryStatusKey(status: string): string {
  return STATUS_KEYS[status] ?? status;
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

export const MONTH_KEYS = [
  "inventory.month.1",
  "inventory.month.2",
  "inventory.month.3",
  "inventory.month.4",
  "inventory.month.5",
  "inventory.month.6",
  "inventory.month.7",
  "inventory.month.8",
  "inventory.month.9",
  "inventory.month.10",
  "inventory.month.11",
  "inventory.month.12",
];

export const WEEKDAY_KEYS = [
  "inventory.weekday.mon",
  "inventory.weekday.tue",
  "inventory.weekday.wed",
  "inventory.weekday.thu",
  "inventory.weekday.fri",
  "inventory.weekday.sat",
  "inventory.weekday.sun",
];
