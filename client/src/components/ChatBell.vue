<script>
  import { ChatDotRound } from '@element-plus/icons-vue'
  import { mapGetters } from 'vuex'
  import { MessagingService } from '@/services/messaging.service'
  import { getUserSocket } from '@/services/userSocket'

  /**
   * Header entry point for guest <-> hotel messaging with an unread badge.
   * Shares the single `/user` socket connection with the notification bell.
   */
  export default {
    name: 'ChatBell',
    components: { ChatDotRound },
    data() {
      return { unread: 0, socket: null }
    },
    computed: {
      ...mapGetters('auth', ['isUserAuthenticated']),
      bellLabel() {
        return this.unread > 0
          ? this.$t('messages.bellUnread', { count: this.unread })
          : this.$t('messages.title')
      }
    },
    async mounted() {
      if (!this.isUserAuthenticated) return

      await this.refresh()
      await this.connectSocket()
    },
    beforeUnmount() {
      if (this.socket) {
        this.socket.off('chat:activity', this.onActivity)
        this.socket.off('chat:read', this.onRead)
      }
    },
    methods: {
      async refresh() {
        try {
          const response = await MessagingService.getUnreadCount()
          this.unread = Number(response?.data?.unread || 0)
        } catch (error) {
          this.unread = 0
        }
      },
      async connectSocket() {
        try {
          this.socket = await getUserSocket()
          this.socket.on('chat:activity', this.onActivity)
          this.socket.on('chat:read', this.onRead)
        } catch (error) {
          this.socket = null
        }
      },
      onActivity() {
        this.refresh()
      },
      onRead() {
        this.refresh()
      }
    }
  }
</script>

<template>
  <li>
    <RouterLink to="/messages" class="guest-chat-trigger" :aria-label="bellLabel">
      <ElBadge :value="unread" :max="99" :hidden="unread === 0">
        <ElIcon :size="20"><ChatDotRound /></ElIcon>
      </ElBadge>
    </RouterLink>
    <span class="guest-chat-sr" role="status" aria-live="polite">
      {{ unread > 0 ? $t('messages.bellUnread', { count: unread }) : '' }}
    </span>
  </li>
</template>

<style scoped>
  .guest-chat-trigger {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 44px;
    min-height: 44px;
    color: var(--tn-muted);
    border-radius: 10px;
  }

  .guest-chat-trigger:hover {
    color: var(--tn-ink);
  }

  .guest-chat-sr {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
</style>
