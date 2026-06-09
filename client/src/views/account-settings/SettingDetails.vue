<script>
import { mapActions } from 'vuex'
import TheHeader from '@/components/Header.vue'
import EmailSettings from '@/components/user/account-settings/EmailSettings.vue'
import GeneralSettings from '@/components/user/account-settings/GeneralSettings.vue'
import PaymentSettings from '@/components/user/account-settings/PaymentSettings.vue'
import PersonalInformation from '@/components/user/account-settings/PersonalInformation.vue'
import PrivacySettings from '@/components/user/account-settings/PrivacySettings.vue'
import SecuritySettings from '@/components/user/account-settings/SecuritySettings.vue'
import {
  accountSettingsSections,
  defaultAccountSettingsSection,
} from '@/views/account-settings/sections'

const sectionComponents = {
  EmailSettings,
  GeneralSettings,
  PaymentSettings,
  PersonalInformation,
  PrivacySettings,
  SecuritySettings,
}

export default {
  components: {
    TheHeader,
  },
  computed: {
    sections() {
      return accountSettingsSections
    },
    activeSection() {
      return (
        this.sections.find((section) => section.slug === this.$route.params.details) ||
        defaultAccountSettingsSection
      )
    },
    currentComponent() {
      return sectionComponents[this.activeSection.component] || PersonalInformation
    },
  },
  methods: {
    ...mapActions('user', ['retrieveUserInformation']),
    openSection(slug) {
      if (slug !== this.$route.params.details) {
        this.$router.push(`/account-settings/${slug}`)
      }
    },
  },
  async mounted() {
    await this.retrieveUserInformation()
  },
}
</script>

<template>
  <TheHeader :isSearchOpen="false" />
  <main class="settings-page">
    <aside class="settings-sidebar">
      <button type="button" class="back-link" @click="$router.push('/account-settings')">
        Back to overview
      </button>

      <nav class="settings-nav" aria-label="Account settings sections">
        <button
          v-for="section in sections"
          :key="section.slug"
          type="button"
          class="settings-nav-item"
          :class="{ active: activeSection.slug === section.slug }"
          @click="openSection(section.slug)"
        >
          <span class="settings-nav-copy">
            <span class="settings-nav-title">{{ section.title }}</span>
            <span class="settings-nav-summary">{{ section.summary }}</span>
          </span>
          <span class="settings-nav-status" :class="{ muted: !section.available }">
            {{ section.available ? 'Live' : 'Soon' }}
          </span>
        </button>
      </nav>
    </aside>

    <section class="settings-content">
      <component :is="currentComponent" :section="activeSection" />
    </section>
  </main>
</template>

<style scoped>
.settings-page {
  max-width: 1180px;
  margin: 0 auto;
  padding: 32px 24px 56px;
  display: grid;
  grid-template-columns: minmax(260px, 320px) minmax(0, 1fr);
  gap: 24px;
}

.settings-sidebar {
  align-self: start;
}

.back-link {
  margin-bottom: 16px;
  padding: 0;
  border: none;
  background: transparent;
  color: #2563eb;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.settings-nav {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.settings-nav-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
  padding: 16px;
  border: 1px solid #dbe3f0;
  border-radius: 8px;
  background: #fff;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.settings-nav-item:hover,
.settings-nav-item.active {
  border-color: #2563eb;
  box-shadow: 0 8px 22px rgba(37, 99, 235, 0.08);
}

.settings-nav-copy {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.settings-nav-title {
  color: #0f172a;
  font-size: 15px;
  font-weight: 600;
}

.settings-nav-summary {
  color: #64748b;
  font-size: 13px;
  line-height: 1.45;
}

.settings-nav-status {
  flex-shrink: 0;
  padding: 4px 8px;
  border-radius: 999px;
  background: #dbeafe;
  color: #1d4ed8;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}

.settings-nav-status.muted {
  background: #e2e8f0;
  color: #475569;
}

.settings-content {
  min-width: 0;
}

@media (max-width: 900px) {
  .settings-page {
    grid-template-columns: 1fr;
    padding: 24px 16px 40px;
  }
}
</style>
