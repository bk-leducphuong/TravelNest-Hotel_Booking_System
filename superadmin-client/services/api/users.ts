import { apiFetch } from "~/services/http";

export interface UserSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string | null;
  phoneNumber: string | null;
  status: string;
  createdAt: string;
  lastLoginAt: string | null;
  emailVerifiedAt: string | null;
  globalRoles: string[];
}

export interface UserMembership {
  hotelId: string;
  hotelName: string | null;
  hotelStatus: string | null;
  role: string | null;
  isPrimaryOwner: boolean;
}

export interface UserDetail extends UserSummary {
  address: string | null;
  dateOfBirth: string | null;
  globalRoleDetails: { id: string; name: string; description: string | null }[];
  memberships: UserMembership[];
  bookings: { total: number };
}

export interface Paged<T> {
  data: T[];
  meta: { page: number; limit: number; total: number };
}

export interface UserListParams {
  search?: string;
  status?: string;
  role?: string;
  page?: number;
  limit?: number;
}

function queryString(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export async function fetchUsers(
  params: UserListParams = {}
): Promise<Paged<UserSummary>> {
  return await apiFetch<Paged<UserSummary>>(
    `/superadmin/users${queryString(params)}`
  );
}

export async function fetchUser(userId: string): Promise<UserDetail> {
  const response = await apiFetch<{ data: UserDetail }>(
    `/superadmin/users/${userId}`
  );
  return response.data;
}
