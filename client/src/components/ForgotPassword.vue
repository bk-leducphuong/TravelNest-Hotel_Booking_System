<script>
import user from '@/stores/user'
import axios from 'axios'
import { useToast } from 'vue-toastification'
import { mapActions, mapGetters } from 'vuex'
import Loading from 'vue-loading-overlay'
import 'vue-loading-overlay/dist/css/index.css'

export default {
  components: {
    Loading
  },
  setup() {
    // Get toast interface
    const toast = useToast()
    // Make it available inside methods
    return { toast }
  },
  props: {
    email: {
      type: String,
      required: true
    },
    userRole: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      otp: Array(4).fill(''), // Array for storing OTP digits,
      step: 1,
      newPassword: '',
      confirmPassword: '',
      isLoading: false
    }
  },
  methods: {
    ...mapActions('auth', ['login']),
    async moveToNext(input, index) {
      // Check if the input is a number
      if (!input.match(/^\d+$/)) {
        return
      }
      // Update the OTP array with the current input
      this.otp.splice(index, 1, input)

      // Focus the next input or process OTP if all fields are filled
      if (index === 3 && this.otp.join('').length === 4) {
        await this.resetPassword()
      } else if (index < 3) {
        // Move focus to the next input
        const nextInput = this.$refs.inputs[index + 1]
        if (nextInput) {
          nextInput.focus()
        }
      }
    },
    backToPrevious(index) {
      // Remove the OTP digit from the array
      this.otp.splice(index, 1)
      // Move focus to the previous input
      const previousInput = this.$refs.inputs[index - 1]
      if (previousInput) {
        previousInput.focus()
      }
    },
    resetInputs() {
      // Reset OTP and clear input fields
      this.otp = Array(4).fill('')
      this.$refs.inputs.forEach((input) => {
        input.value = ''
      })
      this.$refs.inputs[0].focus()
    },
    async sendOtp() {
      try {
        const response = await axios.post(`${import.meta.env.VITE_SERVER_HOST}/api/auth/forgot-password`, {
          email: this.email, // Pass phone number if available
          userRole: this.userRole
        })
      } catch (error) {
        console.error('Error during OTP resend:', error)
      }
    },
    async goSecondStep() {
      if (this.newPassword != this.confirmPassword) {
        this.toast.error('Passwords do not match')
        return
      }
      this.step = 2
      await this.$nextTick() // Wait for DOM to update
      this.$refs.inputs[0].focus()
      await this.sendOtp()
    },
    async resetPassword() {
      try {
        this.isLoading = true
        await axios.post(`${import.meta.env.VITE_SERVER_HOST}/api/auth/reset-password`, {
          email: this.email,
          userRole: this.userRole,
          otp: this.otp.join(''),
          newPassword: this.newPassword
        })

        // login
        const apiUrl = `${import.meta.env.VITE_SERVER_HOST}/api/auth/login`
        const payload = { email: this.email, password: this.newPassword, userRole: 'customer' }

        await this.login({
          apiUrl: apiUrl,
          payload: payload,
          redirectRoute: '/'
        })

        this.isLoading = false
      } catch (error) {
        console.log(error)
        this.toast.error('Error during password reset')
      }
    }
  },
  async mounted() {}
}
</script>

<template>
  <Loading v-model:active="isLoading" :color="`#003b95`" :is-full-page="true" />
  <div class="validation-container">
    <div class="password-card" v-if="step === 1">
      <i
        class="fa-solid fa-xmark"
        style="position: absolute; top: 15px; right: 15px; cursor: pointer"
        @click="this.$emit('close')"
      ></i>
      <h1 class="title">Reset Password</h1>
      <p class="subtitle">Enter your new password and confirm it.</p>

      <form @submit.prevent>
        <div class="password-container">
          <input type="password" placeholder="New Password" v-model="newPassword" required />
          <input
            type="password"
            placeholder="Confirm Password"
            v-model="confirmPassword"
            required
          />
        </div>
        <button type="submit" class="submit-password-btn" @click="goSecondStep">Submit</button>
      </form>
    </div>
    <div class="validation-card" v-if="step === 2">
      <h1 class="title">OTP Verification</h1>
      <p class="subtitle">
        Enter the 4-digit verification code that was sent to your email if this email is exist.
      </p>

      <form @submit.prevent>
        <div class="otp-container">
          <input
            type="text"
            class="otp-input"
            maxlength="1"
            pattern="[0-9]"
            required
            v-for="index in 4"
            :key="index"
            ref="inputs"
            placeholder=" "
            @input="moveToNext($event.target.value, index - 1)"
            @keyup.delete="backToPrevious(index - 1)"
          />
        </div>
      </form>

      <p class="resend-text">
        Didn't receive code?
        <span class="resend-link" @click="sendOtp()">Resend</span>
      </p>
    </div>
  </div>
</template>

<style scoped>
.validation-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 9;
}

.validation-card {
  background: white;
  padding: 40px;
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  width: 90%;
  max-width: 480px;
  text-align: center;

  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 50%;
}

.title {
  font-size: 24px;
  color: #1a1a1a;
  margin-bottom: 16px;
  font-weight: 600;
}

.subtitle {
  color: #666;
  font-size: 16px;
  margin-bottom: 20px;
  line-height: 1.5;
}

.otp-container {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-bottom: 24px;
}

.otp-input {
  width: 60px;
  height: 60px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  font-size: 24px;
  font-weight: 500;
  text-align: center;
  color: #1a1a1a;
  background: #f8f9fa;
  transition: all 0.3s ease;
}

.otp-input:focus {
  border-color: #6c63ff;
  outline: none;
  background: white;
  box-shadow: 0 0 0 3px rgba(108, 99, 255, 0.1);
}

.resend-text {
  color: #666;
  font-size: 14px;
}

.resend-link {
  color: #6c63ff;
  text-decoration: none;
  font-weight: 500;
  cursor: pointer;
}

.resend-link:hover {
  text-decoration: underline;
}

/* Make inputs move to next automatically */
.otp-input:not(:placeholder-shown) {
  border-color: #6c63ff;
}

.password-card {
  background: white;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  width: 90%;
  max-width: 480px;
  text-align: center;

  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 50%;
}

.password-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  /* margin-bottom: 20px; */
  width: 100%;
}

.password-container input {
  margin-bottom: 10px;
  border: 2px solid #ccc;
  padding: 10px;
  border-radius: 10px;
  width: 70%;
}

.submit-password-btn {
  padding: 10px;
  background-color: #0071c2;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  width: 70%;
}
</style>
