<!-- CookieConsent.vue -->
<template>
  <div v-if="!consentGiven" class="cookie-consent">
    <p>This website uses cookies to enhance the user experience.</p>
    <div class="button-group">
      <button @click="acceptCookies">Accept</button>
      <button @click="rejectCookies">Reject</button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CookieConsent',
  data() {
    return {
      consentGiven: false
    }
  },
  methods: {
    acceptCookies() {
      this.setCookieConsent(true)
      this.consentGiven = true
      this.$emit('consent-given', true)
    },
    rejectCookies() {
      this.setCookieConsent(false)
      this.consentGiven = true
      this.$emit('consent-given', false)
    },
    setCookieConsent(accepted) {
      const consentValue = accepted ? 'accepted' : 'rejected'
      document.cookie = `cookie_consent=${consentValue}; expires=Fri, 31 Dec 9999 23:59:59 GMT; path=/`
    },
    checkExistingConsent() {
      const cookies = document.cookie.split(';')
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=')
        if (name === 'cookie_consent') {
          this.consentGiven = true
          this.$emit('consent-given', value === 'accepted')
          break
        }
      }
    }
  },
  mounted() {
    this.checkExistingConsent()
  }
}
</script>

<style scoped>
.cookie-consent {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #f1f1f1;
  padding: 20px;
  text-align: center;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
}
.button-group {
  margin-top: 10px;
}
button {
  margin: 0 10px;
  padding: 8px 16px;
  cursor: pointer;
}
</style>