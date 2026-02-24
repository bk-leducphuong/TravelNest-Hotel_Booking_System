<script>
import AdminHeader from '@/components/admin/AdminHeader.vue'
import DashboardMenu from '@/components/admin/DashboardMenu.vue'
import axios from 'axios'
import Loading from 'vue-loading-overlay'
import 'vue-loading-overlay/dist/css/index.css'
import { mapGetters } from 'vuex'
import LoadingPopup from '@/components/LoadingPopup.vue'
import errorHandler from '@/request/errorHandler'

export default {
  components: {
    DashboardMenu,
    AdminHeader,
    Loading,
    LoadingPopup
  },
  data() {
    return {
      isLoading: false, // when fetching booking details, show loading
      doCancel: false,
      isLoadingPopup: false, // when cancelling booking, show loading popup
      isLoaded: false,
      startTitle: 'Canceling booking, please wait!',
      endTitle: 'Booking cancelled successfully!',
      fail: false,
      redirectUrl: `/admin/${this.$route.params.hotelId}/bookings/all`
    }
  },
  computed: {
    ...mapGetters('booking', ['getBookingInformation']),
    ...mapGetters('manageHotels', ['getCurrentManagingHotelId', 'getCurrentManagingHotelInformation'])
  },
  methods: {
    async cancelBooking() {
      try {
        // check whether the booking is confirmed
        if (this.getBookingInformation.status !== 'confirmed') {
          return
        }

        this.isLoadingPopup = true
        const response = await axios.post(
          `${import.meta.env.VITE_SERVER_HOST}/api/admin/cancel-booking`,
          {
            bookingInformation: this.getBookingInformation,
            hotelInformation: this.getCurrentManagingHotelInformation
          },
          {
            withCredentials: true
          }
        )

        if (response.data.success) {
          this.isLoadingPopup = false
          this.isLoaded = true
        }else {
          this.fail = true
        }

        this.doCancel = false
      } catch (error) {
        this.fail = true
        errorHandler(error);
      }
    }
  }
}
</script>
<template>
  <LoadingPopup :isLoading="isLoadingPopup" :isLoaded="isLoaded" :startTitle="startTitle" :endTitle="endTitle" :fail="fail" :redirectUrl="redirectUrl"/>
  <!-- cancel confirmation popup -->
  <div class="cancel-confirmation-popup" v-if="doCancel">
    <div class="popup-content">
      <div class="popup-header">
        <h2>Are you sure you want to cancel this reservation?</h2>
        <div class="close-btn" @click="doCancel = false">
          <i class="fa fa-times" aria-hidden="true"></i>
        </div>
      </div>
      <div class="popup-body">
        <p>This action cannot be undone. Are you sure you want to cancel this reservation?</p>
      </div>
      <div class="popup-footer">
        <button class="cancel-btn" @click="cancelBooking">Yes, cancel this reservation</button>
        <button class="cancel-btn" @click="doCancel = false">No, keep this reservation</button>
      </div>
    </div>
  </div>
  <!-- end cancel confirmation popup -->

  <div class="booking-details-container">
    <DashboardMenu />
    <div class="main-wrapper">
      <!-- top header -->
      <AdminHeader />
      <!-- main content -->
      <div class="main-content">
        <Loading
          v-model:active="isLoading"
          :can-cancel="true"
          :on-cancel="onCancel"
          :color="`#003b95`"
          :is-full-page="false"
        />
        <div class="content">
          <div class="reservation-details">
            <h2 style="margin-bottom: 12px">
              Reservation Details
              <span style="font-size: 25px">
                (
                <span v-if="getBookingInformation.status == 'cancelled'"
                  ><i class="fa fa-times" aria-hidden="true" style="color: red"></i
                ></span>
                <span v-if="getBookingInformation.status == 'confirmed'"
                  ><i class="fa fa-check" aria-hidden="true" style="color: green"></i
                ></span>
                {{ getBookingInformation.status }})
              </span>
            </h2>
            <div class="reservation-info">
              <div class="info-item">
                <label>Check-in</label>
                <span class="checkin-date">{{
                  new Date(getBookingInformation.checkInDate)
                    .toString()
                    .split(' ')
                    .splice(0, 4)
                    .join(' ')
                }}</span>
              </div>
              <div class="info-item">
                <label> Check-out</label>
                <span class="checkout-date">{{
                  new Date(getBookingInformation.checkOutDate)
                    .toString()
                    .split(' ')
                    .splice(0, 4)
                    .join(' ')
                }}</span>
              </div>
              <div class="info-item">
                <label>Guest name:</label>
                <span class="guest-name">{{
                  getBookingInformation.bookerInformation.username
                }}</span>
              </div>
              <div class="info-item">
                <label>Guest info:</label>
                <span class="guest-email"
                  >Email : {{ getBookingInformation.bookerInformation.email }}</span
                >
                <span>Address : 30 08 Prudential Tower, 19 Cecil St Bangkok N/A</span>
              </div>

              <div class="info-item">
                <label>Preferred language:</label>
                <span>English UK</span>
              </div>
              <div class="info-item">
                <label>Booked rooms:</label>
                <span v-for="(room, index) in getBookingInformation.rooms" :key="index"
                  >{{ room.quantity }} x {{ room.roomInformation.room_name }}</span
                >
              </div>
              <div class="info-item">
                <label>IATA/TIDS code:</label>
                <span>PC029090</span>
              </div>
              <div class="info-item">
                <label>Booking code:</label>
                <span style="color: #005eff">{{ getBookingInformation.booking_code }}</span>
              </div>
              <div class="info-item">
                <label>Commission:</label>
                <span
                  >VND
                  {{ parseInt(getBookingInformation.totalPrice).toLocaleString('vi-VN') }}</span
                >
              </div>
              <div class="info-item">
                <label>Payment received:</label>
                <span>Thu 19 Nov 2024</span>
              </div>
              <div class="info-item">
                <label>Booked on:</label>
                <span>{{
                  new Date(getBookingInformation.bookedOn)
                    .toString()
                    .split(' ')
                    .splice(0, 4)
                    .join(' ')
                }}</span>
              </div>
              <div class="info-item">
                <label>Total guests:</label>
                <span>1</span>
              </div>
            </div>
            <div class="info-item" style="margin-top: 20px">
              <label>Total price:</label>
              <span class="price"
                >VND {{ parseInt(getBookingInformation.totalPrice).toLocaleString('vi-VN') }}</span
              >
            </div>
          </div>
          <div class="reservation-actions">
            <h4>Update this reservation</h4>
            <!-- <button class="action-btn">Change reservation dates & prices</button> -->
            <button class="action-btn" v-if="getBookingInformation.status === 'confirmed'">Mark as a no-show</button>
            <button class="action-btn" v-if="getBookingInformation.status === 'confirmed'" :disabled="doCancel" @click="doCancel = true">Request to cancel</button>
            <button class="action-btn" v-if="getBookingInformation.status === 'confirmed'">Report guest misconduct</button>
            <button class="action-btn">Print this page</button>
            <button class="action-btn" v-if="getBookingInformation.status === 'confirmed'">Report credit card fraud</button>
            <button class="action-btn" v-if="getBookingInformation.status === 'confirmed'">Report other chargeback cases</button>
            <div class="divider"></div>
            <h4 v-if="getBookingInformation.status === 'confirmed'">Payment</h4>
            <button class="payment-action-btn" v-if="getBookingInformation.status === 'confirmed'">Mark credit card as invalid</button>
            <button class="payment-action-btn" v-if="getBookingInformation.status === 'confirmed'">View credit card details</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped>
