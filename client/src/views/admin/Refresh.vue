<template>
  <div class="reauth-page">
    <h1>Oops! Your Stripe Onboarding Timed Out</h1>
    <p>Please reauthenticate to complete your account setup.</p>
    <button @click="createAccountLink">Reauthenticate</button>
  </div>
</template>

<script>
import axios from 'axios'
import { useRoute } from 'vue-router'

export default {
  data() {
    return {
      accountLinkCreatePending: false,
      error: false,
      connectedAccountId: null
    }
  },
  mounted() {
    const route = useRoute()
    this.connectedAccountId = route.params.connectedAccountId
  },
  methods: {
    async createAccountLink() {
      try {
        this.accountLinkCreatePending = true
        this.error = false
        const response = await axios.post(`${import.meta.env.VITE_SERVER_HOST}/api/admin/payout/create-account-link`, {
          connectedAccountId: this.connectedAccountId
        }, {
            withCredentials: true
        })

        this.accountLinkCreatePending = false
        const url = response.data.url
        if (url) {
          window.location.href = url
        }
      } catch (error) {
        errorHandler(error);
      }
    }
  }
}
</script>

<style scoped>
.reauth-page {
  text-align: center;
  margin-top: 100px;
}
button {
  padding: 10px 20px;
  font-size: 16px;
  background-color: #6772e5;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}
button:hover {
  background-color: #5469d4;
}
</style>
