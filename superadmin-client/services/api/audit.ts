import { apiFetch } from "~/services/http";

export interface AuditEntry {
  id: string;
  actorUserId: string | null;
  actorType: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  hotelId: string | null;
  reason: string | null;
  requestId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface Paged<T> {
  data: T[];
  meta: { page: number; limit: number; total: number };
}

export interface AuditListParams {
  action?: string;
  entityType?: string;
  entityId?: string;
  actorUserId?: string;
  hotelId?: string;
  from?: string;
  to?: string;
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

export async function fetchAudit(
  params: AuditListParams = {}
): Promise<Paged<AuditEntry>> {
  return await apiFetch<Paged<AuditEntry>>(
    `/superadmin/audit${queryString(params)}`
  );
}
