import type { HotelDetail, HotelUpdatePayload } from "../services/api/catalog";

const numeric = (value: unknown) =>
  value === null || value === undefined || value === ""
    ? undefined
    : Number(value);
export function hotelDraft(data?: HotelDetail) {
  return {
    name: data?.name ?? "",
    description: data?.description ?? "",
    address: data?.address ?? "",
    cityId: data?.city_id ?? undefined,
    countryId: data?.country_id ?? undefined,
    phoneNumber: data?.phone_number ?? "",
    latitude: numeric(data?.latitude),
    longitude: numeric(data?.longitude),
    hotelClass: numeric(data?.hotel_class),
    minPrice: numeric(data?.min_price),
    status: data?.status ?? "active",
    checkInTime: data?.check_in_time ?? "",
    checkOutTime: data?.check_out_time ?? "",
    checkInPolicy: data?.check_in_policy ?? "",
    checkOutPolicy: data?.check_out_policy ?? "",
    timezone: data?.timezone ?? "",
  };
}
export const HOTEL_SECTIONS = {
  information: [
    "name",
    "status",
    "phoneNumber",
    "hotelClass",
    "minPrice",
    "description",
  ],
  location: [
    "address",
    "countryId",
    "cityId",
    "latitude",
    "longitude",
    "timezone",
  ],
  stay: ["checkInTime", "checkOutTime", "checkInPolicy", "checkOutPolicy"],
} as const;
export type HotelSection = keyof typeof HOTEL_SECTIONS;
export function hotelSectionPayload(
  draft: ReturnType<typeof hotelDraft>,
  section: HotelSection
): HotelUpdatePayload {
  return Object.fromEntries(
    HOTEL_SECTIONS[section]
      .map((key) => [key, draft[key]])
      .filter(
        ([key, value]) =>
          value !== undefined &&
          (value !== "" ||
            [
              "description",
              "phoneNumber",
              "checkInPolicy",
              "checkOutPolicy",
            ].includes(String(key)))
      )
  ) as HotelUpdatePayload;
}
