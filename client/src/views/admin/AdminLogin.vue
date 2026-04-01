<!-- src/views/Login.vue -->
<template>
  <LoginHeader :is-admin-login="true" />

  <div v-if="step === 1" class="container">
    <h4>{{ $t('loginHeader') }}</h4>
    <p>Nhập email để trở thành đối tác của chúng tôi</p>
    <form @submit.prevent="checkEmail">
      <label for="email">Địa chỉ email hay số điện thoại</label>
      <input
        id="email"
        v-model="email"
        type="email"
        name="email"
        placeholder="Nhập địa chỉ email của bạn hoặc số điện thoại"
        required
      />

      <button type="submit" class="btn">Tiếp tục</button>
    </form>
  </div>

  <div v-if="step === 2" class="container">
    <div>
      <h4>
        {{ isNewUser ? 'Hãy điền các thông tin để hoàn thiện đăng kí' : 'Nhập mật khẩu của bạn' }}
      </h4>
      <p>
        {{
          isNewUser
            ? 'Mật khẩu phải có ít nhất 10 ký tự, trong đó có chữ hoa, chữ thường và số.'
            : 'Vui lòng nhập mật khẩu Booking.com của bạn cho'
        }}
      </p>
    </div>
    <form @submit.prevent="submitSecondForm">
      <div v-if="isNewUser">
        <label for="password">Tên</label>
        <input v-model="firstName" type="text" placeholder="Nhập tên của bạn" required />
      </div>
      <div v-if="isNewUser">
        <label for="password">Họ</label>
        <input v-model="lastName" type="text" placeholder="Nhập họ của bạn" required />
      </div>
      <div v-if="isNewUser">
        <label for="password">Số điện thoại</label>
        <input
          v-model="phoneNumber"
          type="text"
          placeholder="Nhập số điện thoại của bạn"
          required
        />
      </div>
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
        <p v-if="passwordMismatch" class="error" style="color: red">Mật khẩu không khớp!</p>
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

  <OtpVerification
    v-if="openVerificationPopup"
    :phone-number="phoneNumber"
    :user-role="userRole"
    @update-is-verified="updateIsVerified"
  />
</template>

<script>
import axios from 'axios' // Import Axios
import { mapActions, mapGetters } from 'vuex'
import { useToast } from 'vue-toastification'
import OtpVerification from '@/components/admin/otp-verification/OtpVerification.vue'
import checkPasswordStrength from '@/utils/checkPasswordStrength'
import LoginHeader from '@/components/LoginHeader.vue'
import errorHandler from '@/request/errorHandler'

export default {
  components: {
    OtpVerification,
    LoginHeader
  },
  setup() {
    // Get toast interface
    const toast = useToast()
    // Make it available inside methods
    return { toast }
  },
  data() {
    return {
      step: 1, // Step 1: Email, Step 2: Password
      email: '',
      password: '',
      // for new user
      lastName: '',
      firstName: '',
      phoneNumber: '',
      userRole: 'partner',
      confirmPassword: '',
      isNewUser: false,

      // for OTP verification
      isVerified: false,
      openVerificationPopup: false,

      isForgotPassword: false,
    }
  },
  computed: {
    ...mapGetters('auth', ['isUserAuthenticated', 'getOtp', 'isLoginFail']),
    passwordMismatch() {
      return this.isNewUser && this.password !== this.confirmPassword
    }
  },
  methods: {
    ...mapActions('auth', ['loginAdmin', 'logout', 'sendOtp']), // Map the login action,
    updateIsVerified(status) {
      this.isVerified = status
      if (status) {
        this.registerOrLogin()
      } else {
        this.toast.error('OTP verification failed!')
        this.$router.push('/admin/login')
      }
    },
    checkEmail() {
      // Call to API to check if email exists
      axios
        .post(`${import.meta.env.VITE_SERVER_HOST}/api/auth/check-email`, {
          email: this.email,
          userRole: 'partner'
        })
        .then((response) => {
          if (response.data.exists) {
            // Email exists, proceed to login
            this.isNewUser = false
          } else {
            // Email doesn't exist, register new user
            this.isNewUser = true
          }
          this.step = 2
        })
        .catch((error) => {
          errorHandler(error)
        })
    },
    async registerOrLogin() {
      // logout as a customer before starting with admin
      if (this.isUserAuthenticated) {
        await this.logout({ haveRedirect: false })
      }
      const apiUrl = this.isNewUser
        ?  `${import.meta.env.VITE_SERVER_HOST}/api/auth/admin/register`
        : `${import.meta.env.VITE_SERVER_HOST}/api/auth/admin/login`
      const payload = this.isNewUser
        ? {
            email: this.email,
            password: this.password,
            userRole: 'partner',
            firstName: this.firstName,
            lastName: this.lastName,
            phoneNumber: this.phoneNumber
          }
        : { email: this.email, password: this.password, userRole: 'partner' }
      await this.loginAdmin({
        apiUrl: apiUrl,
        payload: payload
      })
      // if login fail
      if (this.isLoginFail) {
        this.password = ''
        this.toast.error('Mật khẩu sai!')
      }
    },
    submitSecondForm() {
      if (this.isNewUser) {
        const strength = checkPasswordStrength(this.password)
        if (strength < 4) {
          this.toast.error('Password is too weak. Please use a stronger password.')
          return
        }
        this.runOtpVerification()
      } else {
        this.registerOrLogin()
      }
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
.header {
  background-color: #003580;
  color: white;
  padding: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.logo {
  font-weight: bold;
  font-size: 24px;
}
.header-right {
  display: flex;
  align-items: center;
}
.flag {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: #ff0000;
  display: inline-block;
  margin-right: 10px;
}
.container {
  max-width: 400px;
  margin: 40px auto;
  padding: 20px;
  background-color: white;
  border-radius: 4px;
}
h1 {
  color: #333;
  margin-bottom: 20px;
}
p {
  color: #666;
  line-height: 1.5;
}
input {
  width: 100%;
  padding: 10px;
  margin-bottom: 20px;
  border: 1px solid #ccc;
  border-radius: 4px;
}
.btn {
  width: 100%;
  padding: 10px;
  background-color: #0071c2;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}
.social-login {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
}
.social-btn {
  width: 30%;
  height: 40px;
  border: 1px solid #ccc;
  border-radius: 4px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
}
.social-btn img {
  width: 20px;
  height: 20px;
}
.footer {
  text-align: center;
  margin-top: 20px;
  font-size: 12px;
  color: #666;
}
.footer a {
  color: #0071c2;
  text-decoration: none;
}

.forgot-password {
  font-size: 16px;
  color: #2966e8;
  margin-bottom: 15px;
  cursor: pointer;
  text-align: right;
}

.forgot-password:hover {
  color: #004779;
}
</style>
