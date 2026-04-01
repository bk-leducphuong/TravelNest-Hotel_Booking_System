<script>
import Header from '@/components/Header.vue'
import { mapGetters } from 'vuex'
import LoadingPopup from '@/components/LoadingPopup.vue';
import errorHandler from '@/request/errorHandler.js'
import axios from 'axios';

export default {
  components: {
    Header,
    LoadingPopup
  },
  data() {
    return {
      step: 1,
      reason: '',
      isLoading: false,
      isLoaded: false,
      startTitle: 'Canceling your booking, please wait!',
      endTitle: 'Booking cancelled successfully!',
      redirectUrl: '/bookings',
      fail: false,
      disableCancelBtn: false
    }
  },
  computed: {
    ...mapGetters('booking', ['getBookingInformation'])
  },
  methods: {
    nextStep() {
      this.step++
    },
    backStep() {
      this.step--
    },
    async cancelBooking() {
      try {
        // check whether the booking is confirmed
        if (this.getBookingInformation.status !== 'confirmed') {
          return
        }
        
        this.isLoading = true
        this.disableCancelBtn = true

        const response = await axios.post(`${import.meta.env.VITE_SERVER_HOST}/api/cancel-bookings`, {
          bookingInformation: this.getBookingInformation,
        }, {
          withCredentials: true
        })
        if (response.data.success) {
          this.isLoading = false
          this.isLoaded = true
        }else {
          this.fail = true
        }
      }catch(error) {
        errorHandler(error)
        this.fail = true
      }   
    }
  }
}
</script>
<template>
  <Header :is-search-open="false" />
  <LoadingPopup :is-loading="isLoading" :is-loaded="isLoaded" :start-title="startTitle" :end-title="endTitle" :fail="fail" :redirect-url="redirectUrl"/>
  <!-- left section -->
  <div class="cancel-container">
    <!-- step 1 -->
    <div v-if="step === 1" class="cancel-left">
      <a class="back-link" @click="$router.back()">&lt; Back to my booking</a>
      <h1 class="section-title">Step {{ step }} of 2</h1>
      <h2 class="reason-title">Reason for canceling</h2>
      <p class="reason-desc">
        We can help you find alternative solutions if you need to make changes to your booking.
      </p>
      <form>
        <label for="reason" class="reason-label">Reason</label>
        <select id="reason" v-model="reason" class="reason-select">
          <option value="Change of dates or destination">Change of dates or destination</option>
          <option value="Found a better price">Found a better price</option>
          <option value="Change of plans">Change of plans</option>
          <option value="Other">Other</option>
        </select>
        <div class="buttons">
          <button type="submit" class="btn-primary" @click="nextStep">Continue</button>
          <a class="btn-link" @click="$router.push('/bookings')">I want to keep this booking</a>
        </div>
      </form>
    </div>

    <!-- step 2 -->
    <div v-if="step === 2" class="cancel-left">
      <a class="back-link" @click="backStep">&lt; Previous step</a>
      <h1 class="section-title">Step {{ step }} of 2</h1>
      <h2 class="reason-title">Confirm cancellation</h2>
      <p class="payment-note">
        When you cancel your booking, your money will be refunded in 24 hours. If dont, please contact us to support. For any questions,
        <a href="#" class="btn-link">contact us directly</a>.
      </p>
      <div class="buttons">
        <button class="cancel-btn" :disabled="disableCancelBtn" @click="cancelBooking">
            <span>Cancel Booking</span>
        </button>
        <a class="btn-link" @click="$router.push('/bookings')">I want to keep this booking</a>
      </div>
    </div>

    <div class="cancel-right">
      <div class="booking-summary">
        <img
          :src="JSON.parse(getBookingInformation.hotel.image_urls)[0]"
          alt="Room image"
          class="room-image"
        />
        <div>
          <h3 class="property-name">{{ getBookingInformation.hotel.name }}</h3>
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
          <span>VND {{ parseInt(getBookingInformation.totalPrice).toLocaleString('vi-VN') }}</span>
        </p>
        <p><span>Cancellation fee:</span><span>VND 0</span></p>
        <p><strong>You'll be charged:</strong><span>VND 0</span></p>
      </div>
      <div class="cancellation-policy">
        <h3>Cancellation policy</h3>
        <p>
          You can cancel for free until 2 days before arrival. If you cancel within 2 days of
          arrival, the cancellation fee will be the cost of the first night. If you don't show up,
          the no-show fee will be the same as the cancellation fee.
        </p>
        <a href="#" class="policy-link">View cancellation policy</a>
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
  color: #007bff;
  text-decoration: none;
}

.policy-link:hover {
  text-decoration: underline;
}
</style>
