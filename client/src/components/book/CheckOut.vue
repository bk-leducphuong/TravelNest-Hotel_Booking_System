<template>
  <LoadingPopup :is-loading="isLoading" :start-title="startTitle" :end-title="endTitle" :is-loaded="isLoaded" :redirect-url="redirectUrl" :fail="fail"/>
  <div class="payment-form">
    <form @submit.prevent="handleSubmit">
      <div id="card-element"></div>
      <div id="card-errors" role="alert"></div>

      <!-- Payment Status Message -->
      <div v-if="paymentStatus" :class="['status-message', paymentStatus.type]">
        {{ paymentStatus.message }}
      </div>

      <button type="submit" :disabled="processing">
        {{ processing ? 'Processing...' : 'Pay' }}
      </button>
    </form>
  </div>
</template>

<script>
import { loadStripe } from '@stripe/stripe-js'
import axios from 'axios'
import { v4 as uuidv4 } from 'uuid'
import { mapActions, mapGetters } from 'vuex'
import LoadingPopup from '../LoadingPopup.vue'

export default {
  components: {
    LoadingPopup
  },
  props: {
    bookingInfor: {
      type: Object,
      required: true
    },
    searchData: {
      type: Object,
      required: true
    },
    userInfor: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      stripe: null,
      card: null,
      processing: false,
      paymentStatus: null,
      isLoading: false,
      isLoaded: false,
      startTitle: 'Thanh toán của bạn đang được xử lí...',
      endTitle: 'Thanh toán thành công!',
      redirectUrl: '',
      fail: false,
    }
  },
  computed: {
    ...mapGetters('book', ['getBookingInfor']),
  },
  async mounted() {
    // Initialize Stripe with your publishable key
    this.stripe = await loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
    const elements = this.stripe.elements()

    // Create card element
    this.card = elements.create('card')
    this.card.mount('#card-element')

    // Handle real-time validation errors
    this.card.addEventListener('change', (event) => {
      const displayError = document.getElementById('card-errors')
      if (event.error) {
        displayError.textContent = event.error.message
      } else {
        displayError.textContent = ''
      }
    })
  },
  methods: {
    ...mapActions('book', ['checkRoomAvailability']),
    async handleSubmit() {
      try {
        // check whether this room is available or not
        // if not available, redirect back to the room selection page
        const isAvailable = await this.checkRoomAvailability()
        if (!isAvailable) {
          this.$toast.error('Phòng đã được đặt hết, vui lòng chọn phòng khác!')
          this.$router.place({ path: '/hotels', params: { hotel_id: this.getBookingInfor.hotel.hotel_id } })
          return
        } else {
          this.isLoading = true
          // if available, book the room
          this.processing = true
          this.paymentStatus = null

          // Create payment method
          const { paymentMethod, error } = await this.stripe.createPaymentMethod({
            type: 'card',
            card: this.card,
            billing_details: {
              email: this.userInfor.email,
              name: this.userInfor.fullName,
              phone: this.userInfor.phoneNumber
            }
          })

          if (error) {
            throw new Error(error.message)
          }

          const bookingCode = uuidv4() // ⇨ '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d'

          // Send payment method ID and email to server
          const response = await axios.post(
            `${import.meta.env.VITE_SERVER_HOST}/api/payment`,
            {
              paymentMethodId: paymentMethod.id,
              amount: this.bookingInfor.totalPrice, // Amount in cents
              currency: 'vnd', // default
              bookingDetails: {
                bookingCode: bookingCode,
                hotel_id: this.bookingInfor.hotel.hotel_id,
                checkInDate: this.bookingInfor.checkInDate, 
                checkOutDate: this.bookingInfor.checkOutDate,
                bookedRooms: this.bookingInfor.selectedRooms,
                numberOfGuests: this.bookingInfor.numberOfGuests
              }
            },
            { withCredentials: true }
          )

          const result = await response.data

          if (result.error) {
            this.fail = true
            throw new Error(result.error)
          }

          // Handle the result
          if (result.clientSecret) {
            // Confirm the payment with Stripe.js
            const { error: confirmError } = await this.stripe.confirmCardPayment(
              result.clientSecret
            )

            if (confirmError) {
              this.fail = true
              throw new Error(confirmError.message)
            }

            this.isLoaded = true
            this.isLoading = false

            setTimeout(() => {
              this.$router.replace({ path: '/book/complete', query: { bookingCode: bookingCode } })
            }, 1000)

            // Reset form
            this.email = ''
            this.card.clear()
          }
        }
      } catch (err) {
        this.paymentStatus = {
          type: 'error',
          message: err.message
        }
        this.fail = true
      } finally {
        this.processing = false
      }
    }
  },
  beforeDestroy() {
    if (this.card) {
      this.card.destroy()
    }
  }
}
</script>

<style scoped>
.payment-form {
  max-width: 500px;
  margin: 0 auto;
  padding: 20px;
}

#card-element {
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  margin-bottom: 20px;
}

#card-errors {
  color: #dc3545;
  margin-bottom: 10px;
}

.status-message {
  padding: 10px;
  margin-bottom: 15px;
  border-radius: 4px;
}

.status-message.success {
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.status-message.error {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

button {
  width: 100%;
  padding: 10px;
  background: #5469d4;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:disabled {
  background: #7a8be0;
  cursor: not-allowed;
}
</style>
