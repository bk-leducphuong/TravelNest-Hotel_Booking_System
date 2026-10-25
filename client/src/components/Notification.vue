<template>
  <ElPopover
    v-model:visible="isNotificationPopupVisible"
    placement="bottom"
    :width="350"
    trigger="click"
    popper-class="notification-popover"
  >
    <template #reference>
      <li style="position: relative">
        <button
          type="button"
          class="guest-notification-trigger"
          :aria-label="$t('misc.notifications.title')"
        >
          <ElBadge :value="numberOfNewNotifications" :hidden="numberOfNewNotifications === 0">
            <ElIcon :size="20"><Bell /></ElIcon>
          </ElBadge>
        </button>
      </li>
    </template>

    <template #default>
      <div class="notification-container">
        <!-- Notification Header -->
        <div class="notification-header">
          <div class="notification-title">
            <span>{{ $t('misc.notifications.title') }}</span>
          </div>
          <div v-if="numberOfNewNotifications > 0" class="mark-all-read-btn" @click="markAllRead()">
            <span>{{ $t('misc.notifications.markAllRead') }}</span>
          </div>
        </div>

        <!-- Notification Content -->
        <div class="notification-content">
          <!-- Empty state -->
          <ElEmpty
            v-if="notifications.length === 0"
            :description="$t('misc.notifications.empty')"
            :image-size="80"
          />

          <!-- Notification items -->
          <div
            v-for="notification in notifications"
            :key="notification.id"
            class="notification-item"
            @click="viewDetails(notification)"
          >
            <div class="notification-icon">
              <ElIcon :size="20" color="#409eff">
                <Bell />
              </ElIcon>
            </div>
            <div class="notification-text">
              <div class="notification-message">
                <ElBadge is-dot :hidden="notification.is_read" class="notification-dot">
                  <span>{{ notification.message }}</span>
                </ElBadge>
              </div>
              <p class="notification-time">{{ formatTime(notification.created_at) }}</p>
            </div>
          </div>
        </div>

      </div>
    </template>
  </ElPopover>
</template>

<script>
  import { mapGetters } from 'vuex';
  import { getUserSocket } from '@/services/userSocket';
  import { NotificationService } from '@/services/notification.service';
  import { useToast } from 'vue-toastification';
  import { Bell } from '@element-plus/icons-vue';

  export default {
    components: {
      Bell,
    },
    setup() {
      const toast = useToast();
      return {
        toast,
      };
    },
    data() {
      return {
        isNotificationPopupVisible: false,
        notifications: [],
        numberOfNewNotifications: 0,
        userSocket: null,
      };
    },
    computed: {
      ...mapGetters('auth', ['isUserAuthenticated', 'getUserId']),
    },
    watch: {
      notifications: {
        handler(newValue) {
          this.calculateNumerOfNewNotifications();
        },
        deep: true,
      },
    },
    async mounted() {
      if (this.isUserAuthenticated) {
        await this.getNotifiactions();
        await this.connectNotificationSocket();
      }
    },
    methods: {
      async connectNotificationSocket() {
        if (!this.isUserAuthenticated) {
          console.log('[Notification] user not authenticated, skip /user socket connection');
          return;
        }

        this.userSocket = await getUserSocket();
        this.userSocket.on('notification:new', this.handleNotificationReceived);
        this.userSocket.on('notifications:unreadCountUpdate', this.handleUnreadCountUpdate);
      },
      handleNotificationReceived(data) {
        this.notifications.unshift(data);
        this.calculateNumerOfNewNotifications();
        this.isNotificationPopupVisible = true;

        setTimeout(() => {
          this.isNotificationPopupVisible = false;
        }, 5000);
      },
      handleUnreadCountUpdate(payload) {
        if (typeof payload?.count === 'number') {
          this.numberOfNewNotifications = payload.count;
        }
      },
      async getNotifiactions() {
        try {
          const response = await NotificationService.getNotifications();
          this.notifications = response.data || [];
        } catch (error) {
          console.error('Error fetching notifications:', error);
        }
      },
      calculateNumerOfNewNotifications() {
        this.numberOfNewNotifications = 0;
        this.notifications.forEach((notification) => {
          if (!notification.is_read) {
            this.numberOfNewNotifications++;
          }
        });
      },
      async markAllRead() {
        try {
          this.notifications.forEach((notification) => {
            notification.is_read = true;
          });
          this.numberOfNewNotifications = 0;

          await NotificationService.markAllAsRead();
          
          this.toast.success(this.$t('misc.notifications.allMarkedRead'));
        } catch (error) {
          this.toast.error(this.$t('misc.notifications.markReadError'));
          console.error(error);
        }
      },
      formatTime(value) {
        if (!value) return '';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';

        const diffMs = Date.now() - date.getTime();
        const minutes = Math.round(diffMs / 60000);
        if (minutes < 1) return this.$t('misc.notifications.justNow');
        if (minutes < 60) return this.$t('misc.notifications.minutesAgo', { count: minutes });
        const hours = Math.round(minutes / 60);
        if (hours < 24) {
          return this.$t(
            hours === 1 ? 'misc.notifications.hourAgo' : 'misc.notifications.hoursAgo',
            { count: hours }
          );
        }
        const days = Math.round(hours / 24);
        if (days < 30) {
          return this.$t(
            days === 1 ? 'misc.notifications.dayAgo' : 'misc.notifications.daysAgo',
            { count: days }
          );
        }
        return date.toLocaleDateString();
      },
      async viewDetails(notification) {
        // Mark notification as read when clicked (persist to the backend).
        if (!notification.is_read) {
          notification.is_read = true;
          this.calculateNumerOfNewNotifications();

          try {
            await NotificationService.markAsRead(notification.id);
          } catch (error) {
            // Non-fatal: keep the optimistic local state.
            console.error('Failed to mark notification as read:', error);
          }
        }

        // Close popover
        this.isNotificationPopupVisible = false;
      },
    },
    beforeUnmount() {
      if (this.userSocket) {
        this.userSocket.off('notification:new', this.handleNotificationReceived);
        this.userSocket.off('notifications:unreadCountUpdate', this.handleUnreadCountUpdate);
      }
    },
  };
