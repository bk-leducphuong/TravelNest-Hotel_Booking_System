import type { FilterField } from "./list-query";
export const options = (values: string[], group = "status") =>
  values.map((value) => ({ value, labelKey: `${group}.${value}` }));
export const HOTEL_FILTERS: FilterField[] = [
  { key: "search", labelKey: "filters.hotelSearch" },
  {
    key: "status",
    labelKey: "fields.status",
    options: options(["active", "inactive", "pending", "suspended"]),
  },
];
export const USER_FILTERS: FilterField[] = [
  { key: "search", labelKey: "filters.userSearch" },
  {
    key: "status",
    labelKey: "fields.status",
    options: options(["active", "inactive", "banned"]),
  },
  {
    key: "role",
    labelKey: "fields.role",
    maxLength: 50,
    options: options(["user", "admin", "support_agent", "owner"], "roles"),
  },
];
export const LEDGER_EVENTS = [
  "payment_succeeded",
  "refund_succeeded",
  "payout_created",
  "payout_paid",
  "payout_failed",
  "platform_fee_recognized",
  "manual_adjustment",
];
export const dateFilters: FilterField[] = [
  { key: "from", labelKey: "filters.from", type: "date" },
  { key: "to", labelKey: "filters.to", type: "date" },
];
export const financeFilters = (kind: string): FilterField[] => [
  ...(kind === "ledger"
    ? [
        {
          key: "direction",
          labelKey: "fields.direction",
          options: options(["debit", "credit"], "directions"),
        },
        {
          key: "eventType",
          labelKey: "fields.event",
          options: options(LEDGER_EVENTS, "events"),
        },
      ]
    : [
        {
          key: "status",
          labelKey: "fields.status",
          options: options(
            kind === "payments"
              ? [
                  "completed",
                  "pending",
                  "processing",
                  "failed",
                  "cancelled",
                  "refunded",
                  "partially_refunded",
                ]
              : kind === "refunds"
                ? ["succeeded", "pending", "processing", "failed", "cancelled"]
                : ["paid", "pending", "processing", "failed", "cancelled"]
          ),
        },
      ]),
  {
    key: "currency",
    labelKey: "fields.currency",
    type: "currency",
    maxLength: 3,
  },
  { key: "hotelId", labelKey: "fields.hotelId", type: "uuid" },
  ...dateFilters,
];
export const AUDIT_FILTERS: FilterField[] = [
  { key: "action", labelKey: "fields.action", maxLength: 100 },
  { key: "entityType", labelKey: "fields.entityType", maxLength: 50 },
  { key: "entityId", labelKey: "fields.entityId", maxLength: 64 },
  { key: "actorUserId", labelKey: "fields.actorId", type: "uuid" },
  { key: "hotelId", labelKey: "fields.hotelId", type: "uuid" },
  ...dateFilters,
];
