import { useRuntimeConfig } from "#imports";
import { getAccessToken } from "~/services/keycloak";
import { useAuthStore } from "~/stores/auth";

/**
 * Admin BFF HTTP client.
 *
 * - attaches the Keycloak bearer token,
 * - sends the active hotel as `X-Hotel-Id` (required by hotel-scoped routes),
 * - normalises the server's `{ error: { code, message } }` shape into a thrown
 *   `ApiError`, and clears the session on 401.
 */

const API_PREFIX = "/api/v1";

export class ApiError extends Error {
  status: number;
  code?: string;
  data?: unknown;

  constructor(message: string, status: number, code?: string, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

function resolveBaseUrl(): string {
  const config = useRuntimeConfig();
  const base = String(config.public.apiBase || "").replace(/\/$/, "");
  if (!base) {
    throw new Error("NUXT_PUBLIC_API_BASE is not configured.");
  }
  return base.endsWith(API_PREFIX) ? base : `${base}${API_PREFIX}`;
}

export interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const auth = useAuthStore();
  const headers = new Headers(options.headers);

  const token = await getAccessToken().catch(() => null);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (auth.activeHotelId) {
    headers.set("X-Hotel-Id", auth.activeHotelId);
  }

  let body = options.body as BodyInit | undefined;
  if (options.body !== undefined && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(options.body);
  }

  const response = await fetch(`${resolveBaseUrl()}${path}`, {
    ...options,
    headers,
    body,
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message =
      payload?.error?.message || payload?.message || response.statusText || "Request failed";

    if (response.status === 401) {
      auth.reset();
    }

    throw new ApiError(message, response.status, payload?.error?.code, payload);
  }

  return payload as T;
}
