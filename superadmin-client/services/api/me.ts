import { apiFetch } from "~/services/http";

export interface SuperadminUser {
  id: string;
  email: string;
}

export interface SuperadminMe {
  user: SuperadminUser;
  globalRoles: string[];
  tokenRoles: string[];
  permissions: string[];
}

/**
 * Load the platform session: identity, global roles and global permissions.
 */
export async function fetchSuperadminMe(): Promise<SuperadminMe> {
  const response = await apiFetch<{ data: SuperadminMe }>("/superadmin/me");
  return response.data;
}
