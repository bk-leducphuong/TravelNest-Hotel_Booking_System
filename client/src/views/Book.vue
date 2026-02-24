<script>
import CheckOut from '@/components/book/CheckOut.vue'
import TheHeader from '@/components/Header.vue'
import { mapActions, mapGetters, mapState } from 'vuex'
import { useToast } from 'vue-toastification'

export default {
  components: {
    CheckOut,
    TheHeader,
  },
  setup() {
    // Get toast interface
    const toast = useToast()
    // Make it available inside methods
    return { toast }
  },
  data() {
    return {
      currentStep: 2,
      steps: [1, 2, 3],
    }
  },
  computed: {
    ...mapGetters('book', ['getBookingInfor']),
    ...mapGetters('search', ['getSearchData']),
    ...mapGetters('user', ['getUserInformation']),

    progress() {
      return ((this.currentStep - 1) / (this.steps.length - 1)) * 100
    }
  },
  methods: {
    ...mapActions('book', ['checkRoomAvailability']),
    checkFormFulfillment() {
      if (this.getUserInformation.full_name && this.getUserInformation.email && this.getUserInformation.phone_number) {
        return true
      } else {
        return false
      }
    },
    async nextStep() {
      if (this.currentStep < this.steps.length) {
        if (this.checkFormFulfillment()) {
          //TODO: check whether this room is available or not
          // if not available, redirect back to the room selection page
          const isAvailable = await this.checkRoomAvailability()
          if (!isAvailable) {
            this.toast.error('Phòng đã được đặt hết, vui lòng chọn phòng khác!')
            this.$router.replace({
              path: '/hotels',
              params: { hotel_id: this.getBookingInfor.hotel.hotel_id }
            })
            return
          } else {
            // if available, book the room
            this.currentStep++
            window.scrollTo(0, 0)
          }
        } else {
          this.toast.error('Bạn chưa cung cấp đầy đủ thông tin!')
        }
      }
    }
  },
  
}
</script>
<template>
  <TheHeader :isSearchOpen="false" />
  <!-- progress bar -->
  <div class="stepper-wrapper">
    <div class="stepper">
      <div class="progress-line"></div>
      <div class="progress-line-active" :style="{ width: progress + '%' }"></div>
      <!-- Render steps dynamically based on step count -->
      <div
        v-for="(step, index) in steps"
        :key="step"
        :class="['step', { active: step <= currentStep }]"
      >
        <div class="step-circle">{{ index + 1 }}</div>
      </div>
    </div>
  </div>
  <!-- end progress bar -->

  <div class="container">
    <!-- left container -->
    <div class="sub_container1">
      <div class="hotel-info">
        <div class="hotel-name">{{ getBookingInfor.hotel.name }}</div>
        <div class="hotel-address">{{ getBookingInfor.hotel.address }}</div>
        <div class="rating">
          <span class="rating-score">{{ getBookingInfor.hotel.overall_rating }}</span>
          <span>Great location</span>
        </div>
      </div>

      <div class="booking-details-container">
        <h3 style="font-size: 20px">Chi tiết đặt phòng của bạn</h3>
        <div class="dates">
          <div class="date-box">
            <strong>Nhận phòng</strong>
            <div>{{ getSearchData.checkInDate }}</div>
            <div>Từ {{ getBookingInfor.hotel.check_in_time }}</div>
          </div>
          <div class="date-box">
            <strong>Trả phòng</strong>
            <div>{{ getSearchData.checkOutDate }}</div>
            <div>Đến {{ getBookingInfor.hotel.check_out_time }}</div>
          </div>
        </div>
        <div>Tổng thời gian lưu trú: 2 đêm</div>
        <hr style="border: 1px solid #e7e7e7; margin-top: 16px" />
        <div class="room-details">
          Bạn đã chọn
          <h6>
            {{ getBookingInfor.totalRooms }} phòng cho {{ getSearchData.adults }} người lớn
            <span v-if="getSearchData.children != 0">và 1 trẻ em</span>
          </h6>
          <div v-for="(room, index) in getBookingInfor.selectedRooms" :key="index">
            {{ room.roomQuantity }} x {{ room.roomName }}
          </div>
        </div>
        <div style="margin-top: 20px">
          <span class="back-button" @click="this.$router.go(-1)">Đổi lựa chọn của bạn</span>
        </div>
      </div>

      <!-- price-->
      <div class="hotel-info">
        <h2 class="card-title">Your price summary</h2>

        <div class="price-summary">
          <div class="main-price">
            <span class="price-label">Price</span>
            <span class="price-amount"
              >VND {{ getBookingInfor.totalPrice.toLocaleString('vi-VN') }}</span
            >
          </div>
          <div class="taxes-charges">+VND 916,560 taxes and charges</div>
        </div>

        <div class="price-information">
          <h3 class="price-info-title">Price information</h3>

          <div class="exclusion-row">
            <span class="money-icon">💵</span>
            <span>Excludes VND 916,560 in taxes and charges</span>
          </div>

          <div class="fee-breakdown">
            <div class="fee-row">
              <span class="fee-label">8 % VAT</span>
              <span class="fee-amount">VND 547,200</span>
            </div>
            <div class="fee-row">
              <span class="fee-label">5.40 % Property service charge</span>
              <span class="fee-amount">VND 369,360</span>
            </div>
          </div>

          <a href="#" class="hide-details">Hide details</a>
        </div>
      </div>
      <!--cancel price-->
      <div class="hotel-info">
        <div class="hotel-name">Your payment schedule</div>
        <div class="hotel-address">
          You will be charged a prepayment of the total price at any time.
        </div>
      </div>
      <div class="hotel-info">
        <div class="hotel-name">How much will it cost to cancel?</div>
        <div class="hotel-address">If you cancel, you'll pay</div>
        <div class="hotel-address">VND 9,999,999</div>
      </div>
      <div class="hotel-info">
        <div class="hotel-name">Do you have a promo code?</div>
        <div class="hotel-address">Enter your promo code</div>
        <input type="text" value="" style="width: 92%" />
        <button
          style="
            padding-inline: 20px;
            margin-top: 20px;
            border-style: solid;
            border-color: #006aff;
            border-radius: 5px;
            background-color: white;
          "
        >
          Apply
        </button>
      </div>
    </div>

    <!-- right container -->
    <div class="sub_container2" v-if="currentStep == 2">
      <!--account loged in-->
      <div class="hotel-info">
        <div style="display: flex; flex-direction: row">
          <div class="signin-content" v-if="getUserInformation">
            <div class="profile-image">
              <img :src="getUserInformation.profile_picture_url" alt="Profile" />
            </div>
            <div class="text-container">
              <p class="status-text">You are signed in</p>
              <p class="email-text">{{ getUserInformation.email }}</p>
            </div>
          </div>
        </div>
      </div>
      <!--enter details-->
      <div class="hotel-info">
        <h1>Check your details</h1>

        <div class="info-banner">
          <span class="info-icon">ℹ️</span>
          You can change your details in<RouterLink style="color: #006aff;" :to="{path: '/account-settings/personal-information'}">settings</RouterLink>!
        </div>

        <form>
          <div class="two-columns">
            <div class="form-group">
              <label>Full name<span class="required">*</span></label>
              <input v-if="getUserInformation"  :disabled="getUserInformation.full_name != null" :placeholder="getUserInformation.full_name"  type="text" style="width: 95%" required />
              <input type="text" v-else placeholder="your full name"> 
            </div>
          </div>

          <div class="form-group">
            <label>Email address <span class="required">*</span></label>
            <input v-if="getUserInformation" disabled :placeholder="getUserInformation.email"  type="email" style="width: 96%" />
            <input type="email" placeholder="Your email" v-else>
            <div class="helper-text">Confirmation email goes to this address</div>
          </div>

          <div class="form-group">
            <label>Country/region <span class="required">*</span></label>
            <select>
              <option selected>Vietnam</option>
            </select>
          </div>

          <div class="form-group">
            <label>Phone number <span class="required">*</span></label>
            <div class="phone-input">
              <select class="phone-code">
                <option selected>VN +84</option>
              </select>
              <input v-if="getUserInformation" disabled :placeholder="getUserInformation.phone_number" type="text" class="phone-number" required />
              <input type="text" v-else placeholder="Your phone number"> 
            </div>
            <div class="helper-text">Needed by the property to validate your booking</div>
          </div>

          <div class="checkbox-group">
            <div class="checkbox-item">
              <input type="checkbox" checked />
              <label>Yes, I'd like free paperless confirmation (recommended)</label>
            </div>
            <div class="helper-text" style="margin-left: 30px">
              We'll text you a link to download our app
            </div>

            <div class="checkbox-item">
              <input type="checkbox" />
              <label>Update my account to include these new details</label>
            </div>
          </div>

          <div class="radio-group">
            <label>Who are you booking for? <span class="optional">(optional)</span></label>
            <div class="radio-item">
              <input type="radio" name="booking-for" checked />
              <label>I am the main guest</label>
            </div>
            <div class="radio-item">
              <input type="radio" name="booking-for" />
              <label>Booking is for someone else</label>
            </div>
          </div>

          <div class="radio-group">
            <label>Are you travelling for work? <span class="optional">(optional)</span></label>
            <div class="radio-item">
              <input type="radio" name="work-travel" />
              <label>Yes</label>
            </div>
            <div class="radio-item">
              <input type="radio" name="work-travel" checked />
              <label>No</label>
            </div>
          </div>
        </form>
      </div>
      <div class="hotel-info">
        <h1>Good to know:</h1>
        <div class="hotel-address">
          Stay flexible: You can cancel for free before 18:00 on 1 November 2024, so lock in this
          great price today.
          <br />
          No payment needed today. You'll pay when you stay.
        </div>
      </div>
      <div class="hotel-info">
        <h1>Special requests</h1>
        <p class="description">
          Special requests cannot be guaranteed – but the property will do its best to meet your
          needs. You can always make a special request after your booking is complete!
        </p>

        <label class="textarea-label">
          Please write your requests in English or Vietnamese.
          <span class="optional">(optional)</span>
        </label>
        <textarea></textarea>

        <div class="checkbox-item">
          <input type="checkbox" id="parking" />
          <label for="parking" class="checkbox-label"
            >I would like free private parking on site</label
          >
        </div>
      </div>
      <div class="hotel-info">
        <h1>Your arrival time</h1>
        <div class="info-row">
          <span class="icon check">✓</span>
          <span class="info-text">Your room will be ready for check-in at 14:00</span>
        </div>

        <div class="info-row">
          <span class="icon desk">👥</span>
          <span class="info-text">24-hour front desk – Help whenever you need it!</span>
        </div>

        <div class="arrival-select">
          <label class="select-label">
            Add your estimated arrival time
            <span class="optional">(optional)</span>
          </label>
          <select>
            <option selected disabled>Please select</option>
            <option value="0">I don't know</option>
            /
            <option value="1">00:00 - 01:00</option>
            /
            <option value="2">01:00 - 02:00</option>
            /
            <option value="3">02:00 - 03:00</option>
            /
            <option value="4">03:00 - 04:00</option>
            /
            <option value="5">04:00 - 05:00</option>
            /
            <option value="6">05:00 - 06:00</option>
            /
            <option value="7">06:00 - 07:00</option>
            /
            <option value="8">07:00 - 08:00</option>
            /
            <option value="9">08:00 - 09:00</option>
            /
            <option value="10">09:00 - 10:00</option>
            /
            <option value="11">10:00 - 11:00</option>
            /
            <option value="12">11:00 - 12:00</option>
            /
            <option value="13">12:00 - 13:00</option>
            /
            <option value="14">13:00 - 14:00</option>
            /
            <option value="15">14:00 - 15:00</option>
            /
            <option value="16">15:00 - 16:00</option>
            /
            <option value="17">16:00 - 17:00</option>
            /
            <option value="18">17:00 - 18:00</option>
            /
            <option value="19">18:00 - 19:00</option>
            /
            <option value="20">19:00 - 20:00</option>
            /
            <option value="21">20:00 - 21:00</option>
            /
            <option value="22">21:00 - 22:00</option>
            /
            <option value="23">22:00 - 23:00</option>
            /
            <option value="24">23:00 - 00:00</option>
            /
          </select>
          <p class="timezone-note">Time is for Hanoi time zone</p>
        </div>
      </div>

      <div class="hotel-info">
        <h1>Cots and extra beds</h1>
        <ul>
          <li class="hotel-address">Requests are subject to availability</li>
          <li class="hotel-address">Requests must be confirmed by the property</li>
          <li class="hotel-address">Requests not labelled 'Free' may incur extra charges</li>
        </ul>
        <a href="#" class="hide-details">Read full cot and extra bed policy</a>
        <label class="select-label">
          Add to your
          <span class="optional"
            >Classic Twin Room - Complimentary daily chocolate hour 5pm-6pm</span
          >
        </label>
        <div class="checkbox-item">
          <input type="checkbox" />
          <label class="checkbox-label">Cot Free</label>
        </div>
      </div>

      <div style="display: flex; justify-content: flex-end">
        <button class="next-button" @click="nextStep()">
          Next: Final details
          <span class="arrow">›</span>
        </button>
      </div>
    </div>

    <div class="sub_container2" v-if="currentStep == 3">
      <div class="hotel-info">
        <h1>How do you want to pay?</h1>
        <CheckOut
          :bookingInfor="getBookingInfor"
          :searchData="getSearchData"
          :userInfor="{
            fullName: getUserInformation.full_name,
            email: getUserInformation.email,
            phoneNumber: getUserInformation.phone_number
          }"
        />
      </div>
    </div>
  </div>
