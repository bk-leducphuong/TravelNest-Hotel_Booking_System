<script>
  import Header from '@/components/Header.vue'
  import Footer from '@/components/Footer.vue'
  import EmptyState from '@/components/common/EmptyState.vue'
  import ErrorState from '@/components/common/ErrorState.vue'
  import { MessagingService } from '@/services/messaging.service'
  import { getUserSocket } from '@/services/userSocket'
  import { createClientMessageId, formatInboxTime, formatMessageTime } from '@/utils/chatTime'

  const MAX_BODY = 4000
  const TYPING_THROTTLE_MS = 2500
  const TYPING_TIMEOUT_MS = 3500

  export default {
    name: 'Messages',
    components: { Header, Footer, EmptyState, ErrorState },
    data() {
      return {
        conversations: [],
        loading: true,
        loadError: false,
        activeId: null,
        messages: [],
        messagesLoading: false,
        hasMore: false,
        latestSeq: 0,
        draft: '',
        sending: false,
        sendError: '',
        loadingMore: false,
        typing: false,
        mobileThread: false,
        socket: null,
        lastTypingAt: 0,
        typingTimer: null
      }
    },
    computed: {
      activeConversation() {
        return this.conversations.find((conversation) => conversation.id === this.activeId) || null
      },
      locale() {
        return this.$i18n.locale
      },
      canSend() {
        return (
          !this.sending &&
          this.draft.trim().length > 0 &&
          this.activeConversation?.status === 'open'
        )
      },
      emptyInbox() {
        return !this.loading && !this.loadError && this.conversations.length === 0
      }
    },
    async mounted() {
      await this.loadConversations()
      await this.connectSocket()

      const bookingId = this.$route.query.bookingId
      if (bookingId) {
        await this.openForBooking(String(bookingId))
      } else if (this.conversations.length === 1) {
        this.openConversation(this.conversations[0])
      }
    },
    beforeUnmount() {
      if (this.socket) {
        this.socket.off('chat:message', this.onIncomingMessage)
        this.socket.off('chat:activity', this.onActivity)
        this.socket.off('chat:typing', this.onTyping)
        this.leaveActiveRoom()
      }
      if (this.typingTimer) {
        clearTimeout(this.typingTimer)
      }
    },
    methods: {
      async loadConversations() {
        this.loadError = false
        this.loading = true
        try {
          const response = await MessagingService.listConversations({ limit: 50 })
          this.conversations = response?.data || []
        } catch (error) {
          this.loadError = true
        } finally {
          this.loading = false
        }
      },
      async connectSocket() {
        try {
          this.socket = await getUserSocket()
          this.socket.on('chat:message', this.onIncomingMessage)
          this.socket.on('chat:activity', this.onActivity)
          this.socket.on('chat:typing', this.onTyping)
        } catch (error) {
          // Realtime is an enhancement: history still loads over REST.
          this.socket = null
        }
      },
      async openForBooking(bookingId) {
        try {
          const response = await MessagingService.openConversation(bookingId)
          const conversation = response?.data
          if (!conversation) return

          const existing = this.conversations.find((entry) => entry.id === conversation.id)
          if (!existing) {
            this.conversations.unshift(conversation)
          }
          await this.openConversation(existing || conversation)
        } catch (error) {
          this.sendError = error?.response?.data?.message || this.$t('messages.openError')
        }
      },
      async openConversation(conversation) {
        if (!conversation) return

        if (this.activeId && this.activeId !== conversation.id) {
          this.leaveActiveRoom()
        }

        this.activeId = conversation.id
        this.mobileThread = true
        this.messages = []
        this.hasMore = false
        this.latestSeq = Number(conversation.lastMessageSeq || 0)
        this.sendError = ''

        this.joinRoom(conversation.id)
        await this.loadMessages(conversation)
      },
      joinRoom(conversationId) {
        if (!this.socket) return
        this.socket.emit('chat:join', { conversationId })
      },
      leaveActiveRoom() {
        if (this.socket && this.activeId) {
          this.socket.emit('chat:leave', { conversationId: this.activeId })
        }
      },
      async loadMessages(conversation, { beforeSeq } = {}) {
        this.messagesLoading = true
        try {
          const response = await MessagingService.getMessages(conversation.id, {
            limit: 30,
            ...(beforeSeq ? { beforeSeq } : {})
          })
          const batch = response?.data || []

          if (beforeSeq) {
            this.messages = [...batch, ...this.messages]
          } else {
            this.messages = batch
          }

          this.hasMore = Boolean(response?.meta?.hasMore)
          this.latestSeq = Number(response?.meta?.latestSeq || this.latestSeq)
          this.markRead(conversation.id, this.latestSeq)
          this.scrollToBottom()
        } catch (error) {
          this.sendError = this.$t('messages.loadThreadError')
        } finally {
          this.messagesLoading = false
        }
      },
      async loadMore() {
        if (!this.activeConversation || this.messagesLoading || !this.messages.length) return
        this.loadingMore = true
        try {
          await this.loadMessages(this.activeConversation, { beforeSeq: this.messages[0].seq })
        } finally {
          this.loadingMore = false
        }
      },
      async markRead(conversationId, seq) {
        if (!conversationId || !seq) return

        const conversation = this.conversations.find((entry) => entry.id === conversationId)
        if (conversation) {
          conversation.unreadCount = 0
        }

        try {
          await MessagingService.markRead(conversationId, seq)
        } catch (error) {
          // Non-fatal: the cursor advances on the next successful read.
        }
      },
      async send() {
        if (!this.canSend) return

        const body = this.draft.trim()
        const conversationId = this.activeId
        this.sending = true
        this.sendError = ''

        try {
          const response = await MessagingService.sendMessage(conversationId, {
            body,
            clientMessageId: createClientMessageId()
          })
          const message = response?.data
          if (message) {
            this.appendMessage(message)
          }
          this.draft = ''
          await this.$nextTick()
          this.scrollToBottom()
        } catch (error) {
          this.sendError = error?.response?.data?.message || this.$t('messages.sendError')
        } finally {
          this.sending = false
        }
      },
      appendMessage(message) {
        if (!message) return
        if (this.messages.some((entry) => entry.id === message.id)) return
        this.messages.push(message)
        this.latestSeq = Math.max(this.latestSeq, Number(message.seq || 0))

        if (message.senderSide === 'guest') {
          this.markRead(message.conversationId, this.latestSeq)
        }
      },
      onIncomingMessage(message) {
        if (!message) return

        if (message.conversationId === this.activeId) {
          this.appendMessage(message)
          if (message.senderSide !== 'guest') {
            this.markRead(this.activeId, this.latestSeq)
          }
          this.$nextTick(() => this.scrollToBottom())
          return
        }

        // Non-active threads are updated by `chat:activity`, which is emitted to
        // the user room whether or not this socket joined the thread room.
      },
      onActivity(payload) {
        const conversation = this.conversations.find(
          (entry) => entry.id === payload?.conversationId
        )

        if (!conversation) {
          if (payload?.conversationId) {
            this.loadConversations()
          }
          return
        }

        conversation.lastMessageSeq = Math.max(
          Number(conversation.lastMessageSeq || 0),
          Number(payload.lastMessageSeq || 0)
        )
        conversation.lastMessagePreview =
          payload.lastMessagePreview || conversation.lastMessagePreview
        conversation.lastMessageAt = new Date().toISOString()

        if (payload.conversationId !== this.activeId) {
          conversation.unreadCount = Number(conversation.unreadCount || 0) + 1
        }
      },
      onTyping(payload) {
        if (payload?.conversationId !== this.activeId || payload?.side === 'guest') return

        this.typing = true
        if (this.typingTimer) {
          clearTimeout(this.typingTimer)
        }
        this.typingTimer = setTimeout(() => {
          this.typing = false
        }, TYPING_TIMEOUT_MS)
      },
      notifyTyping() {
        if (!this.socket || !this.activeId) return

        const now = Date.now()
        if (now - this.lastTypingAt < TYPING_THROTTLE_MS) return

        this.lastTypingAt = now
        this.socket.emit('chat:typing', { conversationId: this.activeId })
      },
      scrollToBottom() {
        const area = this.$refs.scrollArea
        if (area) {
          area.scrollTop = area.scrollHeight
        }
      },
      backToInbox() {
        this.mobileThread = false
      },
      hotelName(conversation) {
        return conversation?.hotel?.name || this.$t('messages.unknownHotel')
      },
      bookingLabel(conversation) {
        const code = conversation?.booking?.bookingCode
        return code ? this.$t('messages.bookingLabel', { code }) : ''
      },
      inboxTime(value) {
        return formatInboxTime(value, this.locale)
      },
      messageTime(value) {
        return formatMessageTime(value, this.locale)
      },
      initials(name) {
        return String(name || '?')
          .trim()
          .slice(0, 1)
          .toUpperCase()
      }
    }
  }
