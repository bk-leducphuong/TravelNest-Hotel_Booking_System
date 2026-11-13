<script setup lang="ts">
import {
  fetchConversations,
  fetchConversationMessages,
  sendConversationMessage,
  markConversationRead,
  type ChatMessage,
  type ConversationSummary,
} from "~/services/api/messages";
import { formatDateTime } from "~/utils/format";
import type { Socket } from "socket.io-client";
import { connectChatSocket, disconnectChatSocket } from "~/services/chatSocket";

const auth = useAuthStore();
const { can } = usePermissions();
const { t } = useI18n();

const conversations = ref<ConversationSummary[]>([]);
const loading = ref(false);
const listError = ref("");
const search = ref("");
const unreadOnly = ref(false);

const activeId = ref<string | null>(null);
const messages = ref<ChatMessage[]>([]);
const messagesLoading = ref(false);
const hasMore = ref(false);
const latestSeq = ref(0);
const draft = ref("");
const sending = ref(false);
const sendError = ref("");
const mobileThread = ref(false);
const threadArea = ref<HTMLElement | null>(null);
const typingGuest = ref(false);

let inboxTimer: ReturnType<typeof setInterval> | null = null;
let threadTimer: ReturnType<typeof setInterval> | null = null;
let chatSocket: Socket | null = null;
let joinedConversationId: string | null = null;
let inboxRefreshTimer: ReturnType<typeof setTimeout> | null = null;
let typingClearTimer: ReturnType<typeof setTimeout> | null = null;
let typingEmitTimer: ReturnType<typeof setTimeout> | null = null;

const canRead = computed(() => can("chat.read"));
const canRespond = computed(() => can("chat.respond"));
const activeConversation = computed(
  () => conversations.value.find((entry) => entry.id === activeId.value) ?? null
);

const visibleConversations = computed(() => {
  const term = search.value.trim().toLowerCase();
  if (!term) {
    return conversations.value;
  }
  return conversations.value.filter((conversation) => {
    const name = guestName(conversation).toLowerCase();
    const code = conversation.booking?.bookingCode?.toLowerCase() ?? "";
    return name.includes(term) || code.includes(term);
  });
});

function guestName(conversation: ConversationSummary): string {
  const guest = conversation.guest;
  if (!guest) {
    return t("messages.unknownGuest");
  }
  return (
    [guest.firstName, guest.lastName].filter(Boolean).join(" ") ||
    t("messages.unknownGuest")
  );
}

function initials(conversation: ConversationSummary): string {
  return guestName(conversation).trim().slice(0, 1).toUpperCase();
}

function inboxTime(value?: string | null): string {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { day: "2-digit", month: "short" });
}

function bookingLabel(conversation?: ConversationSummary | null): string {
  const code = conversation?.booking?.bookingCode;
  return code ? t("messages.bookingLabel", { code }) : "";
}

function createClientMessageId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

async function loadConversations({ silent = false } = {}) {
  if (!auth.activeHotelId || !canRead.value) {
    return;
  }
  if (!silent) {
    loading.value = true;
    listError.value = "";
  }
  try {
    const result = await fetchConversations({
      limit: 50,
      unreadOnly: unreadOnly.value || undefined,
    });
    conversations.value = result.data;
    if (activeId.value && !result.data.some((entry) => entry.id === activeId.value)) {
      activeId.value = null;
      messages.value = [];
    }
  } catch (error) {
    if (!silent) {
      listError.value = (error as Error).message;
    }
  } finally {
    if (!silent) {
      loading.value = false;
    }
  }
}

async function loadMessages(conversationId: string, beforeSeq?: number) {
  messagesLoading.value = true;
  try {
    const response = await fetchConversationMessages(
      conversationId,
      beforeSeq ? { beforeSeq } : {}
    );
    messages.value = beforeSeq
      ? [...response.data, ...messages.value]
      : response.data;
    hasMore.value = response.meta.hasMore;
    latestSeq.value = response.meta.latestSeq;
    await markRead(conversationId, response.meta.latestSeq);
    await nextTick();
    scrollToBottom();
  } catch (error) {
    if (!beforeSeq) {
      sendError.value = (error as Error).message;
    }
  } finally {
    messagesLoading.value = false;
  }
}

