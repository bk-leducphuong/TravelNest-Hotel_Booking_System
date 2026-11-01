export interface FilterOption {
  value: string;
  labelKey: string;
}
export interface FilterField {
  key: string;
  labelKey: string;
  type?: "text" | "date" | "uuid" | "currency";
  options?: FilterOption[];
  maxLength?: number;
}
export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[457][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const validDate = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value;

export function parseListQuery(
  query: Record<string, unknown>,
  fields: FilterField[],
  defaultLimit = 20,
  maxLimit = 100
) {
  const values: Record<string, string> = {};
  let error = "";
  for (const field of fields) {
    const raw = query[field.key];
    if (raw != null && typeof raw !== "string") error = "errors.invalidFilters";
    let value = typeof raw === "string" ? raw.trim() : "";
    if (field.type === "currency") value = value.toUpperCase();
    values[field.key] = value;
    if (!value) continue;
    if (
      value.length > (field.maxLength ?? 200) ||
      (field.options &&
        !field.options.some((option) => option.value === value)) ||
      (field.type === "uuid" && !UUID_PATTERN.test(value)) ||
      (field.type === "currency" && !/^[A-Z]{3}$/.test(value)) ||
      (field.type === "date" && !validDate(value))
    )
      error = "errors.invalidFilters";
  }
  if (values.from && values.to && values.from > values.to)
    error = "errors.dateRange";
  const integer = (value: unknown, fallback: number, max: number) => {
    if (value == null) return fallback;
    if (
      typeof value !== "string" ||
      !/^[1-9]\d*$/.test(value) ||
      !Number.isSafeInteger(Number(value)) ||
      Number(value) > max
    ) {
      error = "errors.invalidFilters";
      return fallback;
    }
    return Number(value);
  };
  const page = integer(query.page, 1, Number.MAX_SAFE_INTEGER);
  const limit = integer(query.limit, defaultLimit, maxLimit);
  return { values, page, limit, error };
}

/** Calendar ranges are UTC and inclusive, matching the repository's <= end. */
export function listApiParams(
  values: Record<string, string>,
  page: number,
  limit: number
) {
  const params: Record<string, string | number> = { page, limit };
  for (const [key, value] of Object.entries(values)) {
    if (value)
      params[key] =
        key === "from"
          ? `${value}T00:00:00.000Z`
          : key === "to"
            ? `${value}T23:59:59.999Z`
            : value;
  }
  return params;
}

/** Back links accept only this directory's local path and query. */
export function safeDirectoryBack(
  value: unknown,
  directory: "/hotels" | "/users"
) {
  return typeof value === "string" &&
    (value === directory || value.startsWith(`${directory}?`)) &&
    !/[\r\n#\\]/.test(value)
    ? value
    : directory;
}
