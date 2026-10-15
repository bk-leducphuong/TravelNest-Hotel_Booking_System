<script>
import Header from '@/components/Header.vue'
import LoadingPopup from '@/components/LoadingPopup.vue'
import errorHandler from '@/request/errorHandler.js'
import { BookingService } from '@/services/booking.service'
import { getFirstImageUrl } from '@/utils/images'

// Statuses the API allows cancelling.
const CANCELLABLE_STATUSES = ['pending_payment', 'confirmed', 'payment_failed', 'checked_in']

// Neutral inline placeholder for a missing/broken hotel image.
const PLACEHOLDER_IMAGE = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" role="img" aria-label="No image"><rect width="100%" height="100%" fill="#f2f2f2"/><text x="50%" y="50%" font-family="Arial, sans-serif" font-size="11" fill="#9aa0a6" text-anchor="middle" dominant-baseline="middle">No image</text></svg>'
)}`

export default {
  components: {
    Header,
    LoadingPopup
  },
  data() {
    return {
      step: 1,
      reason: '',
      booking: null,
      isLoading: false,
      isLoaded: false,
      startTitle: 'Canceling your booking, please wait!',
      endTitle: 'Booking cancelled successfully!',
      redirectUrl: '/bookings',
      fail: false,
      disableCancelBtn: false,
      showPolicy: false
    }
  },
  computed: {
    // Normalize the API booking to the shape the template uses.
    getBookingInformation() {
      const b = this.booking
      if (!b) return {}

      const rooms = (b.bookingRooms || b.rooms || []).map((room) => ({
        roomId: room.room_id || room.roomId,
        roomName: room.room?.room_name || room.room_name || room.roomName,
        quantity: room.quantity || 1
      }))

      return {
        ...b,
        checkInDate: b.check_in_date || b.checkInDate,
        checkOutDate: b.check_out_date || b.checkOutDate,
        totalPrice: b.total_price ?? b.totalPrice,
        rooms
      }
    },
    canCancel() {
      return CANCELLABLE_STATUSES.includes(this.getBookingInformation.status)
    },
    // Hotel image from the booking payload (server exposes `image_urls`;
    // accept `images` too for older payloads).
    hotelImageSrc() {
      const hotel = this.getBookingInformation.hotel
      if (!hotel) return ''
      return getFirstImageUrl(hotel.image_urls || hotel.images)
    },
    // Structured cancellation policy captured on the booking, if any.
    policyRooms() {
      const snapshot = this.getBookingInformation.cancellation_policy_snapshot
      return Array.isArray(snapshot?.rooms) ? snapshot.rooms : []
    }
  },
  methods: {
    nextStep() {
      if (this.canCancel) {
        this.step++
      }
    },
    backStep() {
      this.step--
    },
    togglePolicy() {
      this.showPolicy = !this.showPolicy
    },
    // Never render a broken image icon.
    onImageError(event) {
      const el = event?.target
      if (!el || el.dataset.fallbackApplied) return
      el.dataset.fallbackApplied = 'true'
      el.src = PLACEHOLDER_IMAGE
    },
    async loadBooking() {
      try {
        const response = await BookingService.getBookingByCode(this.$route.params.bookingCode)
        this.booking = response?.data || null
      } catch (error) {
        errorHandler(error)
      }
    },
    async cancelBooking() {
      if (!this.booking?.id) {
        this.fail = true
        return
      }

      this.isLoading = true
      this.disableCancelBtn = true

      try {
        await BookingService.cancelBooking(this.booking.id, false)
        this.isLoading = false
        this.isLoaded = true
      } catch (error) {
        errorHandler(error)
        this.isLoading = false
        this.fail = true
      }
    },
    getFirstImageUrl
  },
  async mounted() {
    await this.loadBooking()
  }
}
</script>
<template>
  <Header :isSearchOpen="false" />
  <LoadingPopup :isLoading="isLoading" :isLoaded="isLoaded" :startTitle="startTitle" :endTitle="endTitle" :fail="fail" :redirectUrl="redirectUrl"/>
  <!-- left section -->
  <div class="cancel-container">
    <!-- step 1 -->
    <div class="cancel-left" v-if="step === 1">
      <a @click="this.$router.back()" class="back-link">&lt; Back to my booking</a>
      <h1 class="section-title">Step {{ step }} of 2</h1>
      <h2 class="reason-title">Reason for canceling</h2>
      <p class="reason-desc">
        We can help you find alternative solutions if you need to make changes to your booking.
      </p>
      <form @submit.prevent>
        <label for="reason" class="reason-label">Reason</label>
        <select id="reason" class="reason-select" v-model="reason">
          <option value="Change of dates or destination">Change of dates or destination</option>
          <option value="Found a better price">Found a better price</option>
          <option value="Change of plans">Change of plans</option>
          <option value="Other">Other</option>
        </select>
        <div class="buttons">
          <button type="submit" class="btn-primary" @click="nextStep">Continue</button>
          <a @click="this.$router.push('/bookings')" class="btn-link">I want to keep this booking</a>
        </div>
      </form>
    </div>

    <!-- step 2 -->
    <div class="cancel-left" v-if="step === 2">
      <a class="back-link" @click="backStep">&lt; Previous step</a>
      <h1 class="section-title">Step {{ step }} of 2</h1>
      <h2 class="reason-title">Confirm cancellation</h2>
      <p class="payment-note">
        When you cancel your booking, your money will be refunded in 24 hours. If dont, please contact us to support. For any questions,
        <a href="#" class="btn-link">contact us directly</a>.
      </p>
      <div class="buttons">
        <button class="cancel-btn" @click="cancelBooking" :disabled="disableCancelBtn">
            <span>Cancel Booking</span>
        </button>
        <a @click="this.$router.push('/bookings')" class="btn-link">I want to keep this booking</a>
      </div>
    </div>

    <div class="cancel-right">
      <div class="booking-summary">
        <img
          v-if="hotelImageSrc"
          :src="hotelImageSrc"
          alt="Room image"
          class="room-image"
          @error="onImageError"
        />
        <div v-else class="room-image room-image-placeholder" aria-hidden="true">
          <i class="fa-regular fa-image"></i>
        </div>
        <div>
          <h3 class="property-name">{{ getBookingInformation.hotel?.name }}</h3>
          <div>
            {{
              new Date(getBookingInformation.checkInDate)
                .toString()
                .split(' ')
                .slice(0, 4)
                .join(' ')
            }}
            -
            {{
              new Date(getBookingInformation.checkOutDate)
                .toString()
                .split(' ')
                .slice(0, 4)
                .join(' ')
            }}
          </div>
          <div v-for="room in getBookingInformation.rooms" :key="room.roomId">
            <div style="font-weight: 500;">Booked rooms:</div>
            <span>{{ room.roomName }} x {{ room.quantity }}</span>
          </div>
        </div>
      </div>
      <div class="line-break"></div>
      <div class="pricing">
        <p>
          <span>Your booking:</span>
          <span>USD {{ parseInt(getBookingInformation.totalPrice).toLocaleString('en-US') }}</span>
        </p>
        <p><span>Cancellation fee:</span><span>USD 0</span></p>
        <p><strong>You'll be charged:</strong><span>USD 0</span></p>
      </div>
      <div class="cancellation-policy">
        <h3>Cancellation policy</h3>
        <p>
          You can cancel for free until 2 days before arrival. If you cancel within 2 days of
          arrival, the cancellation fee will be the cost of the first night. If you don't show up,
          the no-show fee will be the same as the cancellation fee.
        </p>
        <button
          type="button"
          class="policy-link"
          :aria-expanded="showPolicy ? 'true' : 'false'"
          @click="togglePolicy"
        >
          {{ showPolicy ? 'Hide cancellation policy' : 'View cancellation policy' }}
        </button>
        <div v-if="showPolicy" class="policy-details">
          <p v-if="policyRooms.length === 0" class="policy-empty">
            The full cancellation policy is shown on your booking confirmation.
          </p>
          <ul v-else>
            <li v-for="rule in policyRooms" :key="rule.roomId">
              <strong>{{ rule.isRefundable ? 'Refundable' : 'Non-refundable' }}</strong>
              <span v-if="rule.freeCancellationUntilHoursBeforeCheckin">
                — free cancellation until
                {{ rule.freeCancellationUntilHoursBeforeCheckin }}h before check-in
              </span>
              <span v-if="rule.refundPercentBeforeDeadline">
                ({{ rule.refundPercentBeforeDeadline }}% refund before the deadline<span
                  v-if="rule.refundPercentAfterDeadline"
                  >, {{ rule.refundPercentAfterDeadline }}% after</span
                >)
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped>
.cancel-container {
  display: flex;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 8px;
  margin: 50px;
  /* width: 100%; */
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

/* Left Section */
.cancel-left {
  flex: 3;
  padding: 20px;
  border-right: 1px solid #ddd;
}

.back-link {
  color: #007bff;
  font-size: 0.9rem;
  text-decoration: none;
  display: inline-block;
  margin-bottom: 10px;
}

.section-title {
  font-size: 1.2rem;
  color: #888;
  margin-bottom: 10px;
}

.reason-title {
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 10px;
}

.reason-desc {
  font-size: 0.9rem;
  margin-bottom: 15px;
}

.reason-label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
}

.reason-select {
  width: 100%;
  padding: 8px;
  margin-bottom: 20px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.buttons {
  display: flex;
  align-items: center;
  gap: 20px;
}

.cancel-btn {
    background-color: #dc3545;
    color: #fff;
    padding: 10px 20px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
}

.cancel-btn:disabled {
  background-color: #b02a37;
  cursor: not-allowed;
}

.vue-loading {
  position: absolute;
}

.btn-primary {
  background-color: #007bff;
  color: #fff;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
}

.btn-primary:hover {
  background-color: #0056b3;
}

.btn-link {
  color: #007bff;
  text-decoration: none;
  font-size: 1rem;
}

.btn-link:hover {
  text-decoration: underline;
}

/* Right Section */
.cancel-right {
  flex: 2;
  padding: 20px;
}

.booking-summary {
  display: flex;
  /* justify-content: space-between; */
  gap: 20px;
}

.room-image {
  width: 100px;
  height: 100px;
  border-radius: 4px;
  margin-bottom: 10px;
}

.room-image-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f2f2f2;
  color: #9aa0a6;
  font-size: 24px;
}

.property-name {
  font-size: 1.2rem;
  font-weight: bold;
  margin-bottom: 5px;
}

.line-break {
    height: 2px;
    width: 100%;
    background-color: #ccc;
    margin: 20px 0px;
}

.pricing {
    margin-bottom: 30px;
}

.pricing p {
  margin-bottom: 10px;
  display: flex;
  justify-content: space-between;
  /* font-size: 0.9rem; */
}

.cancellation-policy {
  background: #f9f9f9;
  padding: 15px;
  border-radius: 4px;
  border: 1px solid #ddd;
}

.policy-link {
  background: none;
  border: none;
  padding: 0;
  color: #007bff;
  font-size: inherit;
  font-family: inherit;
  cursor: pointer;
}

.policy-link:hover {
  text-decoration: underline;
}

.policy-details {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e5e7eb;
}

.policy-details ul {
  margin: 0;
  padding-left: 18px;
}

.policy-details li {
  margin-bottom: 6px;
}

.policy-empty {
  margin: 0;
  color: #666;
}
</style>