async function markRead(conversationId: string, seq: number) {
  const conversation = conversations.value.find((entry) => entry.id === conversationId);
  if (conversation) {
    conversation.unreadCount = 0;
  }
  if (!seq) {
    return;
  }
  try {
    await markConversationRead(conversationId, seq);
  } catch {
    // The cursor advances on the next successful read.
  }
}

function joinConversation(conversationId: string | null) {
  if (!conversationId || !chatSocket?.connected || joinedConversationId === conversationId) {
    return;
  }
  if (joinedConversationId) {
    chatSocket.emit("chat:leave", { conversationId: joinedConversationId });
  }
  chatSocket.emit("chat:join", { conversationId });
  joinedConversationId = conversationId;
}

function refreshInboxSoon() {
  if (inboxRefreshTimer) {
    return;
  }
  inboxRefreshTimer = setTimeout(() => {
    inboxRefreshTimer = null;
    void loadConversations({ silent: true });
  }, 400);
}

function upsertIncomingMessage(message: ChatMessage) {
  if (messages.value.some((entry) => entry.id === message.id)) {
    return;
  }
  messages.value = [...messages.value, message].sort((a, b) => a.seq - b.seq);
}

function handleSocketMessage(message: ChatMessage) {
  const conversation = conversations.value.find(
    (entry) => entry.id === message.conversationId
  );
  if (conversation) {
    conversation.lastMessagePreview = message.body.slice(0, 160);
    conversation.lastMessageAt = message.createdAt;
    conversation.lastMessageSeq = message.seq;
  }

  if (message.conversationId !== activeId.value) {
    if (conversation && message.senderSide === "guest" && message.type !== "system") {
      conversation.unreadCount = (conversation.unreadCount || 0) + 1;
    }
    if (!conversation) {
      refreshInboxSoon();
    }
    return;
  }

  upsertIncomingMessage(message);
  if (message.senderSide === "guest") {
    typingGuest.value = false;
    void markRead(message.conversationId, message.seq);
  }
  void nextTick().then(scrollToBottom);
}

function handleSocketActivity(activity: {
  conversationId?: string;
  lastMessageSeq?: number;
  lastMessagePreview?: string;
}) {
  if (!activity?.conversationId) {
    return;
  }
  const conversation = conversations.value.find(
    (entry) => entry.id === activity.conversationId
  );
  if (conversation) {
    conversation.lastMessageSeq = activity.lastMessageSeq ?? conversation.lastMessageSeq;
    if (activity.lastMessagePreview !== undefined) {
      conversation.lastMessagePreview = activity.lastMessagePreview;
    }
  }

  if (activity.conversationId === activeId.value) {
    // The activity event can arrive before the room message; fetch to converge.
    void pollLatest();
  } else {
    refreshInboxSoon();
  }
}

function handleSocketTyping(payload: { conversationId?: string; side?: string }) {
  if (payload?.conversationId !== activeId.value || payload?.side !== "guest") {
    return;
  }
  typingGuest.value = true;
  if (typingClearTimer) {
    clearTimeout(typingClearTimer);
  }
  typingClearTimer = setTimeout(() => {
    typingGuest.value = false;
    typingClearTimer = null;
  }, 4000);
}

function notifyTyping() {
  if (!chatSocket?.connected || !activeId.value || typingEmitTimer) {
    return;
  }
  chatSocket.emit("chat:typing", { conversationId: activeId.value });
  typingEmitTimer = setTimeout(() => {
    typingEmitTimer = null;
  }, 1500);
}

function handleSocketConnect() {
  joinedConversationId = null;
  joinConversation(activeId.value);
}

async function connectSocket() {
  try {
    chatSocket = await connectChatSocket();
    if (!chatSocket) {
      return;
    }
    chatSocket.off("chat:message", handleSocketMessage);
    chatSocket.off("chat:activity", handleSocketActivity);
    chatSocket.off("chat:typing", handleSocketTyping);
    chatSocket.off("connect", handleSocketConnect);
    chatSocket.on("chat:message", handleSocketMessage);
    chatSocket.on("chat:activity", handleSocketActivity);
    chatSocket.on("chat:typing", handleSocketTyping);
    chatSocket.on("connect", handleSocketConnect);
    if (chatSocket.connected) {
      joinConversation(activeId.value);
    }
  } catch {
    // Polling remains the fallback when the socket cannot connect.
    chatSocket = null;
  }
}

