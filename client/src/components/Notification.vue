<template>
  <ElPopover
    :visible="isNotificationPopupVisible"
    placement="bottom"
    :width="350"
    trigger="click"
    popper-class="notification-popover"
  >
    <template #reference>
      <li style="position: relative; cursor: pointer">
        <ElBadge :value="numberOfNewNotifications" :hidden="numberOfNewNotifications === 0">
          <ElIcon :size="20">
            <Bell />
          </ElIcon>
        </ElBadge>
      </li>
    </template>

    <template #default>
      <div class="notification-container">
        <!-- Notification Header -->
        <div class="notification-header">
          <div class="notification-title">
            <span>Notifications</span>
          </div>
          <div v-if="numberOfNewNotifications > 0" class="mark-all-read-btn" @click="markAllRead()">
            <span>Mark all as read</span>
          </div>
        </div>

        <!-- Notification Content -->
        <div class="notification-content">
          <!-- Loading state -->
          <div v-if="isLoading" class="notification-loading">
            <ElIcon class="is-loading" :size="30">
              <Loading />
            </ElIcon>
          </div>

          <!-- Empty state -->
          <ElEmpty
            v-else-if="notifications.length === 0"
            description="You have no notifications"
            :image-size="80"
          />

          <!-- Notification items -->
          <div
            v-for="notification in notifications"
            v-else
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
                <ElBadge is-dot :hidden="notification.is_read === true" class="notification-dot">
                  <span>{{ notification.message }}</span>
                </ElBadge>
              </div>
              <p class="notification-time">{{ formatNotificationTime(notification.created_at) }}</p>
            </div>
          </div>
        </div>

        <!-- Notification Footer -->
        <div v-if="notifications.length > 0" class="notification-footer">
          <ElButton text type="primary" @click="handleSeeAll">See all</ElButton>
        </div>
      </div>
    </template>
  </ElPopover>
</template>

<script>
  import { mapGetters } from 'vuex';
  import socketService from '@/services/socket';
  import NotificationService from '@/services/notification.service';
  import { useToast } from 'vue-toastification';
  import { Bell, Loading } from '@element-plus/icons-vue';
  import { formatDistanceToNow } from 'date-fns';

  export default {
    name: 'NotificationComponent',
    components: {
      Bell,
      Loading,
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
        isLoading: false,
      };
    },
    computed: {
      ...mapGetters('auth', ['isUserAuthenticated', 'getUserId']),
    },
    watch: {
      isUserAuthenticated: {
        handler(isAuthenticated) {
          if (isAuthenticated) {
            this.setupNotificationListeners();
            this.fetchNotifications();
            this.fetchUnreadCount();
          } else {
            this.cleanup();
          }
        },
        immediate: true,
      },
      notifications: {
        handler() {
          this.calculateNumberOfNewNotifications();
        },
        deep: true,
      },
    },
    mounted() {
      if (this.isUserAuthenticated) {
        this.setupNotificationListeners();
        this.fetchNotifications();
        this.fetchUnreadCount();
      }
    },
    methods: {
      setupNotificationListeners() {
        if (!socketService.isConnected('/user')) {
          console.warn('Socket not connected yet. Listeners will be set up when socket connects.');
          return;
        }

        socketService.onNotification(this.handleNewNotification);

        socketService.onBookingUpdate((data) => {
          console.log('Booking update received:', data);
        });

        console.log('Notification listeners set up in Notification.vue');
      },

      handleNewNotification(notification) {
        console.log('New notification received:', notification);
        
        this.notifications.unshift(notification);
        this.calculateNumberOfNewNotifications();
        
        this.isNotificationPopupVisible = true;
        
        setTimeout(() => {
          this.isNotificationPopupVisible = false;
        }, 5000);

        this.toast.info(notification.message || 'You have a new notification');
      },

      async fetchNotifications() {
        try {
          this.isLoading = true;
          const response = await NotificationService.getNotifications({
            page: 1,
            limit: 20,
          });

          this.notifications = response.data || [];
        } catch (error) {
          console.error('Error fetching notifications:', error);
          this.toast.error('Failed to load notifications');
        } finally {
          this.isLoading = false;
        }
      },

      async fetchUnreadCount() {
        try {
          const response = await NotificationService.getUnreadCount();
          this.numberOfNewNotifications = response.data?.unreadCount || 0;
        } catch (error) {
          console.error('Error fetching unread count:', error);
        }
      },

      calculateNumberOfNewNotifications() {
        this.numberOfNewNotifications = this.notifications.filter(
          (notification) => notification.is_read === false || notification.is_read === 0
        ).length;
      },

      async markAllRead() {
        try {
          this.notifications.forEach((notification) => {
            notification.is_read = true;
          });
          this.numberOfNewNotifications = 0;

          await NotificationService.markAllAsRead();

          this.toast.success('All notifications marked as read');
        } catch (error) {
          this.toast.error('Error marking notifications as read');
          console.error(error);
          await this.fetchNotifications();
        }
      },

      async viewDetails(notification) {
        if (notification.is_read === false || notification.is_read === 0) {
          try {
            notification.is_read = true;
            this.calculateNumberOfNewNotifications();

            await NotificationService.markAsRead(notification.id);
          } catch (error) {
            console.error('Error marking notification as read:', error);
          }
        }

        this.isNotificationPopupVisible = false;

        console.log('View notification details:', notification);
      },

      handleSeeAll() {
        this.isNotificationPopupVisible = false;
        console.log('Navigate to all notifications');
      },

      formatNotificationTime(timestamp) {
        if (!timestamp) return 'Just now';
        try {
          return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
        } catch (error) {
          return 'Just now';
        }
      },

      cleanup() {
        socketService.offNotification(this.handleNewNotification);
        socketService.offBookingUpdate();
        this.notifications = [];
        this.numberOfNewNotifications = 0;
      },
    },
    beforeUnmount() {
      this.cleanup();
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

  .notification-loading {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 120px;
    color: #409eff;
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
