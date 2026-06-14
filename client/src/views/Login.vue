<template>
  <LoginHeader :isAdminLogin="false" />
  <div class="container">
    <h1>{{ heading }}</h1>
    <p>{{ description }}</p>

    <div v-if="isVerificationRequired" class="verification-card">
      <h2>Xác minh email để tiếp tục</h2>
      <p>
        Tài khoản Keycloak của bạn đã đăng nhập nhưng email vẫn chưa được xác minh. Hãy mở email
        xác minh, hoàn tất bước xác nhận, rồi thử lại.
      </p>
      <div class="actions">
        <button type="button" class="btn" @click="retryBootstrap">Tôi đã xác minh email</button>
        <button type="button" class="btn btn-secondary" @click="startAuthFlow">
          Tiếp tục với Keycloak
        </button>
      </div>
    </div>

    <div v-else class="actions">
      <button type="button" class="btn" @click="startAuthFlow">Tiếp tục với Keycloak</button>
      <button type="button" class="btn btn-secondary" @click="startResetPassword">
        Quên mật khẩu?
      </button>
    </div>

    <p class="hint">
      Nếu trình duyệt không tự chuyển trang, hãy dùng nút phía trên để mở trang xác thực của
      Keycloak.
    </p>
  </div>
</template>

<script>
  import { mapActions, mapGetters } from 'vuex';
  import { useToast } from 'vue-toastification';
  import LoginHeader from '@/components/LoginHeader.vue';

  export default {
    components: {
      LoginHeader,
    },
    setup() {
      const toast = useToast();
      return { toast };
    },
    data() {
      return {
        authStarted: false,
      };
    },
    computed: {
      ...mapGetters('auth', [
        'isUserAuthenticated',
        'isAdminAuthenticated',
        'isVerificationRequired',
      ]),
      requestedAction() {
        return this.$route.query.action === 'register' ? 'register' : 'login';
      },
      heading() {
        return this.requestedAction === 'register'
          ? 'Đang chuyển bạn tới trang đăng ký'
          : 'Đang chuyển bạn tới trang đăng nhập';
      },
      description() {
        return this.requestedAction === 'register'
          ? 'TravelNest sẽ mở trang đăng ký được lưu trữ trên Keycloak.'
          : 'TravelNest sẽ mở trang đăng nhập được lưu trữ trên Keycloak.';
      },
    },
    methods: {
      ...mapActions('auth', ['login', 'register', 'resetPassword', 'checkAuth']),
      redirectAuthenticatedUser() {
        if (this.isAdminAuthenticated) {
          this.$router.replace(this.$route.query.redirect || '/admin/hotels-management');
          return;
        }

        if (this.isUserAuthenticated) {
          this.$router.replace(this.$route.query.redirect || '/');
        }
      },
      async startAuthFlow() {
        if (this.authStarted) {
          return;
        }

        this.authStarted = true;

        try {
          if (this.requestedAction === 'register') {
            await this.register({ redirectRoute: this.$route.query.redirect || '/' });
            return;
          }

          await this.login({ redirectRoute: this.$route.query.redirect || '/' });
        } catch (error) {
          this.authStarted = false;
          this.toast.error(error.message || 'Không thể chuyển tới Keycloak.');
        }
      },
      async startResetPassword() {
        try {
          await this.resetPassword({ redirectRoute: this.$route.query.redirect || '/' });
        } catch (error) {
          this.toast.error(error.message || 'Không thể bắt đầu quy trình đặt lại mật khẩu.');
        }
      },
      async retryBootstrap() {
        try {
          await this.checkAuth();
          this.redirectAuthenticatedUser();
        } catch (error) {
          this.toast.error(error.message || 'Email của bạn vẫn chưa được xác minh.');
        }
      },
    },
    mounted() {
      this.redirectAuthenticatedUser();

      if (!this.isUserAuthenticated && !this.isAdminAuthenticated && !this.isVerificationRequired) {
        this.startAuthFlow();
      }
    },
    watch: {
      isUserAuthenticated() {
        this.redirectAuthenticatedUser();
      },
      isAdminAuthenticated() {
        this.redirectAuthenticatedUser();
      },
      '$route.query.action'() {
        this.authStarted = false;
        this.startAuthFlow();
      },
    },
  };
</script>

<style lang="scss" scoped>
  @import '@/assets/styles/index.scss';

  .container {
    max-width: 560px;
    margin: $spacing-xxl auto;
    padding: $spacing-xl;
    background-color: $white;
    border-radius: $border-radius-sm;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
  }

  h1 {
    color: $text-primary;
    margin-bottom: $spacing-md;
  }

  p {
    color: $text-secondary;
    line-height: 1.5;
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: $spacing-md;
    margin: $spacing-lg 0;
  }

  .btn {
    @include button-primary;
  }

  .btn-secondary {
    color: $text-primary;
    background-color: transparent;
    border: 1px solid $border-color;
  }

  .verification-card {
    margin: $spacing-lg 0;
    padding: $spacing-lg;
    background: rgba($primary-color, 0.06);
    border: 1px solid rgba($primary-color, 0.2);
    border-radius: $border-radius-sm;
  }

  .verification-card h2 {
    margin-bottom: $spacing-sm;
    color: $text-primary;
    font-size: 20px;
  }

  .hint {
    font-size: 14px;
  }
 </style>
