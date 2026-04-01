<!-- src/views/Login.vue -->
<template>
  <ForgotPassword
    v-if="isForgotPassword"
    :email="email"
    :user-role="userRole"
    @close="closeForgotPassword"
  />
  <LoginHeader :is-admin-login="false" />
  <div v-if="step === 1" class="container">
    <h1>{{ $t('loginHeader') }}</h1>
    <p>
      Bạn có thể đăng nhập tài khoản Booking.com của mình để truy cập các dịch vụ của chúng tôi.
    </p>
    <form @submit.prevent="checkEmail">
      <label for="email">Địa chỉ email</label>
      <input
        id="email"
        v-model="email"
        type="email"
        name="email"
        placeholder="Nhập địa chỉ email của bạn"
        required
      />
      <button type="submit" class="btn">Tiếp tục với email</button>
    </form>
    <p>hoặc sử dụng một trong các lựa chọn này</p>
    <div class="social-login">
      <button class="social-btn" @click="socialLogin('facebook')">
        <img src="../assets/icons/facebook.png" alt="Facebook" />
      </button>
      <button class="social-btn" @click="socialLogin('google')">
        <img src="../assets/icons/search.png" alt="Google" />
      </button>
      <button class="social-btn" @click="socialLogin('twitter')">
        <img src="../assets/icons/twitter.png" alt="Twitter" />
      </button>
    </div>
  </div>

  <div v-if="step === 2" class="container">
    <div>
      <h1>{{ isNewUser ? 'Tạo mật khẩu' : 'Nhập mật khẩu của bạn' }}</h1>
      <p>
        {{
          isNewUser
            ? 'Dùng ít nhất 8 ký tự, trong đó có chữ hoa, chữ thường, số'
            : 'Vui lòng nhập mật khẩu Booking.com của bạn cho'
        }}
      </p>
    </div>
    <form @submit.prevent="registerOrLogin">
      <div>
        <label for="password">Mật khẩu</label>
        <input
          id="password"
          v-model="password"
          type="password"
          name="password"
          placeholder="Nhập mật khẩu"
          required
        />
      </div>
      <div v-if="!isNewUser" class="forgot-password" @click="isForgotPassword = true">
        Forgot password?
      </div>

      <div v-if="isNewUser">
        <label for="confirm password">Xác nhận mật khẩu</label>
        <input
          id="confirm password"
          v-model="confirmPassword"
          type="password"
          name="confirm password"
          placeholder="Nhập mật khẩu"
          required
        />
        <p v-if="passwordMismatch" style="color: red" class="error">Mật khẩu không khớp!</p>
      </div>

      <button type="submit" class="btn">{{ isNewUser ? 'Tạo tài khoản' : 'Đăng nhập' }}</button>
    </form>
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
  import { mapActions, mapGetters } from 'vuex';
  import { useToast } from 'vue-toastification';
  import ForgotPassword from '@/components/ForgotPassword.vue';
  import checkPasswordStrength from '@/utils/checkPasswordStrength';
  import LoginHeader from '@/components/LoginHeader.vue';
  import errorHandler from '@/request/errorHandler';
  import { AuthService } from '@/services/auth.service';

  export default {
    components: {
      ForgotPassword,
      LoginHeader,
    },
    setup() {
      // Get toast interface
      const toast = useToast();
      // Make it available inside methods
      return { toast };
    },
    data() {
      return {
        step: 1, // Step 1: Email, Step 2: Password
        email: '',
        password: '',
        confirmPassword: '',
        isNewUser: false,
        isForgotPassword: false,
        userRole: 'user',
        isLoading: false,
      };
    },
    computed: {
      ...mapGetters('auth', ['isLoginFail']),
      passwordMismatch() {
        return this.isNewUser && this.password !== this.confirmPassword;
      },
    },
    methods: {
      ...mapActions('auth', ['login', 'register']), // Map the login and register actions

      async checkEmail() {
        try {
          const response = await AuthService.checkEmail({
            email: this.email,
            userRole: this.userRole,
          });

          // Check if response has data property (from http interceptor) or is the data itself
          const data = response.data || response;

          if (data.exists) {
            // Email exists, proceed to login
            this.isNewUser = false;
          } else {
            // Email doesn't exist, register new user
            this.isNewUser = true;
          }
          this.step = 2;
        } catch (error) {
          if (error.response && error.response.status === 400) {
            this.toast.error(error.response.data?.message || 'Invalid email');
          } else {
            this.toast.error('Unexpected error occurred. Please try again.');
          }
        }
      },
      async registerOrLogin() {
        if (this.passwordMismatch) {
          return; // Prevent proceeding if passwords do not match
        }

        if (this.isNewUser) {
          const strength = checkPasswordStrength(this.password);
          if (strength < 4) {
            this.toast.error('Password is too weak. Please use a stronger password.');
            return;
          }
        }

        const payload = {
          email: this.email,
          password: this.password,
          userRole: this.userRole,
        };

        const redirectRoute = this.$route.query.redirect || '/';

        try {
          if (this.isNewUser) {
            await this.register({ payload, redirectRoute });
          } else {
            await this.login({ payload, redirectRoute });
          }

          if (this.isLoginFail) {
            this.toast.error('Mật khẩu sai!');
            this.password = '';
          }
        } catch (error) {
          this.toast.error('Đăng nhập/Đăng ký thất bại. Vui lòng thử lại.');
          this.password = '';
        }
      },
      socialLogin(provider) {
        const allowedProviders = ['facebook', 'google', 'twitter'];
        if (!allowedProviders.includes(provider)) {
          console.error('Invalid provider');
          return;
        }

        if (provider === 'google') {
          AuthService.loginWithGoogle();
        } else if (provider === 'facebook') {
          AuthService.loginWithFacebook();
        } else if (provider === 'twitter') {
          AuthService.loginWithTwitter();
        }
      },
      closeForgotPassword() {
        this.isForgotPassword = false;
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

  input {
    @include input-base;
  }

  .btn {
    @include button-primary;
  }

  .social-login {
    @include flex-between;
    margin-top: $spacing-lg;
  }

  .social-btn {
    width: 30%;
    height: $spacing-xxl;
    border: 1px solid $border-color;
    border-radius: $border-radius-sm;
    @include flex-center;
    cursor: pointer;
    transition: border-color 0.2s ease;

    &:hover {
      border-color: $primary-color-light;
    }

    img {
      width: $spacing-lg;
      height: $spacing-lg;
    }
  }

  .footer {
    text-align: center;
    margin-top: $spacing-lg;
    font-size: $font-size-xs;
    color: $text-secondary;

    a {
      color: $primary-color-light;
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }
  }

  .forgot-password {
    font-size: $font-size-base;
    color: $primary-color-light;
    margin-bottom: $spacing-md;
    cursor: pointer;
    text-align: right;
    transition: color 0.2s ease;

    &:hover {
      color: $primary-color-hover;
    }
  }

  .error {
    color: $error-color;
  }
</style>