</template>
<style scoped>
/* step and process bar */
.step {
  text-align: center;
}

.step-circle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: white;
  border: 2px solid #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  transition: all 0.3s ease;
  font-weight: bold;
  color: #757575;
}

.step.active .step-circle {
  border-color: #0358d7;
  background: #0358d7;
  color: white;
}

.step.completed .step-circle {
  background: #0358d7;
  border-color: #0358d7;
  color: white;
}

.step-text {
  margin-top: 10px;
  font-size: 14px;
  color: #757575;
}

.step.active .step-text,
.step.completed .step-text {
  color: #0358d7;
}

.stepper-wrapper {
  margin: 20px auto;
  padding: 0px 20px;
  max-width: 1100px;
}

.stepper {
  display: flex;
  justify-content: space-between;
  position: relative;
  z-index: 1;
}

.progress-line {
  position: absolute;
  top: 20px;
  left: 0;
  width: 100%;
  height: 2px;
  background: #e0e0e0;
  z-index: -1;
}

.progress-line-active {
  position: absolute;
  top: 20px;
  left: 0;
  height: 2px;
  background: #0358d7;
  transition: width 0.5s ease;
  z-index: -1;
}
/* end step and progress bar */

/* main */
.container {
  padding-top: 0px !important;
  max-width: 1100px;
  margin: 0 auto;
  padding: 20px;
  display: flex;
  flex-direction: row;
}