</script>

<style lang="scss" scoped>
  @import '@/assets/styles/index.scss';

  // Notification container
  .notification-container {
    display: flex;
    flex-direction: column;
    max-height: 450px;
  }

  // Notification header
  .notification-header {
    @include flex-between;
    padding: $spacing-md $spacing-sm;
    border-bottom: 1px solid #f0f0f0;
    margin-bottom: $spacing-sm;
  }

  .notification-title {
    font-size: 17px;
    font-weight: 600;
    color: $text-primary;

    span {
      font-weight: 600;
    }
  }

  .mark-all-read-btn {
    color: #409eff;
    font-size: 14px;
    cursor: pointer;
    transition: opacity 0.3s;

    &:hover {
      opacity: 0.8;
    }

    span {
      font-size: 14px;
    }
  }

  // Notification content
  .notification-content {
    max-height: 320px;
    overflow-y: auto;
    padding: 0 $spacing-xs;

    // Custom scrollbar
    &::-webkit-scrollbar {
      width: 6px;
    }

    &::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 3px;
    }

    &::-webkit-scrollbar-thumb {
      background: #c1c1c1;
      border-radius: 3px;

      &:hover {
        background: #a8a8a8;
      }
    }
  }

  .notification-item {
    display: flex;
    align-items: flex-start;
    padding: $spacing-md $spacing-sm;
    cursor: pointer;
    border-radius: $border-radius-sm;
    transition: background-color 0.3s;

    &:hover {
      background-color: #f5f7fa;
    }
  }

  .notification-icon {
    margin-right: $spacing-md;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .notification-text {
    flex: 1;
    min-width: 0;

    .notification-message {
      margin-bottom: 4px;

      span {
        font-size: $font-size-sm;
        font-weight: 500;
        color: $text-primary;
        line-height: 1.4;
        word-wrap: break-word;
      }
    }

    .notification-time {
      margin: 0;
      font-size: $font-size-xs;
      color: $text-secondary;
    }
  }

  .notification-dot {
    :deep(.el-badge__content.is-dot) {
      right: -5px;
      top: 5px;
    }
  }

  // Notification footer
  .notification-footer {
    padding: $spacing-sm;
    text-align: center;
    border-top: 1px solid #f0f0f0;
    margin-top: $spacing-xs;
  }
</style>

<style lang="scss">
  // Global styles for popover (not scoped)
  @import '@/assets/styles/index.scss';

  .notification-popover {
    padding: 0 !important;
    
    .el-popover__title {
      display: none;
    }
  }
</style>

<style scoped>
  .guest-notification-trigger {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 44px;
    min-height: 44px;
    background: transparent;
    color: var(--tn-muted);
    border: 0;
    border-radius: 10px;
    cursor: pointer;
  }
</style>
