<script>
import { useToast } from 'vue-toastification'
import { mapActions } from 'vuex'

export default {
  setup() {
    const toast = useToast()
    return { toast }
  },
  methods: {
    ...mapActions('auth', ['resetPassword']),
    async startResetPassword() {
      try {
        await this.resetPassword({ redirectRoute: this.$route.fullPath })
        this.$emit('close')
      } catch (error) {
        this.toast.error(error.message || 'Unable to open the Keycloak reset password flow.')
      }
    }
  }
}
</script>

<template>
  <div class="validation-container">
    <div class="password-card">
      <i
        class="fa-solid fa-xmark"
        style="position: absolute; top: 15px; right: 15px; cursor: pointer"
        @click="this.$emit('close')"
      ></i>
      <h1 class="title">Reset Password</h1>
      <p class="subtitle">Password reset is now handled by Keycloak.</p>

      <button type="button" class="submit-password-btn" @click="startResetPassword">
        Continue to Keycloak
      </button>
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

.password-card {
  position: fixed;
  top: 50%;
  left: 50%;
  width: 90%;
  max-width: 480px;
  padding: 40px;
  text-align: center;
  background: white;
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  transform: translate(-50%, -50%);
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
  margin-bottom: 24px;
}

.submit-password-btn {
  width: 100%;
  padding: 12px 16px;
  color: white;
  background-color: #003b95;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}
</style>
