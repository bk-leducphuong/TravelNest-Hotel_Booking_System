<script>
import {
  ArrowDown,
  ChatDotRound,
  CreditCard,
  Document,
  House,
  Star,
  SwitchButton,
} from '@element-plus/icons-vue'
import { mapActions, mapGetters } from 'vuex'
import { getImageUrl } from '@/utils/images'

const menuItems = [
  {
    label: 'Manage account',
    route: '/account-settings',
    icon: House,
  },
  {
    label: 'Bookings & Trips',
    route: '/bookings',
    icon: Document,
  },
  {
    label: 'Genius loyalty programme',
    disabled: true,
    icon: Star,
  },
  {
    label: 'Rewards & Wallet',
    disabled: true,
    icon: CreditCard,
  },
  {
    label: 'Reviews',
    route: '/reviews',
    icon: ChatDotRound,
  },
  {
    label: 'Saved',
    route: '/saved-hotels',
    icon: Star,
  },
]

export default {
  components: {
    ArrowDown,
    SwitchButton,
  },
  data() {
    return {
      menuItems,
    }
  },
  computed: {
    ...mapGetters('user', ['getUserInformation']),
    displayName() {
      const user = this.getUserInformation || {}
      return user.full_name || user.username || 'User Name'
    },
    displayAvatar() {
      return getImageUrl(this.getUserInformation?.profile_picture_url)
    },
  },
  methods: {
    ...mapActions('auth', ['logout']),
    ...mapActions('user', ['retrieveUserInformation']),
    async handleCommand(command) {
      if (command === 'logout') {
        await this.logout({ haveRedirect: true })
        return
      }

      if (command) {
        await this.$router.push(command)
      }
    },
  },
  async mounted() {
    if (!this.getUserInformation) {
      await this.retrieveUserInformation()
    }
  },
}
</script>

<template>
  <el-dropdown trigger="click" @command="handleCommand">
    <button type="button" class="account-trigger">
      <span class="avatar-frame">
        <img v-if="displayAvatar" :src="displayAvatar" alt="User avatar" />
        <img v-else src="../../assets/avatar/default_avatar.png" alt="Default avatar" />
      </span>

      <span class="identity">
        <span class="name">{{ displayName }}</span>
        <span class="tier">Genius Level ?</span>
      </span>

      <el-icon class="trigger-icon"><ArrowDown /></el-icon>
    </button>

    <template #dropdown>
      <el-dropdown-menu class="account-dropdown">
        <el-dropdown-item
          v-for="item in menuItems"
          :key="item.label"
          :command="item.route"
          :disabled="item.disabled"
        >
          <div class="menu-item">
            <el-icon class="menu-icon"><component :is="item.icon" /></el-icon>
            <span>{{ item.label }}</span>
          </div>
        </el-dropdown-item>

        <el-dropdown-item divided command="logout">
          <div class="menu-item">
            <el-icon class="menu-icon"><SwitchButton /></el-icon>
            <span>Sign out</span>
          </div>
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<style scoped>
.account-trigger {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: 170px;
  min-height: 36px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
}

.avatar-frame {
  width: 35px;
  height: 35px;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 999px;
}

.avatar-frame img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.identity {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  align-items: flex-start;
}

.name {
  max-width: 105px;
  overflow: hidden;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tier {
  color: #facc15;
  font-size: 10px;
  line-height: 1.2;
}

.trigger-icon {
  color: #fff;
  font-size: 12px;
}

:deep(.account-dropdown) {
  min-width: 220px;
}

.menu-item {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
}

.menu-icon {
  font-size: 16px;
}
</style>
