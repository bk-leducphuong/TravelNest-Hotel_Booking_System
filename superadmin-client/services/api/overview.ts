import { apiFetch } from "~/services/http";

export interface PlatformOverview {
  hotels: {
    total: number;
    byStatus: Record<string, number>;
  };
  users: {
    total: number;
    byStatus: Record<string, number>;
  };
  bookings: {
    total: number;
  };
  generatedAt: string;
}

/**
 * Load platform-wide KPI counts.
 */
export async function fetchOverview(): Promise<PlatformOverview> {
  const response = await apiFetch<{ data: PlatformOverview }>(
    "/superadmin/overview"
  );
  return response.data;
}
