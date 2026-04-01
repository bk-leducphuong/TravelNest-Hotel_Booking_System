<script>
import user from '@/stores/user'
import axios from 'axios'
import { useToast } from 'vue-toastification'
import { mapActions, mapGetters } from 'vuex'

export default {
  setup() {
    // Get toast interface
    const toast = useToast()
    // Make it available inside methods
    return { toast }
  },
  props: {
    phoneNumber: {
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
      numberOfAttempts: 0
    }
  },
  async mounted() {
    await this.sendSmsOtp()
    this.$refs.inputs[0].focus()
  },
  methods: {
    async moveToNext(input, index) {
      // Check if the input is a number
      if (!input.match(/^\d+$/)) {
        return
      }
      // Update the OTP array with the current input
      this.otp.splice(index, 1, input)

      // Focus the next input or process OTP if all fields are filled
      if (index === 3 && this.otp.join('').length === 4) {
        await this.verifySmsOtp()
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
    async resendOtp() {
      try {
        const response = await axios.post(`${import.meta.env.VITE_SERVER_HOST}/api/auth/resend-otp`, {
          phoneNumber: this.$route.params.phoneNumber // Pass phone number if available
        })

        if (response.data.success) {
          console.log('OTP resent successfully!')
        } else {
          console.error('Failed to resend OTP')
        }
      } catch (error) {
        console.error('Error during OTP resend:', error)
      }
    },
    async sendSmsOtp() {
      try {
        await axios.post(`${import.meta.env.VITE_SERVER_HOST}/api/auth/send-sms-otp`, {
          phoneNumber: this.phoneNumber,
          userRole: this.userRole
        })
      } catch (error) {
        this.toast.error('Sending OTP failed! Please try again.')
        console.error('Error during OTP sending:', error)
      }
    },
    async verifySmsOtp() {
      try {
        const response = await axios.post(`${import.meta.env.VITE_SERVER_HOST}/api/auth/verify-sms-otp`, {
          phoneNumber: this.phoneNumber,
          otp: this.otp.join('')
        })
        if (response.data.success) {
          this.toast.success('OTP has been verified!')
        } else {
          this.toast.error('Invalid OTP! Please try again.')
          this.$router.push('/')
        }
      } catch (error) {
        this.toast.error('Verify OTP failed!')
        console.error('Error during OTP verification:', error)
      }
    }
  }
}
</script>

<template>
  <div class="validation-container">
    <div class="validation-card">
      <h1 class="title">Mobile Phone Verification</h1>
      <p class="subtitle">
        Enter the 4-digit verification code that was sent to your phone number.
      </p>

      <form @submit.prevent>
        <div class="otp-container">
          <input
            v-for="index in 4"
            :key="index"
            ref="inputs"
            type="text"
            class="otp-input"
            maxlength="1"
            pattern="[0-9]"
            required
            placeholder=" "
            @input="moveToNext($event.target.value, index - 1)"
            @keyup.delete="backToPrevious(index - 1)"
          />
        </div>
      </form>

      <p class="resend-text">
        Didn't receive code?
        <span class="resend-link" @click="resendOtp">Resend</span>
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
  z-index: 9999;
}

.validation-card {
  background: white;
  padding: 40px;
  border-radius: 16px;
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
  margin-bottom: 32px;
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
</style>
