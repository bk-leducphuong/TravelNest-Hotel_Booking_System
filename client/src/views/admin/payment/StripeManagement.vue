<script>
import axios from 'axios'
import DashboardMenu from '@/components/admin/DashboardMenu.vue'
import AdminHeader from '@/components/admin/AdminHeader.vue'
import { mapActions, mapGetters } from 'vuex'
import Loading from 'vue-loading-overlay'
import 'vue-loading-overlay/dist/css/index.css'

export default {
  components: {
    DashboardMenu,
    AdminHeader,
    Loading
  },
  data() {
    return {
      isLoading: false
    }
  }
}
</script>
<template>
  <div class="stripe-management-container">
    <DashboardMenu />
    <div class="main-wrapper">
      <!-- top header -->
      <AdminHeader />
      <!-- main content -->
      <div class="main-content">
        <Loading
          v-model:active="isLoading"
          :color="`#003b95`"
          :is-full-page="false"
        />
        <iframe src="https://connect.stripe.com/express_login" frameborder="0"></iframe>
      </div>
    </div>
  </div>
</template>
<style scoped>
.stripe-management-container {
    height: 100%;
  display: flex;
}
/* Main Content Styles */
.main-wrapper {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.main-content {
  /* overflow-y: scroll; */
  padding: 24px;
  position: relative;
}
</style>