.sub_container1 {
  display: flex;
  flex-direction: column;
  width: 30%;
}

.sub_container2 {
  display: flex;
  flex-direction: column;
  padding-left: 20px;
  width: 70%;
}

.hotel-info {
  background: white;
  padding: 20px;
  border-radius: 4px;
  margin-bottom: 20px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.hotel-name {
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 8px;
}

.hotel-address {
  color: #666;
  margin-bottom: 16px;
}

.rating {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.rating-score {
  background: #003b95;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
}

.amenities {
  display: flex;
  gap: 16px;
  color: #666;
}

/* booking details */
.booking-details-container {
  background: white;
  padding: 20px;
  border-radius: 4px;
  margin-bottom: 20px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.dates {
  display: flex;
  gap: 20px;
  margin-bottom: 16px;
}

.date-box {
  flex: 1;
}

.back-button {
  color: #006ce4;
  font-size: 16px;
  cursor: pointer;
}

/* end booking details */
.form-field label {
  display: block;
  margin-bottom: 4px;
  font-weight: 500;
}

.form-field input {
  width: 95%;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
}

.price-summary {
  background: #ebf3ff;
  padding: 20px;
  border-radius: 4px;
}

.signin-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.profile-image {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid #e5e7eb;
  overflow: hidden;
  border-style: solid;
  border-color: #d2ba11;
}

.profile-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.text-container {
  display: flex;
  flex-direction: column;
}

.status-text {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #111827;
}

.email-text {
  margin: 0;
  font-size: 16px;
  color: #6b7280;
}

h1 {
  font-size: 24px;
  margin-bottom: 20px;
  color: #1a1a1a;
}

.info-banner {
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.info-icon {
  width: 20px;
  height: 20px;
  color: #666;
}

.required {
  color: #e31c5f;
  margin-left: 4px;
}

.form-group {
  margin-bottom: 20px;
}

label {
  display: block;
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 8px;
  color: #1a1a1a;
}

.helper-text {
  font-size: 14px;
  color: #666;
  margin-top: 4px;
}

input[type='text'],
input[type='email'],
select {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
}

.phone-input {
  display: flex;
  gap: 12px;
}

.phone-code {
  width: 120px;
}

.phone-number {
  flex: 1;
}

.checkbox-group {
  margin: 20px 0;
}

.checkbox-item {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.checkbox-item input[type='checkbox'],
.radio-item input[type='radio'] {
  margin-right: 10px;
  width: 20px;
  height: 20px;
}

.radio-group {
  margin: 20px 0;
}

.radio-item {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.optional {
  color: #666;
  font-weight: normal;
  margin-left: 8px;
}

.two-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.card-title {
  font-size: 22px;
  font-weight: 600;
  margin-bottom: 20px;
  color: #1a1a1a;
}

.price-summary {
  background-color: #f8f9fa;
  padding: 20px;
  margin-bottom: 24px;
  border-radius: 8px;
}

.main-price {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 8px;
}

.price-label {
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
}

.price-amount {
  font-size: 24px;
  font-weight: 600;
  color: #1a1a1a;
}

.taxes-charges {
  text-align: right;
  color: #666;
  font-size: 14px;
}

.price-info-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
  color: #1a1a1a;
}

.exclusion-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  color: #1a1a1a;
}

.money-icon {
  width: 24px;
  height: 24px;
}

.fee-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  color: #666;
}

.fee-label {
  font-size: 15px;
}

.fee-amount {
  font-size: 15px;
}

.hide-details {
  color: #006aff;
  font-size: 15px;
  text-decoration: none;
  margin-top: 16px;
  display: inline-block;
}

.hide-details:hover {
  text-decoration: underline;
}

.next-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background-color: #0051e3;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 14px 24px;
  font-family:
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
  width: 100%;
  max-width: 200px;
}

.next-button:hover {
  background-color: #0045c4;
}

.next-button:active {
  background-color: #003aa5;
}

.arrow {
  font-size: 20px;
  margin-left: 4px;
}

.description {
  font-size: 16px;
  line-height: 1.5;
  color: #1a1a1a;
  margin-bottom: 24px;
}

.textarea-label {
  display: block;
  font-size: 16px;
  font-weight: 500;
  color: #1a1a1a;
  margin-bottom: 8px;
}

.optional {
  color: #666;
  font-weight: normal;
  margin-left: 4px;
}

textarea {
  width: 96%;
  min-height: 120px;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
  margin-bottom: 16px;
  resize: vertical;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.checkbox-item input[type='checkbox'] {
  width: 20px;
  height: 20px;
  border: 2px solid #ddd;
  border-radius: 4px;
}

.checkbox-label {
  font-size: 16px;
  color: #1a1a1a;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  color: #1a1a1a;
}

.icon {
  width: 24px;
  height: 24px;
  color: #22c55e;
}

.icon.check {
  color: #22c55e;
}

.icon.desk {
  color: #22c55e;
}

.info-text {
  font-size: 16px;
  line-height: 1.5;
}

.arrival-select {
  margin-top: 24px;
}

.select-label {
  display: block;
  font-size: 16px;
  font-weight: 500;
  color: #1a1a1a;
  margin-bottom: 8px;
}

.optional {
  color: #666;
  font-weight: normal;
  margin-left: 4px;
}

select {
  width: 100%;
  padding: 12px;
  border: 1px solid #0051e3;
  border-radius: 8px;
  font-size: 16px;
  color: #1a1a1a;
  background-color: white;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg width='24' height='24' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M6 9l6 6 6-6' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 24px;
}

.timezone-note {
  font-size: 14px;
  color: #666;
  margin-top: 8px;
}
</style>