</script>

<template>
  <Header :is-search-open="false" />
  <main id="guest-main" class="guest-page messages-page">
    <div class="messages-shell">
      <aside class="messages-inbox" :class="{ 'is-hidden': mobileThread }">
        <header class="inbox-header">
          <h1 class="guest-page-title">{{ $t('messages.title') }}</h1>
          <p class="inbox-subtitle">{{ $t('messages.subtitle') }}</p>
        </header>

        <ErrorState
          v-if="loadError"
          :title="$t('messages.loadError')"
          :message="$t('messages.loadErrorHint')"
          :retry-label="$t('messages.retry')"
          @retry="loadConversations"
        />

        <EmptyState
          v-else-if="emptyInbox"
          :title="$t('messages.empty.title')"
          :message="$t('messages.empty.description')"
        />

        <ul v-else-if="!loading" class="conversation-list">
          <li v-for="conversation in conversations" :key="conversation.id">
            <button
              type="button"
              class="conversation-card"
              :class="{ 'is-active': conversation.id === activeId }"
              @click="openConversation(conversation)"
            >
              <span class="conversation-avatar" aria-hidden="true">{{
                initials(hotelName(conversation))
              }}</span>
              <span class="conversation-body">
                <span class="conversation-top">
                  <span class="conversation-hotel">{{ hotelName(conversation) }}</span>
                  <span class="conversation-time">{{ inboxTime(conversation.lastMessageAt) }}</span>
                </span>
                <span v-if="bookingLabel(conversation)" class="conversation-booking">{{
                  bookingLabel(conversation)
                }}</span>
                <span class="conversation-preview">
                  {{ conversation.lastMessagePreview || $t('messages.noMessagesYet') }}
                </span>
              </span>
              <ElBadge
                v-if="conversation.unreadCount > 0"
                :value="conversation.unreadCount"
                :max="99"
                class="conversation-badge"
              />
            </button>
          </li>
        </ul>

        <p v-else class="inbox-loading" role="status">{{ $t('messages.loading') }}</p>
      </aside>

      <section class="messages-thread" :class="{ 'is-hidden': !mobileThread }">
        <template v-if="activeConversation">
          <header class="thread-header">
            <button
              type="button"
              class="thread-back"
              :aria-label="$t('messages.back')"
              @click="backToInbox"
            >
              ←
            </button>
            <div class="thread-heading">
              <h2>{{ hotelName(activeConversation) }}</h2>
              <p v-if="bookingLabel(activeConversation)" class="thread-booking">
                {{ bookingLabel(activeConversation) }}
              </p>
            </div>
          </header>

          <div ref="scrollArea" class="thread-messages">
            <button
              v-if="hasMore"
              type="button"
              class="thread-load-more"
              :disabled="loadingMore"
              @click="loadMore"
            >
              {{ loadingMore ? $t('messages.loading') : $t('messages.loadEarlier') }}
            </button>

            <p v-if="messagesLoading && !messages.length" class="thread-loading" role="status">
              {{ $t('messages.loading') }}
            </p>

            <p v-else-if="!messages.length" class="thread-empty">
              {{ $t('messages.sayHello') }}
            </p>

            <div
              v-for="message in messages"
              :key="message.id"
              class="message-row"
              :class="message.type === 'system' ? 'is-system' : `is-${message.senderSide}`"
            >
              <p v-if="message.type === 'system'" class="system-message">{{ message.body }}</p>
              <div v-else class="bubble" :class="{ 'is-flagged': message.flagged }">
                <p class="bubble-body">{{ message.body }}</p>
                <span v-if="message.flagged" class="bubble-flag">
                  {{ $t('messages.flagged') }}
                </span>
                <time class="bubble-time">{{ messageTime(message.createdAt) }}</time>
              </div>
            </div>

            <p v-if="typing" class="typing-indicator">{{ $t('messages.typing') }}</p>
          </div>

          <p v-if="activeConversation.status !== 'open'" class="thread-closed">
            {{ $t('messages.closed') }}
          </p>

          <form v-else class="composer" @submit.prevent="send">
            <textarea
              v-model="draft"
              class="composer-input"
              :maxlength="4000"
              rows="1"
              :placeholder="$t('messages.placeholder')"
              :aria-label="$t('messages.placeholder')"
              @keydown.enter.exact.prevent="send"
              @input="notifyTyping"
            ></textarea>
            <button type="submit" class="guest-button guest-button-small" :disabled="!canSend">
              {{ sending ? $t('messages.sending') : $t('messages.send') }}
            </button>
          </form>

          <p v-if="sendError" class="composer-error">{{ sendError }}</p>
        </template>

        <div v-else class="thread-placeholder">
          <EmptyState
            :title="$t('messages.select.title')"
            :message="$t('messages.select.description')"
          />
        </div>
      </section>
    </div>
  </main>
  <Footer />
