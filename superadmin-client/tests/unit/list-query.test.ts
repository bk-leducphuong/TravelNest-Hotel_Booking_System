import { describe, it, expect } from "vitest";
import {
  parseListQuery,
  listApiParams,
  safeDirectoryBack,
} from "../../utils/list-query";
import {
  HOTEL_FILTERS,
  financeFilters,
  AUDIT_FILTERS,
} from "../../utils/list-config";
describe("applied list queries", () => {
  it("restores pagination and filters without forwarding unrelated query fields", () => {
    const parsed = parseListQuery(
      { search: " Riverside ", page: "3", limit: "50", redirect: "/finance" },
      HOTEL_FILTERS
    );
    expect(parsed.error).toBe("");
    expect(listApiParams(parsed.values, parsed.page, parsed.limit)).toEqual({
      search: "Riverside",
      page: 3,
      limit: 50,
    });
  });
  it.each([
    { page: "0" },
    { page: ["1", "2"] },
    { limit: "500" },
    { page: "9007199254740992" },
    { status: "invented" },
  ])("rejects malformed query %j", (query) => {
    expect(parseListQuery(query, HOTEL_FILTERS).error).toBe(
      "errors.invalidFilters"
    );
  });
  it("normalizes currency and makes the full UTC end date inclusive", () => {
    const parsed = parseListQuery(
      { currency: "kwd", from: "2026-02-01", to: "2026-02-28" },
      financeFilters("payments")
    );
    expect(parsed.error).toBe("");
    expect(listApiParams(parsed.values, 1, 20)).toEqual({
      currency: "KWD",
      from: "2026-02-01T00:00:00.000Z",
      to: "2026-02-28T23:59:59.999Z",
      page: 1,
      limit: 20,
    });
  });
  it("rejects impossible dates, reversed ranges and incomplete identifiers", () => {
    expect(
      parseListQuery({ from: "2026-02-30" }, financeFilters("refunds")).error
    ).toBe("errors.invalidFilters");
    expect(
      parseListQuery({ from: "2026-03-02", to: "2026-03-01" }, AUDIT_FILTERS)
        .error
    ).toBe("errors.dateRange");
    expect(parseListQuery({ hotelId: "hotel-1" }, AUDIT_FILTERS).error).toBe(
      "errors.invalidFilters"
    );
    expect(
      parseListQuery(
        { hotelId: "019b637c-5eb2-7000-8000-000000000001" },
        AUDIT_FILTERS
      ).error
    ).toBe("");
  });
  it("honors audit pagination limits without allowing them on directory lists", () => {
    expect(parseListQuery({ limit: "200" }, AUDIT_FILTERS, 50, 200).error).toBe(
      ""
    );
    expect(parseListQuery({ limit: "200" }, HOTEL_FILTERS).error).toBe(
      "errors.invalidFilters"
    );
  });
  it("permits only the directory path and its query in Back links", () => {
    expect(safeDirectoryBack("/hotels?page=2&status=active", "/hotels")).toBe(
      "/hotels?page=2&status=active"
    );
    for (const value of [
      "//example.com",
      "https://example.com",
      "/users",
      "/hotels/record",
      "/hotels?x=\n",
    ])
      expect(safeDirectoryBack(value, "/hotels")).toBe("/hotels");
  });
});
