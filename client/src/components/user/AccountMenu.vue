<script>
import {
  ArrowDown,
  ChatDotRound,
  Document,
  House,
  Star,
  SwitchButton,
} from '@element-plus/icons-vue'
import { mapActions, mapGetters } from 'vuex'
import { getImageUrl } from '@/utils/images'

const menuItems = [
  {
    labelKey: 'account.menu.manageAccount',
    route: '/account-settings',
    icon: House,
  },
  {
    labelKey: 'account.menu.bookings',
    route: '/bookings',
    icon: Document,
  },
  {
    labelKey: 'account.menu.reviews',
    route: '/reviews',
    icon: ChatDotRound,
  },
  {
    labelKey: 'account.menu.saved',
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
      return user.full_name || user.username || this.$t('account.menu.userNameFallback')
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
    <button type="button" class="account-trigger" :aria-label="$t('account.menu.manageAccount')">
      <span class="avatar-frame">
        <img v-if="displayAvatar" :src="displayAvatar" alt="User avatar" />
        <img v-else src="../../assets/avatar/default_avatar.png" alt="Default avatar" />
      </span>

      <span class="identity">
        <span class="name">{{ displayName }}</span>

      </span>

      <el-icon class="trigger-icon"><ArrowDown /></el-icon>
    </button>

    <template #dropdown>
      <el-dropdown-menu class="account-dropdown">
        <el-dropdown-item
          v-for="item in menuItems"
          :key="item.labelKey"
          :command="item.route"
          :disabled="item.disabled"
        >
          <div class="menu-item">
            <el-icon class="menu-icon"><component :is="item.icon" /></el-icon>
            <span>{{ $t(item.labelKey) }}</span>
          </div>
        </el-dropdown-item>

        <el-dropdown-item divided command="logout">
          <div class="menu-item">
            <el-icon class="menu-icon"><SwitchButton /></el-icon>
            <span>{{ $t('account.menu.signOut') }}</span>
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
  max-width: 170px;
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
  color: var(--tn-ink);
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
  color: var(--tn-ink);
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

<style scoped>
@media (max-width:767px) { .identity,.trigger-icon { display:none; } .account-trigger { width:36px; } }
</style>
