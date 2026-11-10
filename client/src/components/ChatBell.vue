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
      ...mapGetters('auth', ['isUserAuthenticated'])
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
    <RouterLink to="/messages" class="guest-chat-trigger" :aria-label="$t('messages.title')">
      <ElBadge :value="unread" :max="99" :hidden="unread === 0">
        <ElIcon :size="20"><ChatDotRound /></ElIcon>
      </ElBadge>
    </RouterLink>
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
</style>