async function selectConversation(conversation: ConversationSummary) {
  activeId.value = conversation.id;
  mobileThread.value = true;
  messages.value = [];
  hasMore.value = false;
  sendError.value = "";
  typingGuest.value = false;
  joinConversation(conversation.id);
  await loadMessages(conversation.id);
}

async function loadEarlier() {
  const conversationId = activeId.value;
  const first = messages.value[0];
  if (!conversationId || !first) {
    return;
  }
  await loadMessages(conversationId, first.seq);
}

async function pollLatest() {
  const conversationId = activeId.value;
  if (!conversationId || !canRead.value) {
    return;
  }
  try {
    const response = await fetchConversationMessages(conversationId, { limit: 30 });
    if (conversationId !== activeId.value) {
      return;
    }
    const known = new Set(messages.value.map((message) => message.id));
    const added = response.data.filter((message) => !known.has(message.id));
    if (!added.length) {
      return;
    }
    messages.value = [...messages.value, ...added].sort((a, b) => a.seq - b.seq);
    if (added.some((message) => message.senderSide === "guest")) {
      await markRead(conversationId, response.meta.latestSeq);
    }
    await nextTick();
    scrollToBottom();
  } catch {
    // Transient failure: the next poll retries.
  }
}

async function send() {
  const conversationId = activeId.value;
  const body = draft.value.trim();
  if (!conversationId || !body || sending.value || !canRespond.value) {
    return;
  }

  sending.value = true;
  sendError.value = "";
  try {
    const message = await sendConversationMessage(conversationId, {
      body,
      clientMessageId: createClientMessageId(),
    });
    if (!messages.value.some((entry) => entry.id === message.id)) {
      messages.value = [...messages.value, message];
    }
    latestSeq.value = Math.max(latestSeq.value, message.seq);
    draft.value = "";

    const conversation = conversations.value.find((entry) => entry.id === conversationId);
    if (conversation) {
      conversation.lastMessagePreview = body.slice(0, 160);
      conversation.lastMessageAt = message.createdAt;
      conversation.lastMessageSeq = message.seq;
      conversation.unreadCount = 0;
    }

    await nextTick();
    scrollToBottom();
  } catch (error) {
    sendError.value = (error as Error).message;
  } finally {
    sending.value = false;
  }
}

function scrollToBottom() {
  if (threadArea.value) {
    threadArea.value.scrollTop = threadArea.value.scrollHeight;
  }
}

function backToInbox() {
  mobileThread.value = false;
}

// Realtime is additive: the hotel page listens on the /property socket when it
// can connect, and these polls stay in place as a fallback. Messages are
// persisted before any emit and these polls read the committed rows, so the API
// remains authoritative even when the socket is unavailable.
function startPolling() {
  stopPolling();
  inboxTimer = setInterval(() => void loadConversations({ silent: true }), 20000);
  threadTimer = setInterval(() => void pollLatest(), 8000);
}

function stopPolling() {
  if (inboxTimer) {
    clearInterval(inboxTimer);
  }
  if (threadTimer) {
    clearInterval(threadTimer);
  }
  inboxTimer = null;
  threadTimer = null;
}

onMounted(async () => {
  await loadConversations();
  await connectSocket();
  startPolling();
});

watch(
  () => auth.activeHotelId,
  async () => {
    if (chatSocket && joinedConversationId) {
      chatSocket.emit("chat:leave", { conversationId: joinedConversationId });
      joinedConversationId = null;
    }
    activeId.value = null;
    messages.value = [];
    typingGuest.value = false;
    await loadConversations();
  }
);

watch(unreadOnly, () => loadConversations());

watch(draft, (value) => {
  if (value.trim()) {
    notifyTyping();
  }
});

onBeforeUnmount(() => {
  stopPolling();
  if (chatSocket && joinedConversationId) {
    chatSocket.emit("chat:leave", { conversationId: joinedConversationId });
  }
  disconnectChatSocket();
  chatSocket = null;
  joinedConversationId = null;
  if (inboxRefreshTimer) {
    clearTimeout(inboxRefreshTimer);
    inboxRefreshTimer = null;
  }
  if (typingClearTimer) {
    clearTimeout(typingClearTimer);
    typingClearTimer = null;
  }
  if (typingEmitTimer) {
    clearTimeout(typingEmitTimer);
    typingEmitTimer = null;
  }
});
</script>