/* cancel confirmation popup */
.cancel-confirmation-popup {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
}

.popup-content {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  padding: 24px;
  width: 500px;
  max-width: 100%;
  position: relative;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.popup-header h2 {
  font-size: 24px;
  font-weight: 600;
}

.popup-body {
  margin-bottom: 24px;
}

.popup-footer {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.cancel-btn {
  background-color: #005eff;
  color: #fff;
  border: none;
  padding: 12px 16px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
}

.cancel-btn:hover {
  background-color: #003b95;
}

.close-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  cursor: pointer;
}

.close-btn i {
  font-size: 24px;
}

/* end cancel confirmation popup */

.booking-details-container {
  display: flex;
}
/* Main Content Styles */
.main-wrapper {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.main-content {
  padding: 24px;
  position: relative;
}

/* content */
.content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  /* padding: 25px; */
  background-color: #f5f5f5;
}

.reservation-details {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  padding: 24px;
  flex-grow: 1;
  margin-right: 24px;
}

.reservation-info {
  position: relative;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.info-item {
  display: flex;
  flex-direction: column;
}
.info-item label {
  font-weight: 600;
  color: #4b5563;
}
.info-item span {
  color: #374151;
}
.info-item label {
  font-weight: 600;
  color: #4b5563;
}

.info-item span {
  color: #1c1d1f;
  font-size: 16px;
}
.info-item .checkin-date {
  font-weight: bold;
  font-size: 26px;
}
.info-item .checkout-date {
  font-weight: bold;
  font-size: 26px;
}
.info-item .price {
  font-weight: bold;
  font-size: 26px;
}
.info-item .guest-name {
  font-weight: bold;
}
.info-item .guest-email {
  color: rgb(3, 115, 228);
}
.info-item .guest-phone {
  color: rgb(3, 115, 228);
}
.info-item .guest-phone:hover {
  color: rgb(3, 115, 228);
  text-decoration: underline;
  cursor: pointer;
}
.info-item .guest-email:hover {
  color: rgb(3, 115, 228);
  text-decoration: underline;
  cursor: pointer;
}

.reservation-actions {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: normal;
  gap: 16px;
  width: 350px;
}

.action-btn {
  background-color: #ffffff;
  color: #005eff;
  border-color: #005eff;
  border-radius: 4px;
  padding: 12px 16px;
  cursor: pointer;
  font-size: 12px;
  font-weight: bolder;
}

.action-btn:hover {
  background-color: #b9d3ff;
}
.payment-action-btn {
  background-color: #fff;
  color: #a5a5a5;
  border-color: #a5a5a5;
  border-radius: 4px;
  padding: 12px 16px;
  font-size: 12px;
  font-weight: bolder;
}
</style>