</template>

<style lang="scss" scoped>
  @import '@/assets/styles/index.scss';

  .messages-page {
    padding-top: $spacing-lg;
  }

  .messages-shell {
    display: grid;
    grid-template-columns: minmax(260px, 340px) 1fr;
    gap: $spacing-lg;
    min-height: 60vh;
    max-width: 1100px;
    margin: 0 auto;
  }

  .messages-inbox,
  .messages-thread {
    background: $white;
    border: 1px solid rgba(0, 59, 149, 0.08);
    border-radius: $border-radius-xl;
    box-shadow: $shadow-sm;
    overflow: hidden;
  }

  .messages-inbox {
    display: flex;
    flex-direction: column;
  }

  .inbox-header {
    padding: $spacing-lg $spacing-lg $spacing-md;
    border-bottom: 1px solid #eef1f6;
  }

  .inbox-subtitle {
    margin: $spacing-xs 0 0;
    color: $text-secondary;
    font-size: $font-size-sm;
  }

  .conversation-list {
    list-style: none;
    margin: 0;
    padding: $spacing-sm;
    overflow-y: auto;
    max-height: 62vh;
  }

  .conversation-card {
    position: relative;
    display: flex;
    gap: $spacing-sm;
    width: 100%;
    padding: $spacing-sm $spacing-md;
    border: none;
    border-radius: $border-radius-lg;
    background: transparent;
    text-align: left;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .conversation-card:hover,
  .conversation-card.is-active {
    background: $background-light;
  }

  .conversation-avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 40px;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: $primary-color;
    color: $white;
    font-weight: 700;
  }

  .conversation-body {
    display: flex;
    flex: 1;
    min-width: 0;
    flex-direction: column;
    gap: 2px;
  }

  .conversation-top {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: $spacing-sm;
  }

  .conversation-hotel {
    overflow: hidden;
    color: $text-primary;
    font-size: $font-size-sm;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .conversation-time {
    flex-shrink: 0;
    color: $text-secondary;
    font-size: $font-size-xs;
  }

  .conversation-booking {
    color: $primary-color-light;
    font-size: $font-size-xs;
  }

  .conversation-preview {
    overflow: hidden;
    color: $text-secondary;
    font-size: $font-size-xs;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .conversation-badge {
    position: absolute;
    top: $spacing-sm;
    right: $spacing-sm;
  }

  .inbox-loading,
  .thread-loading {
    padding: $spacing-lg;
    color: $text-secondary;
    text-align: center;
  }

  .messages-thread {
    display: flex;
    flex-direction: column;
    min-height: 60vh;
  }

  .thread-header {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    padding: $spacing-md $spacing-lg;
    border-bottom: 1px solid #eef1f6;
  }

  .thread-heading h2 {
    margin: 0;
    font-size: $font-size-base;
  }

  .thread-booking {
    margin: 2px 0 0;
    color: $primary-color-light;
    font-size: $font-size-xs;
  }

  .thread-back {
    display: none;
    border: none;
    background: transparent;
    color: $primary-color;
    font-size: 20px;
    cursor: pointer;
  }

  .thread-messages {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: $spacing-sm;
    padding: $spacing-lg;
    overflow-y: auto;
    max-height: 52vh;
    background: #fbfcfe;
  }

  .thread-load-more {
    align-self: center;
    padding: $spacing-xs $spacing-md;
    border: 1px solid $border-color;
    border-radius: 999px;
    background: $white;
    color: $primary-color;
    font-size: $font-size-xs;
    cursor: pointer;
  }

  .thread-empty {
    margin: auto;
    color: $text-secondary;
    text-align: center;
  }

  .message-row {
    display: flex;
  }

  .message-row.is-guest {
    justify-content: flex-end;
  }

  .message-row.is-system {
    justify-content: center;
  }

  .bubble {
    max-width: 75%;
    padding: $spacing-sm $spacing-md;
    border-radius: $border-radius-lg;
    background: $white;
    border: 1px solid #e7ecf3;
  }

  .is-guest .bubble {
    background: $primary-color;
    border-color: $primary-color;
    color: $white;
  }

  .bubble.is-flagged {
    border-color: #f0b429;
  }

  .bubble-flag {
    display: inline-block;
    margin-top: 4px;
    font-size: 11px;
    font-weight: 600;
    color: #8a5a00;
  }

  .bubble-body {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .bubble-time {
    display: block;
    margin-top: 4px;
    opacity: 0.7;
    font-size: 11px;
  }

  .system-message {
    margin: 0;
    padding: 4px $spacing-md;
    border-radius: 999px;
    background: #eef1f6;
    color: $text-secondary;
    font-size: $font-size-xs;
  }

  .typing-indicator {
    margin: 0;
    color: $text-secondary;
    font-size: $font-size-xs;
  }

  .composer {
    display: flex;
    gap: $spacing-sm;
    padding: $spacing-md $spacing-lg;
    border-top: 1px solid #eef1f6;
    background: $white;
  }

  .composer-input {
    flex: 1;
    min-height: 40px;
    max-height: 120px;
    padding: $spacing-sm $spacing-md;
    border: 1px solid $border-color;
    border-radius: $border-radius-lg;
    font-family: inherit;
    font-size: $font-size-sm;
    resize: none;
  }

  .composer-input:focus {
    outline: 2px solid rgba(0, 113, 194, 0.25);
    border-color: $primary-color-light;
  }

  .composer .guest-button {
    width: auto;
    align-self: flex-end;
    padding: $spacing-sm $spacing-lg;
  }

  .composer-error,
  .thread-closed {
    margin: 0;
    padding: $spacing-sm $spacing-lg;
    color: $error-color;
    font-size: $font-size-xs;
  }

  .thread-placeholder {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
  }

  @media (max-width: $bp-md) {
    .messages-shell {
      grid-template-columns: 1fr;
    }

    .messages-inbox.is-hidden,
    .messages-thread.is-hidden {
      display: none;
    }

    .thread-back {
      display: inline-flex;
    }

    .thread-messages {
      max-height: 60vh;
    }
  }
</style>