<template>
  <div class="space-y-5">
    <UiPageHeader
      :title="$t('messages.title')"
      :subtitle="$t('messages.subtitle')"
    />

    <div v-if="!auth.activeHotelId" class="tn-section">
      <UiEmptyState
        :title="$t('messages.noHotel')"
        :description="$t('messages.noHotelHint')"
      />
    </div>

    <div v-else-if="!canRead" class="tn-section">
      <UiEmptyState
        :title="$t('messages.permissionDenied')"
        :description="$t('messages.permissionDeniedHint')"
      />
    </div>

    <div v-else class="grid gap-4 lg:grid-cols-[340px_1fr]">
      <div class="chat-pane" :class="{ 'is-hidden': mobileThread }">
        <div class="border-b border-[#eef1f6] p-4">
          <el-input
            v-model="search"
            :placeholder="$t('messages.search')"
            :aria-label="$t('messages.search')"
            clearable
          />
          <el-checkbox v-model="unreadOnly" class="mt-3">
            {{ $t("messages.unreadOnly") }}
          </el-checkbox>
        </div>

        <p v-if="loading" class="px-4 py-8 text-center text-sm text-muted">
          {{ $t("common.loading") }}
        </p>

        <UiEmptyState
          v-else-if="listError"
          :title="$t('messages.loadError')"
          :description="listError"
        >
          <el-button type="primary" @click="loadConversations()">
            {{ $t("messages.retry") }}
          </el-button>
        </UiEmptyState>

        <UiEmptyState
          v-else-if="!visibleConversations.length"
          :title="$t('messages.empty.title')"
          :description="$t('messages.empty.description')"
        />

        <ul v-else class="chat-list">
          <li v-for="conversation in visibleConversations" :key="conversation.id">
            <button
              type="button"
              class="chat-list-item"
              :class="{ 'is-active': conversation.id === activeId }"
              @click="selectConversation(conversation)"
            >
              <span class="chat-avatar" aria-hidden="true">
                {{ initials(conversation) }}
              </span>
              <span class="min-w-0 flex-1">
                <span class="flex items-baseline justify-between gap-2">
                  <span class="truncate text-sm font-medium">
                    {{ guestName(conversation) }}
                  </span>
                  <span class="shrink-0 text-[11px] text-muted">
                    {{ inboxTime(conversation.lastMessageAt) }}
                  </span>
                </span>
                <span
                  v-if="bookingLabel(conversation)"
                  class="block text-[11px] text-brand"
                >
                  {{ bookingLabel(conversation) }}
                </span>
                <span class="mt-0.5 flex items-center justify-between gap-2">
                  <span class="truncate text-xs text-muted">
                    {{ conversation.lastMessagePreview || $t("messages.noMessagesYet") }}
                  </span>
                  <el-badge
                    v-if="conversation.unreadCount > 0"
                    :value="conversation.unreadCount"
                    :max="99"
                  />
                </span>
              </span>
            </button>
          </li>
        </ul>
      </div>

      <div class="chat-pane" :class="{ 'is-hidden': !mobileThread }">
        <template v-if="activeConversation">
          <header class="flex items-center gap-3 border-b border-[#eef1f6] p-4">
            <button
              type="button"
              class="chat-back lg:hidden"
              :aria-label="$t('messages.back')"
              @click="backToInbox"
            >
              ←
            </button>
            <div class="min-w-0">
              <h2 class="truncate font-medium">
                {{ guestName(activeConversation) }}
              </h2>
              <p class="text-xs text-muted">
                <span v-if="bookingLabel(activeConversation)" class="text-brand">
                  {{ bookingLabel(activeConversation) }}
                </span>
                <span v-if="activeConversation.booking" class="ml-2">
                  {{ activeConversation.booking.checkInDate }} →
                  {{ activeConversation.booking.checkOutDate }}
                </span>
              </p>
            </div>
          </header>

          <div ref="threadArea" class="chat-thread">
            <button
              v-if="hasMore"
              type="button"
              class="mx-auto rounded-full border border-[#d8dee8] bg-white px-3 py-1 text-xs text-brand"
              :disabled="messagesLoading"
              @click="loadEarlier"
            >
              {{ $t("messages.loadEarlier") }}
            </button>

            <p
              v-if="messagesLoading && !messages.length"
              class="py-8 text-center text-sm text-muted"
            >
              {{ $t("common.loading") }}
            </p>

            <p v-else-if="!messages.length" class="py-8 text-center text-sm text-muted">
              {{ $t("messages.sayHello") }}
            </p>

            <div
              v-for="message in messages"
              :key="message.id"
              class="chat-row"
              :class="message.type === 'system' ? 'is-system' : `is-${message.senderSide}`"
            >
              <p v-if="message.type === 'system'" class="chat-system">
                {{ message.body }}
              </p>
              <div v-else class="chat-bubble">
                <p class="chat-body">{{ message.body }}</p>
                <span class="chat-time">
                  {{ formatDateTime(message.createdAt) }}
                  <el-tag
                    v-if="message.flagged"
                    size="small"
                    type="warning"
                    class="ml-2"
                  >
                    {{ $t("messages.flagged") }}
                  </el-tag>
                </span>
              </div>
            </div>
          </div>

          <p v-if="typingGuest" class="chat-typing" role="status" aria-live="polite">
            {{ $t("messages.typing") }}
          </p>

          <p v-if="activeConversation.status !== 'open'" class="chat-closed">
            {{ $t("messages.closed") }}
          </p>

          <form v-else class="chat-composer" @submit.prevent="send">
            <el-input
              v-model="draft"
              type="textarea"
              :rows="2"
              :maxlength="4000"
              resize="none"
              :placeholder="$t('messages.placeholder')"
              :aria-label="$t('messages.placeholder')"
              @keydown.enter.exact.prevent="send"
            />
            <div class="mt-2 flex items-center justify-between gap-3">
              <p v-if="sendError" class="text-xs text-[#b3261e]">{{ sendError }}</p>
              <span v-else class="text-xs text-muted">
                {{ draft.trim().length }}/4000
              </span>
              <el-button
                type="primary"
                native-type="submit"
                :loading="sending"
                :disabled="!draft.trim() || !canRespond"
              >
                {{ sending ? $t("messages.sending") : $t("messages.send") }}
              </el-button>
            </div>
          </form>
        </template>

        <div v-else class="flex flex-1 items-center justify-center">
          <UiEmptyState
            :title="$t('messages.select.title')"
            :description="$t('messages.select.description')"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-pane {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 62vh;
  background: white;
  border-radius: 20px;
  overflow: hidden;
}

