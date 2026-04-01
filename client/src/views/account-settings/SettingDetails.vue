<script>
import TheHeader from '@/components/Header.vue'
import EmailSettings from '@/components/user/account-settings/EmailSettings.vue'
import GeneralSettings from '@/components/user/account-settings/GeneralSettings.vue'
import PaymentSettings from '@/components/user/account-settings/PaymentSettings.vue'
import PersonalInformation from '@/components/user/account-settings/PersonalInformation.vue'
import PrivacySettings from '@/components/user/account-settings/PrivacySettings.vue'
import SecuritySettings from '@/components/user/account-settings/SecuritySettings.vue'

export default {
  components: {
    TheHeader,
    GeneralSettings,
    PersonalInformation,
    SecuritySettings,
    PaymentSettings,
    PrivacySettings,
    EmailSettings
  },
  data() {
    return {}
  },
  computed: {
    currentComponent() {
      const params = this.$route.params.details
      switch (params) {
        case 'personal-information':
          return PersonalInformation
        case 'general-settings':
          return GeneralSettings
        case 'security-settings':
          return SecuritySettings
        case 'payment-settings':
          return PaymentSettings
        case 'privacy-settings':
          return PrivacySettings
        case 'email-settings':
          return EmailSettings
        default:
          return PersonalInformation
      }
    }
  },
  mounted() {}
}
</script>
<template>
  <TheHeader :is-search-open="false" />
  <div class="account-settings">
    <!--Sidebar-->
    <div
      class="section1"
      style="
        width: 30%;
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        height: fit-content;
        padding: 0px;
      "
    >
      <div class="section">
        <div class="icon-container"><i class="fas fa-user"></i></div>
        <div class="content">
          <a class="manage-link">Personal details</a>
        </div>
      </div>
      <div class="section">
        <div class="icon-container"><i class="fas fa-lock"></i></div>
        <div class="content">
          <a class="manage-link">Customisation preferences</a>
        </div>
      </div>
      <div class="section">
        <div class="icon-container"><i class="fas fa-user-shield"></i></div>
        <div class="content">
          <a class="manage-link">Security settings</a>
        </div>
      </div>
      <div class="section">
        <div class="icon-container"><i class="fas fa-user-friends"></i></div>
        <div class="content">
          <a class="manage-link">Payment menthods</a>
        </div>
      </div>
      <div class="section" style="border: none">
        <div class="icon-container"><i class="fas fa-user-friends"></i></div>
        <div class="content">
          <a class="manage-link">Email references</a>
        </div>
      </div>
    </div>
    <component :is="currentComponent"></component>
  </div>
</template>
<style scoped>
.account-settings {
  max-width: 1100px;
  margin: 0 auto;
  padding: 40px;
  font-family: Arial, sans-serif;
  display: flex;
}

.section1 {
  padding: 10px;
  width: auto;
}
.section {
  display: flex;
  align-items: center;
  width: 100%;
  border-bottom: 1px solid #e5e7eb;
}
.icon-container {
  width: 35px;
  height: 35px;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f2f2f2;
  border-radius: 50%;
  margin-right: 15px;
  margin-left: 15px;
  margin-bottom: 15px;
  margin-top: 15px;
}
.icon-container i {
  color: #4285f4;
  font-size: 24px;
}
</style>
