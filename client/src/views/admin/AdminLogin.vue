<template>
  <LoginHeader :isAdminLogin="true" />

  <div class="container">
    <h4>{{ $t('loginHeader') }}</h4>
    <p>Đăng nhập bằng Keycloak để truy cập khu vực đối tác và quản lý khách sạn.</p>

    <div class="actions">
      <button type="button" class="btn" @click="startAdminLogin">Đăng nhập đối tác</button>
      <button type="button" class="btn btn-secondary" @click="startRegister">
        Tạo tài khoản đối tác
      </button>
    </div>
  </div>

  <div class="footer">
    <p>
      Qua việc đăng nhập hoặc tạo tài khoản, bạn đồng ý với các
      <a>Điều khoản và Điều kiện</a> cũng như <a>Chính sách An toàn và Bảo mật</a> của chúng tôi
    </p>
    <p>Bảo lưu mọi quyền.<br />Bản quyền (2006 - 2024) - TravelNest™</p>
  </div>
</template>

<script>
import { mapActions, mapGetters } from 'vuex'
import { useToast } from 'vue-toastification'
import LoginHeader from '@/components/LoginHeader.vue'

export default {
  components: {
    LoginHeader
  },
  setup() {
    const toast = useToast()
    return { toast }
  },
  computed: {
    ...mapGetters('auth', ['isAdminAuthenticated'])
  },
  methods: {
    ...mapActions('auth', ['loginAdmin', 'register']),
    async startAdminLogin() {
      try {
        await this.loginAdmin({
          redirectRoute: this.$route.query.redirect || '/admin/hotels-management'
        })
      } catch (error) {
        this.toast.error(error.message || 'Không thể chuyển tới trang đăng nhập đối tác.')
      }
    },
    async startRegister() {
      try {
        await this.register({ redirectRoute: '/admin/hotels-management' })
      } catch (error) {
        this.toast.error(error.message || 'Không thể chuyển tới trang đăng ký đối tác.')
      }
    }
  },
  mounted() {
    if (this.isAdminAuthenticated) {
      this.$router.replace(this.$route.query.redirect || '/admin/hotels-management')
    }
  }
}
</script>

<style scoped>
body {
  font-family: Arial, sans-serif;
  margin: 0;
  padding: 0;
  background-color: white;
}
.container {
  max-width: 400px;
  margin: 40px auto;
  padding: 20px;
  background-color: white;
  border-radius: 4px;
}
.actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.btn {
  width: 100%;
  padding: 10px;
  background-color: #0071c2;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.btn-secondary {
  color: #0071c2;
  background-color: white;
  border: 1px solid #0071c2;
}
</style>
