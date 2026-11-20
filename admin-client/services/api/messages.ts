import { apiFetch } from "~/services/http";

export interface PaginatedMeta {
  page: number;
  limit: number;
  total: number;
}

export interface MessageSender {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
}

export interface MessageAttachment {
  id: string;
  objectKey: string;
  mimeType: string;
  sizeBytes: number;
  position: number;
  url?: string | null;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  seq: number;
  senderSide: "guest" | "hotel" | "system";
  type: "text" | "system" | "image";
  body: string;
  flagged: boolean;
  flagReason?: string | null;
  clientMessageId?: string | null;
  createdAt: string;
  attachments: MessageAttachment[];
  sender?: MessageSender | null;
}

export interface ConversationGuest {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
}

export interface ConversationBooking {
  id: string;
  bookingCode: string;
  checkInDate: string;
  checkOutDate: string;
  status: string;
}

export interface ConversationSummary {
  id: string;
  status: "open" | "archived";
  lastMessageSeq: number;
  lastMessageAt?: string | null;
  lastMessagePreview?: string | null;
  unreadCount: number;
  hotel?: { id: string; name: string } | null;
  booking?: ConversationBooking | null;
  guest?: ConversationGuest | null;
}

export interface MessagePage {
  data: ChatMessage[];
  meta: { hasMore: boolean; latestSeq: number };
}

export interface ConversationFilters {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}

function toQuery<T extends object>(filters: T): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });
  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function fetchConversations(
  filters: ConversationFilters = {}
): Promise<{ data: ConversationSummary[]; meta: PaginatedMeta }> {
  const response = await apiFetch<{
    data: ConversationSummary[];
    meta: PaginatedMeta;
  }>(`/admin/conversations${toQuery(filters)}`);
  return { data: response.data, meta: response.meta };
}

export async function fetchConversationMessages(
  conversationId: string,
  options: { beforeSeq?: number; limit?: number } = {}
): Promise<MessagePage> {
  const response = await apiFetch<MessagePage>(
    `/admin/conversations/${encodeURIComponent(conversationId)}/messages${toQuery(
      options
    )}`
  );
  return { data: response.data, meta: response.meta };
}

export async function uploadConversationAttachments(
  conversationId: string,
  files: File[]
): Promise<MessageAttachment[]> {
  const form = new FormData();
  files.forEach((file) => form.append("images", file));
  const response = await apiFetch<{ data: MessageAttachment[] }>(
    `/admin/conversations/${encodeURIComponent(conversationId)}/attachments`,
    { method: "POST", body: form }
  );
  return response.data;
}

export async function sendConversationMessage(
  conversationId: string,
  payload: { body: string; clientMessageId?: string; attachmentKeys?: string[] }
): Promise<ChatMessage> {
  const response = await apiFetch<{ data: ChatMessage }>(
    `/admin/conversations/${encodeURIComponent(conversationId)}/messages`,
    { method: "POST", body: payload }
  );
  return response.data;
}

export async function markConversationRead(
  conversationId: string,
  lastSeq: number
): Promise<{ lastReadSeq: number }> {
  const response = await apiFetch<{ data: { lastReadSeq: number } }>(
    `/admin/conversations/${encodeURIComponent(conversationId)}/read`,
    { method: "POST", body: { lastSeq } }
  );
  return response.data;
}

export async function fetchConversationUnreadCount(): Promise<number> {
  const response = await apiFetch<{ data: { unread: number } }>(
    "/admin/conversations/unread-count"
  );
  return response.data?.unread ?? 0;
}
