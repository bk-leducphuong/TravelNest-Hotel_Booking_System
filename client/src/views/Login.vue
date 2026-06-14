<template>
  <LoginHeader :isAdminLogin="false" />
  <div class="container">
    <h1>{{ $t('loginHeader') }}</h1>
    <p>Đăng nhập bằng Keycloak để truy cập tài khoản TravelNest của bạn.</p>

    <div class="actions">
      <button type="button" class="btn" @click="startLogin">Đăng nhập</button>
      <button type="button" class="btn btn-secondary" @click="startRegister">Tạo tài khoản</button>
    </div>

    <button type="button" class="link-button" @click="startResetPassword">Quên mật khẩu?</button>

    <p class="hint">
      Google, Twitter và các nhà cung cấp xã hội khác sẽ xuất hiện trực tiếp trên trang đăng nhập
      Keycloak nếu đã được cấu hình.
    </p>
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
  import { mapActions } from 'vuex';
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
    methods: {
      ...mapActions('auth', ['login', 'register', 'resetPassword']),
      async startLogin() {
        try {
          await this.login({ redirectRoute: this.$route.query.redirect || '/' });
        } catch (error) {
          this.toast.error(error.message || 'Không thể chuyển tới trang đăng nhập.');
        }
      },
      async startRegister() {
        try {
          await this.register({ redirectRoute: this.$route.query.redirect || '/' });
        } catch (error) {
          this.toast.error(error.message || 'Không thể chuyển tới trang đăng ký.');
        }
      },
      async startResetPassword() {
        try {
          await this.resetPassword({ redirectRoute: this.$route.query.redirect || '/' });
        } catch (error) {
          this.toast.error(error.message || 'Không thể bắt đầu quy trình đặt lại mật khẩu.');
        }
      },
    },
  };
</script>

<style lang="scss" scoped>
  @import '@/assets/styles/index.scss';

  .container {
    max-width: $container-max-width;
    margin: $spacing-xxl auto;
    padding: $spacing-lg;
    background-color: $white;
    border-radius: $border-radius-sm;
  }

  h1 {
    color: $text-primary;
    margin-bottom: $spacing-lg;
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

  .link-button {
    padding: 0;
    margin-bottom: $spacing-md;
    color: $primary-color;
    text-align: left;
    background: transparent;
    border: none;
    cursor: pointer;
  }

  .hint {
    font-size: 14px;
  }
</style>
