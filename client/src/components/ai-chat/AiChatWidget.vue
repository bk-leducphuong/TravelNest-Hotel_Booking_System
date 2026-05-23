<script>
import { ChatDotRound, Close, Position, RefreshLeft } from '@element-plus/icons-vue'

const initialMessages = [
  {
    id: 1,
    role: 'assistant',
    text: 'Hi, I am your TravelNest assistant. I can help with stays, bookings, amenities, and travel planning.',
    createdAt: new Date()
  }
]

const suggestionPrompts = [
  'Find a hotel near the beach',
  'Help me choose room options',
  'What should I check before booking?'
]

export default {
  name: 'AiChatWidget',
  components: {
    ChatDotRound,
    Close,
    Position,
    RefreshLeft
  },
  data() {
    return {
      isOpen: false,
      hasUnread: false,
      input: '',
      isTyping: false,
      errorMessage: '',
      hasInteracted: false,
      messages: [...initialMessages],
      suggestions: suggestionPrompts,
      replyTimer: null
    }
  },
  computed: {
    canSend() {
      return this.input.trim().length > 0 && !this.isTyping
    }
  },
  watch: {
    isOpen(value) {
      if (value) {
        this.hasUnread = false
        this.$nextTick(() => {
          this.resizeTextarea()
          this.scrollToLatest()
          this.$refs.messageInput?.focus()
        })
      }
    },
    messages() {
      this.$nextTick(this.scrollToLatest)
    },
    input() {
      this.$nextTick(this.resizeTextarea)
    }
  },
  beforeUnmount() {
    window.clearTimeout(this.replyTimer)
  },
  methods: {
    togglePanel() {
      this.isOpen = !this.isOpen
    },
    closePanel() {
      this.isOpen = false
    },
    dismissError() {
      this.errorMessage = ''
    },
    handleKeydown(event) {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        this.sendMessage()
      }
    },
    sendSuggestion(prompt) {
      this.input = prompt
      this.sendMessage()
    },
    sendMessage() {
      const text = this.input.trim()

      if (!text || this.isTyping) {
        return
      }

      this.errorMessage = ''
      this.hasInteracted = true
      this.messages.push({
        id: Date.now(),
        role: 'user',
        text,
        createdAt: new Date()
      })
      this.input = ''
      this.isTyping = true

      this.replyTimer = window.setTimeout(() => {
        try {
          this.messages.push({
            id: Date.now() + 1,
            role: 'assistant',
            text: this.buildAssistantReply(text),
            createdAt: new Date()
          })

          if (!this.isOpen) {
            this.hasUnread = true
          }
        } catch (error) {
          this.errorMessage = 'The assistant could not reply right now. Please try again.'
        } finally {
          this.isTyping = false
        }
      }, 900)
    },
    buildAssistantReply(text) {
      const normalizedText = text.toLowerCase()

      if (normalizedText.includes('beach')) {
        return 'For beach stays, compare distance to the shoreline, recent guest ratings, breakfast options, and flexible cancellation before booking.'
      }

      if (normalizedText.includes('room')) {
        return 'Room choice usually depends on guest count, bed type, included meals, cancellation policy, and whether taxes or fees are included in the final price.'
      }

      if (normalizedText.includes('booking') || normalizedText.includes('book')) {
        return 'Before booking, confirm dates, guest details, check-in rules, payment method, cancellation policy, and the hotel address.'
      }

      return 'I can help narrow down destinations, compare hotel options, explain booking details, or prepare questions to ask the property.'
    },
    resetSession() {
      window.clearTimeout(this.replyTimer)
      this.input = ''
      this.isTyping = false
      this.errorMessage = ''
      this.hasUnread = false
      this.hasInteracted = false
      this.messages = [...initialMessages]

      this.$nextTick(() => {
        this.resizeTextarea()
        this.scrollToLatest()
      })
    },
    resizeTextarea() {
      const textarea = this.$refs.messageInput

      if (!textarea) {
        return
      }

      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 132)}px`
    },
    scrollToLatest() {
      const messagesPanel = this.$refs.messagesPanel

      if (messagesPanel) {
        messagesPanel.scrollTop = messagesPanel.scrollHeight
      }
    }
  }
}
</script>

<template>
  <div class="ai-chat-widget" :class="{ 'ai-chat-widget--open': isOpen }">
    <Transition name="ai-chat-panel">
      <section v-if="isOpen" class="ai-chat-panel" aria-label="AI chat assistant">
        <header class="ai-chat-header">
          <div>
            <p class="ai-chat-kicker">TravelNest AI</p>
            <h2>Trip assistant</h2>
          </div>

          <div class="ai-chat-header-actions">
            <button type="button" class="ai-chat-icon-button" aria-label="Reset chat" @click="resetSession">
              <RefreshLeft />
            </button>
            <button type="button" class="ai-chat-icon-button" aria-label="Close chat" @click="closePanel">
              <Close />
            </button>
          </div>
        </header>

        <div ref="messagesPanel" class="ai-chat-messages">
          <div
            v-for="message in messages"
            :key="message.id"
            class="ai-chat-message-row"
            :class="`ai-chat-message-row--${message.role}`"
          >
            <div class="ai-chat-message">
              {{ message.text }}
            </div>
          </div>

          <div v-if="!hasInteracted" class="ai-chat-suggestions" aria-label="Suggested questions">
            <button
              v-for="suggestion in suggestions"
              :key="suggestion"
              type="button"
              class="ai-chat-suggestion"
              @click="sendSuggestion(suggestion)"
            >
              {{ suggestion }}
            </button>
          </div>

          <div v-if="isTyping" class="ai-chat-message-row ai-chat-message-row--assistant">
            <div class="ai-chat-message ai-chat-typing" aria-label="Assistant is typing">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>

        <div v-if="errorMessage" class="ai-chat-error" role="alert">
          <span>{{ errorMessage }}</span>
          <button type="button" @click="dismissError">Dismiss</button>
        </div>

        <form class="ai-chat-composer" @submit.prevent="sendMessage">
          <textarea
            ref="messageInput"
            v-model="input"
            rows="1"
            placeholder="Ask about your trip..."
            aria-label="Message"
            @keydown="handleKeydown"
          ></textarea>
          <button type="submit" class="ai-chat-send" :disabled="!canSend" aria-label="Send message">
            <Position />
          </button>
        </form>
      </section>
    </Transition>

    <button
      type="button"
      class="ai-chat-launcher"
      :aria-expanded="isOpen"
      aria-label="Open AI chat assistant"
      @click="togglePanel"
    >
      <ChatDotRound v-if="!isOpen" />
      <Close v-else />
      <span v-if="hasUnread && !isOpen" class="ai-chat-unread-dot" aria-label="Unread message"></span>
    </button>
  </div>
</template>

<style scoped lang="scss">
.ai-chat-widget {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 1200;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
}

.ai-chat-launcher {
  position: relative;
  display: inline-flex;
  width: 58px;
  height: 58px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 50%;
  color: #fff;
  background: #0f8fb8;
  box-shadow: 0 14px 32px rgba(15, 143, 184, 0.34);
  cursor: pointer;
  transition:
    transform 0.2s ease,
    background-color 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    background: #0b789b;
    box-shadow: 0 16px 36px rgba(15, 143, 184, 0.42);
    transform: translateY(-2px);
  }

  svg {
    width: 27px;
    height: 27px;
  }
}

.ai-chat-unread-dot {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 12px;
  height: 12px;
  border: 2px solid #fff;
  border-radius: 50%;
  background: #ff4d4f;
}

.ai-chat-panel {
  position: absolute;
  right: 0;
  bottom: 76px;
  display: flex;
  width: min(380px, calc(100vw - 32px));
  height: min(620px, calc(100vh - 124px));
  overflow: hidden;
  flex-direction: column;
  border: 1px solid #dfe7ec;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 22px 60px rgba(15, 23, 42, 0.22);
}

.ai-chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
  color: #fff;
  background: #0f8fb8;

  h2,
  p {
    margin: 0;
  }

  h2 {
    font-size: 18px;
    font-weight: 700;
    line-height: 1.25;
  }
}

.ai-chat-kicker {
  margin-bottom: 3px;
  font-size: 12px;
  font-weight: 600;
  opacity: 0.82;
}

.ai-chat-header-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
}

.ai-chat-icon-button,
.ai-chat-send {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  cursor: pointer;
}

.ai-chat-icon-button {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  color: #fff;
  background: rgba(255, 255, 255, 0.16);
  transition: background-color 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.26);
  }

  svg {
    width: 18px;
    height: 18px;
  }
}

.ai-chat-messages {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  padding: 16px;
  background: #f6f8fa;
}

.ai-chat-message-row {
  display: flex;

  &--user {
    justify-content: flex-end;

    .ai-chat-message {
      color: #fff;
      background: #0f8fb8;
      border-bottom-right-radius: 3px;
    }
  }

  &--assistant {
    justify-content: flex-start;

    .ai-chat-message {
      color: #263238;
      background: #fff;
      border: 1px solid #e3eaee;
      border-bottom-left-radius: 3px;
    }
  }
}

.ai-chat-message {
  max-width: 86%;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.ai-chat-suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 4px;
}

.ai-chat-suggestion {
  border: 1px solid #cfe1e8;
  border-radius: 999px;
  padding: 8px 11px;
  color: #0f5f78;
  background: #fff;
  font-size: 13px;
  line-height: 1.2;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease;

  &:hover {
    border-color: #0f8fb8;
    background: #edf8fb;
  }
}

.ai-chat-typing {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-width: 54px;

  span {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #7b8a92;
    animation: ai-chat-bounce 1s infinite ease-in-out;

    &:nth-child(2) {
      animation-delay: 0.14s;
    }

    &:nth-child(3) {
      animation-delay: 0.28s;
    }
  }
}

.ai-chat-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-top: 1px solid #f5c2c7;
  padding: 10px 14px;
  color: #842029;
  background: #f8d7da;
  font-size: 13px;

  button {
    border: 0;
    color: #842029;
    background: transparent;
    font-weight: 700;
    cursor: pointer;
  }
}

.ai-chat-composer {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  border-top: 1px solid #e2e8ee;
  padding: 12px;
  background: #fff;

  textarea {
    width: 100%;
    max-height: 132px;
    min-height: 42px;
    resize: none;
    border: 1px solid #d8e2e8;
    border-radius: 8px;
    padding: 10px 12px;
    color: #1f2933;
    font: inherit;
    line-height: 1.35;
    outline: none;

    &:focus {
      border-color: #0f8fb8;
      box-shadow: 0 0 0 3px rgba(15, 143, 184, 0.14);
    }
  }
}

.ai-chat-send {
  flex: 0 0 auto;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  color: #fff;
  background: #0f8fb8;
  transition:
    opacity 0.2s ease,
    transform 0.2s ease,
    background-color 0.2s ease;

  &:hover:not(:disabled) {
    background: #0b789b;
    transform: translateY(-1px);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.48;
  }

  svg {
    width: 19px;
    height: 19px;
  }
}

.ai-chat-panel-enter-active,
.ai-chat-panel-leave-active {
  transition:
    opacity 0.22s ease,
    transform 0.22s ease;
}

.ai-chat-panel-enter-from,
.ai-chat-panel-leave-to {
  opacity: 0;
  transform: translateY(14px) scale(0.96);
}

@keyframes ai-chat-bounce {
  0%,
  80%,
  100% {
    transform: translateY(0);
    opacity: 0.45;
  }

  40% {
    transform: translateY(-5px);
    opacity: 1;
  }
}

@media (max-width: 640px) {
  .ai-chat-widget {
    right: 16px;
    bottom: 16px;
  }

  .ai-chat-panel {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100dvh;
    border: 0;
    border-radius: 0;
  }

  .ai-chat-widget--open .ai-chat-launcher {
    display: none;
  }

  .ai-chat-message {
    max-width: 90%;
  }
}
</style>
