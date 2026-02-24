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
          <div class="mark-all-read-btn" @click="markAllRead()" v-if="numberOfNewNotifications > 0">
            <span>Mark all as read</span>
          </div>
        </div>

        <!-- Notification Content -->
        <div class="notification-content">
          <!-- Empty state -->
          <ElEmpty
            v-if="notifications.length === 0"
            description="You have no notifications"
            :image-size="80"
          />

          <!-- Notification items -->
          <div
            class="notification-item"
            v-for="notification in notifications"
            :key="notification.notificationId"
            @click="viewDetails(notification)"
          >
            <div class="notification-icon">
              <ElIcon :size="20" color="#409eff">
                <Bell />
              </ElIcon>
            </div>
            <div class="notification-text">
              <div class="notification-message">
                <ElBadge is-dot :hidden="notification.is_read === 1" class="notification-dot">
                  <span>{{ notification.message }}</span>
                </ElBadge>
              </div>
              <p class="notification-time">2 hrs ago</p>
            </div>
          </div>
        </div>

        <!-- Notification Footer -->
        <div class="notification-footer" v-if="notifications.length > 0">
          <ElButton text type="primary" @click="handleSeeAll">See all</ElButton>
        </div>
      </div>
    </template>
  </ElPopover>
</template>

<script>
  import axios from 'axios';
  import { mapGetters } from 'vuex';
  import socket from '@/services/socket';
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
    methods: {
      joinRoom() {
        if (this.isUserAuthenticated) {
          // Tham gia vào room của admin
          socket.emit('joinUserRoom', this.getUserId);
          // Nhận thông báo mới
          socket.on('newUserNotification', (data) => {
            this.notifications.unshift(data);
            this.calculateNumerOfNewNotifications();
            // Auto show popover when new notification arrives
            this.isNotificationPopupVisible = true;
            // Auto hide after 5 seconds
            setTimeout(() => {
              this.isNotificationPopupVisible = false;
            }, 5000);
          });
        } else {
          console.log('User not logged in');
        }
      },
      async getNotifiactions() {
        try {
          const response = await axios.get(`${import.meta.env.VITE_SERVER_HOST}/api/notifications`, {
            withCredentials: true,
          });
          this.notifications = response.data.notifications;
        } catch (error) {
          console.error('Error fetching notifications:', error);
        }
      },
      calculateNumerOfNewNotifications() {
        this.numberOfNewNotifications = 0;
        this.notifications.forEach((notification) => {
          if (notification.is_read == 0) {
            this.numberOfNewNotifications++;
          }
        });
      },
      async markAllRead() {
        try {
          this.notifications.forEach((notification) => {
            notification.is_read = 1;
          });
          this.numberOfNewNotifications = 0;

          await axios.get(
            `${import.meta.env.VITE_SERVER_HOST}/api/notifications/mark-all-as-read`,
            {
              withCredentials: true,
            }
          );
          
          this.toast.success('All notifications marked as read');
        } catch (error) {
          this.toast.error('Error marking notifications as read');
          console.error(error);
        }
      },
      viewDetails(notification) {
        // Mark notification as read when clicked
        if (notification.is_read === 0) {
          notification.is_read = 1;
          this.calculateNumerOfNewNotifications();
          // You can add API call here to update backend
        }
        
        // Close popover
        this.isNotificationPopupVisible = false;
        
        // Add navigation or detailed view logic here if needed
        console.log('View notification details:', notification);
      },
      handleSeeAll() {
        this.isNotificationPopupVisible = false;
        // Add navigation to notifications page if exists
        // this.$router.push('/notifications');
        console.log('Navigate to all notifications');
      },
    },
    async mounted() {
      if (this.isUserAuthenticated) {
        await this.getNotifiactions();
        this.joinRoom();
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
