import { apiFetch } from "~/services/http";

export interface AdminHotel {
  id: string;
  name: string | null;
  role: string | null;
  isPrimaryOwner: boolean;
  permissions: string[];
}

export interface AdminUser {
  id: string;
  email: string;
}

export interface AdminMe {
  user: AdminUser;
  globalRoles: string[];
  tokenRoles: string[];
  permissions: string[];
  hotels: AdminHotel[];
}

/**
 * Load the admin session: identity, effective permissions and managed hotels.
 */
export async function fetchAdminMe(): Promise<AdminMe> {
  const response = await apiFetch<{ data: AdminMe }>("/admin/me");
  return response.data;
}
