<template>
  <LoadingPopup
    :isLoading="isLoading"
    :startTitle="startTitle"
    :endTitle="endTitle"
    :isLoaded="isLoaded"
    :redirectUrl="redirectUrl"
    :fail="fail"
    :reloadOnFail="false"
  />
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
import { v4 as uuidv4 } from 'uuid'
import { mapGetters } from 'vuex'
import LoadingPopup from '../LoadingPopup.vue'
import { BookingService } from '@/services/booking.service'

export default {
  components: {
    LoadingPopup
  },
  emits: ['booking-created'],
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
      idempotencyKey: uuidv4(),
      createdBooking: null,
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
    async handleSubmit() {
      try {
        this.isLoading = true
        this.processing = true
        this.fail = false
        this.isLoaded = false
        this.paymentStatus = null

        if (!this.bookingInfor.holdId) {
          throw new Error('Your room hold is missing. Please select the room again.')
        }

        const bookingResponse =
          this.createdBooking ||
          (await BookingService.createBooking(
            {
              holdId: this.bookingInfor.holdId,
              guestDetails: {
                fullName: this.userInfor.fullName,
                email: this.userInfor.email,
                phoneNumber: this.userInfor.phoneNumber
              }
            },
            this.idempotencyKey
          ))

        this.createdBooking = bookingResponse
        this.$emit('booking-created', bookingResponse.data)
        const booking = bookingResponse.data
        const intentResponse = await BookingService.createBookingPaymentIntent(booking.bookingId)
        const result = intentResponse.data

        if (result.error) {
          this.fail = true
          throw new Error(result.error)
        }

        // Handle the result
        if (result.clientSecret) {
          // Confirm the payment with Stripe.js
          const { error: confirmError } = await this.stripe.confirmCardPayment(
            result.clientSecret,
            {
              payment_method: {
                card: this.card,
                billing_details: {
                  email: this.userInfor.email,
                  name: this.userInfor.fullName,
                  phone: this.userInfor.phoneNumber
                }
              }
            }
          )

          if (confirmError) {
            this.fail = true
            throw new Error(confirmError.message)
          }

          this.isLoaded = true
          this.isLoading = false

          setTimeout(() => {
            this.$router.replace({
              path: '/book/complete',
              query: { bookingCode: result.bookingCode || booking.bookingCode }
            })
          }, 1000)

          // Reset form
          this.email = ''
          this.card.clear()
        }
      } catch (err) {
        this.paymentStatus = {
          type: 'error',
          message: err.response?.data?.message || err.response?.data?.error?.message || err.message
        }
        this.fail = true
        this.isLoading = false
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