.chat-list {
  max-height: 66vh;
  overflow-y: auto;
}

.chat-list-item {
  display: flex;
  gap: 12px;
  width: 100%;
  padding: 12px 16px;
  text-align: left;
  border: 0;
  background: transparent;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.chat-list-item:hover,
.chat-list-item.is-active {
  background: var(--tn-soft);
}

.chat-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 38px;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: var(--tn-brand);
  color: white;
  font-weight: 600;
}

.chat-back {
  border: 0;
  background: transparent;
  color: var(--tn-brand);
  font-size: 20px;
  cursor: pointer;
}

.chat-thread {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 10px;
  max-height: 52vh;
  overflow-y: auto;
  padding: 16px;
  background: #fbfcfe;
}

.chat-row {
  display: flex;
}

.chat-row.is-hotel {
  justify-content: flex-end;
}

.chat-row.is-system {
  justify-content: center;
}

.chat-bubble {
  max-width: 75%;
  padding: 10px 14px;
  border-radius: 14px;
  background: white;
  border: 1px solid #e7ecf3;
}

.chat-row.is-hotel .chat-bubble {
  background: var(--tn-brand);
  border-color: var(--tn-brand);
  color: white;
}

.chat-body {
  white-space: pre-wrap;
  word-break: break-word;
}

.chat-time {
  display: block;
  margin-top: 4px;
  font-size: 11px;
  opacity: 0.65;
}

.chat-system {
  padding: 4px 12px;
  border-radius: 999px;
  background: #eef1f6;
  color: var(--tn-muted);
  font-size: 12px;
}

.chat-composer {
  padding: 16px;
  border-top: 1px solid #eef1f6;
}

.chat-closed {
  padding: 16px;
  border-top: 1px solid #eef1f6;
  color: var(--tn-muted);
  font-size: 13px;
}

.chat-typing {
  padding: 8px 16px 0;
  color: var(--tn-muted);
  font-size: 12px;
  font-style: italic;
}

@media (max-width: 1023px) {
  .chat-pane.is-hidden {
    display: none;
  }
}
</style>
