<script>
import DashboardMenu from '@/components/admin/DashboardMenu.vue'
import AdminHeader from '@/components/admin/AdminHeader.vue'

import axios from 'axios'
import { mapGetters } from 'vuex'
import errorHandler from '@/request/errorHandler';

export default {
  components: {
    DashboardMenu,
    AdminHeader
  },
  data() {
    return {
      accountCreatePending: false,
      accountLinkCreatePending: false,
      error: false,
      connectedAccountId: null,
      isLoading: false
    }
  },
  computed: {
    ...mapGetters[('auth', 'getEmail')]
  },
  methods: {
    async checkAccountExist() {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_SERVER_HOST}/api/admin/payout/check-account-exist`,
          {
            withCredentials: true
          }
        )

        if (response.data.exist) {
          this.connectedAccountId = response.data.connectedAccountId
          return true
        } else {
          this.connectedAccountId = null
          return false
        }
      } catch (error) {
        errorHandler(error);
      }
    },
    async createAccount() {
      try {
        this.isLoading = true
        if (!(await this.checkAccountExist())) {
          this.accountCreatePending = true
          this.error = false

          const response = await axios.post(
            `${import.meta.env.VITE_SERVER_HOST}/api/admin/payout/create-connect-account`,
            { email: this.getEmail },
            {
              withCredentials: true
            }
          )

          this.accountCreatePending = false
          this.connectedAccountId = response.data.connectedAccountId
        }
        // redirect to account onboarding page
        await this.createAccountLink()
      } catch (error) {
        errorHandler(error);
      }finally {
        this.isLoading = false
      }
    },
    async createAccountLink() {
      try {
        this.accountLinkCreatePending = true
        this.error = false
        const response = await axios.post(
          `${import.meta.env.VITE_SERVER_HOST}/api/admin/payout/create-account-link`,
          {
            connectedAccountId: this.connectedAccountId
          },
          {
            withCredentials: true
          }
        )

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
<template>
  <div class="payment-container">
    <DashboardMenu />
    <div class="main-wrapper">
      <AdminHeader />

      <!-- main content -->
      <section class="introduction-section">
        <div class="container">
          <h2>Introduction</h2>
          <p>
            We’re excited to have you as part of our hotel network! Our platform helps hotel owners
            manage bookings efficiently and withdraw earnings securely using Stripe Connect. Below,
            you'll find all the essential information to get started.
          </p>
        </div>
        <div class="container">
          <h2>Regulations</h2>
          <ul>
            <li>Ensure your property complies with all local laws and regulations.</li>
            <li>Provide accurate and up-to-date bank account information for withdrawals.</li>
            <li>Maintain excellent service to minimize guest complaints and refunds.</li>
            <li>Withdrawals are processed securely via Stripe and require account verification.</li>
          </ul>
        </div>
        <div class="container">
          <h2>About Stripe Connect</h2>
          <p>
            Stripe Connect is a secure payment platform that enables you to withdraw earnings
            directly to your bank account. It provides fast, reliable, and safe transactions, so you
            can focus on running your business without worries.
          </p>
          <h3>Key Features:</h3>
          <ul>
            <li>Easy account setup with secure verification.</li>
            <li>Fast payouts directly to your bank account.</li>
            <li>24/7 support for payment-related queries.</li>
          </ul>
        </div>
        <div class="container">
          <h2>Ready to Get Started?</h2>
          <p>Set up your Stripe account and start managing your earnings today.</p>
          <p>If you have already set up Stripe Connect, you can reset your Stripe Connect account by clicking the button below.</p>
          <a class="cta-button" @click="createAccount">{{ isLoading ? "Loading..." : "Set Up Stripe Now" }}</a>
        </div>
      </section>

      <footer class="footer">
        <p>&copy; 2024 [Your Booking Platform]. All rights reserved.</p>
      </footer>
    </div>
  </div>
</template>
<style scoped>
.payment-container {
  display: flex;
}
/* Main Content Styles */
.main-wrapper {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

h1,
h2,
h3 {
  color: #333;
}

ul {
  padding-left: 20px;
}

a {
  text-decoration: none;
}

/* Hero Section */
.hero-section {
  background-color: #0071c2;
  color: white;
  text-align: center;
  padding: 50px 20px;
}

.hero-content h1 {
  font-size: 36px;
  margin-bottom: 10px;
}

.hero-content p {
  font-size: 18px;
  max-width: 600px;
  margin: 0 auto;
}

/* General Section Styles */
.container {
  padding: 20px;
}

.introduction-section {
  margin: 24px;
  background: white;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
}

h2 {
  font-size: 24px;
  margin-bottom: 15px;
  color: #333;
}

p,
ul {
  font-size: 16px;
  color: #555;
}

ul li {
  margin-bottom: 10px;
}

/* CTA Section */
.cta-section {
  text-align: center;
}

section .cta-button {
  display: inline-block;
  margin-top: 15px;
  padding: 12px 20px;
  font-size: 18px;
  font-weight: 700;
  background-color: #0071c2;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.cta-section .cta-button:hover {
  background-color: #005ea3;
}

/* Footer */
.footer {
  text-align: center;
  padding: 10px 0;
  background-color: #f1f3f5;
  color: #777;
}
</style>
