import { apiFetch } from "~/services/http";

/**
 * Current-user profile (admin account). The password/sign-in flow is owned by
 * Keycloak, so only profile fields are editable here.
 */

export interface AdminProfile {
  id: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  phone_number?: string | null;
  profile_picture_url?: string | null;
  [key: string]: unknown;
}

export interface ProfileUpdatePayload {
  name?: string;
  email?: string;
  phoneNumber?: string;
}

export async function fetchProfile(): Promise<AdminProfile> {
  const response = await apiFetch<{ data: AdminProfile }>("/user");
  return response.data;
}

export async function updateProfile(payload: ProfileUpdatePayload): Promise<void> {
  await apiFetch("/user", { method: "PATCH", body: payload });
}
