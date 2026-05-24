<script>
  import CheckOut from '@/components/book/CheckOut.vue';
  import TheHeader from '@/components/Header.vue';
  import { HoldService } from '@/services/hold.service';
  import { mapGetters } from 'vuex';
  import { useToast } from 'vue-toastification';
  import { getImageUrl } from '@/utils/images';
  import { getUserSocket } from '@/services/userSocket';

  export default {
    components: {
      CheckOut,
      TheHeader,
    },
    setup() {
      // Get toast interface
      const toast = useToast();
      // Make it available inside methods
      return { toast };
    },
    data() {
      const arrivalOptions = [
        { value: 'unknown', label: "I don't know" },
        ...Array.from({ length: 24 }, (_, hour) => {
          const nextHour = (hour + 1) % 24;
          const start = `${String(hour).padStart(2, '0')}:00`;
          const end = `${String(nextHour).padStart(2, '0')}:00`;
          return { value: String(hour), label: `${start} - ${end}` };
        }),
      ];

      return {
        currentStep: 2,
        steps: [1, 2, 3],
        arrivalOptions,
        isHoldConvertedToBooking: false,
        isReleasingHold: false,
        userSocket: null,
      };
    },
    computed: {
      ...mapGetters('book', ['getBookingInfor']),
      ...mapGetters('search', ['getSearchData']),
      ...mapGetters('user', ['getUserInformation']),

      progress() {
        return ((this.currentStep - 1) / (this.steps.length - 1)) * 100;
      },
      priceSummary() {
        const price = this.getBookingInfor?.priceBreakdown || {};
        return {
          currency: price.currency || 'USD',
          subtotal: Number(price.subtotal ?? this.getBookingInfor?.totalPrice ?? 0),
          taxAmount: Number(price.taxAmount ?? 0),
          serviceFeeAmount: Number(price.serviceFeeAmount ?? 0),
          totalPrice: Number(price.totalPrice ?? this.getBookingInfor?.totalPrice ?? 0),
        };
      },
      bookingUser() {
        return this.getUserInformation || {};
      },
    },
    methods: {
      checkFormFulfillment() {
        const { full_name, email, phone_number } = this.bookingUser;
        return Boolean(full_name && email && phone_number);
      },
      async nextStep() {
        if (this.currentStep < this.steps.length) {
          if (this.checkFormFulfillment()) {
            this.currentStep++;
            window.scrollTo(0, 0);
          } else {
            this.toast.error('Bạn chưa cung cấp đầy đủ thông tin!');
          }
        }
      },
      getImageUrl,
      handleBookingCreated() {
        this.isHoldConvertedToBooking = true;
      },
      async releaseAbandonedHold() {
        const holdId = this.getBookingInfor?.holdId;

        if (!holdId || this.isHoldConvertedToBooking || this.isReleasingHold) {
          return;
        }

        this.isReleasingHold = true;

        try {
          await HoldService.releaseHold(holdId);
        } catch (error) {
          const errorCode = error.response?.data?.error?.code;
          const ignoredErrors = ['HOLD_NOT_ACTIVE', 'HOLD_NOT_FOUND'];

          if (!ignoredErrors.includes(errorCode)) {
            console.error('Failed to release abandoned hold:', error);
          }
        } finally {
          this.isReleasingHold = false;
        }
      },
      handleHoldExpired(payload) {
        const holdId = this.getBookingInfor?.holdId;

        if (!holdId || payload?.holdId !== holdId || this.isHoldConvertedToBooking) {
          return;
        }

        this.isHoldConvertedToBooking = true;
        this.toast.error('Your room hold has expired. Please select the room again.');

        this.$router.replace({
          name: 'HotelDetails',
          params: {
            hotel_id: payload.hotelId || this.getBookingInfor?.hotel?.hotel_id,
          },
        });
      },
      connectHoldExpirySocket() {
        this.userSocket = getUserSocket();
        this.userSocket.on('hold:expired', this.handleHoldExpired);
      },
    },
    mounted() {
      this.connectHoldExpirySocket();
    },
    beforeUnmount() {
      if (this.userSocket) {
        this.userSocket.off('hold:expired', this.handleHoldExpired);
      }
    },
    async beforeRouteLeave(to) {
      if (to.name === 'BookingConfirmation') {
        return true;
      }

      await this.releaseAbandonedHold();
      return true;
    },
  };
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

      <div class="hotel-info price-card">
        <h2 class="card-title">Your price summary</h2>

        <div class="price-summary">
          <div class="main-price">
            <span class="price-label">Total</span>
            <span class="price-amount">
              {{ priceSummary.currency }} {{ priceSummary.totalPrice.toLocaleString('en-US') }}
            </span>
          </div>
        </div>

        <div class="price-information">
          <div class="fee-row">
            <span class="fee-label">Room price</span>
            <span class="fee-amount">
              {{ priceSummary.currency }} {{ priceSummary.subtotal.toLocaleString('en-US') }}
            </span>
          </div>
          <div class="fee-row">
            <span class="fee-label">Taxes and charges</span>
            <span class="fee-amount">
              {{ priceSummary.currency }}
              {{ (priceSummary.taxAmount + priceSummary.serviceFeeAmount).toLocaleString('en-US') }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- right container -->
    <div class="sub_container2" v-if="currentStep == 2">
      <!--account loged in-->
      <div class="hotel-info">
        <div style="display: flex; flex-direction: row">
          <div class="signin-content" v-if="getUserInformation">
            <div class="profile-image">
              <img :src="getImageUrl(getUserInformation.profile_picture_url)" alt="Profile" />
            </div>
            <div class="text-container">
              <p class="status-text">You are signed in</p>
              <p class="email-text">{{ getUserInformation.email }}</p>
            </div>
          </div>
        </div>
      </div>
      <!--enter details-->
      <div class="hotel-info details-card">
        <h1>Check your details</h1>

        <div class="info-banner">
          <span class="info-icon">ℹ️</span>
          You can change your details in<RouterLink
            style="color: #006aff"
            :to="{ path: '/account-settings/personal-information' }"
            >settings</RouterLink
          >!
        </div>

        <form>
          <div class="two-columns">
            <div class="form-group">
              <label>Full name<span class="required">*</span></label>
              <input
                v-if="getUserInformation"
                :disabled="getUserInformation.full_name != null"
                :placeholder="getUserInformation.full_name"
                type="text"
                required
              />
              <input type="text" v-else placeholder="your full name" />
            </div>
          </div>

          <div class="form-group">
            <label>Email address <span class="required">*</span></label>
            <input
              v-if="getUserInformation"
              disabled
              :placeholder="getUserInformation.email"
              type="email"
            />
            <input type="email" placeholder="Your email" v-else />
            <div class="helper-text">Confirmation email goes to this address</div>
          </div>

          <div class="form-group">
            <label>Phone number <span class="required">*</span></label>
            <div class="phone-input">
              <select class="phone-code">
                <option selected>VN +84</option>
              </select>
              <input
                v-if="getUserInformation"
                disabled
                :placeholder="getUserInformation.phone_number"
                type="text"
                class="phone-number"
                required
              />
              <input type="text" v-else placeholder="Your phone number" class="phone-number" />
            </div>
            <div class="helper-text">Needed by the property to validate your booking</div>
          </div>
        </form>
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
            <option v-for="option in arrivalOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
          <p class="timezone-note">Time is for Hanoi time zone</p>
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
            fullName: bookingUser.full_name,
            email: bookingUser.email,
            phoneNumber: bookingUser.phone_number,
          }"
          @booking-created="handleBookingCreated"
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
    display: grid;
    grid-template-columns: minmax(280px, 340px) 1fr;
    gap: 20px;
  }

  .sub_container1 {
    display: flex;
    flex-direction: column;
  }

  .sub_container2 {
    display: flex;
    flex-direction: column;
  }

  .hotel-info {
    background: white;
    padding: 18px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    margin-bottom: 16px;
    box-shadow: none;
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

  /* booking details */
  .booking-details-container {
    background: white;
    padding: 18px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    margin-bottom: 16px;
    box-shadow: none;
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
    font-size: 22px;
    margin: 0 0 18px;
    color: #1a1a1a;
  }

  .info-banner {
    background-color: #f5f8ff;
    border: 1px solid #dbeafe;
    border-radius: 8px;
    padding: 14px;
    margin-bottom: 20px;
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
    box-sizing: border-box;
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
    min-width: 0;
  }

  .checkbox-item {
    display: flex;
    align-items: center;
    margin-bottom: 12px;
    gap: 8px;
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
    background-color: #f5f8ff;
    padding: 16px;
    margin-bottom: 16px;
    border-radius: 8px;
  }

  .main-price {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 16px;
  }

  .price-label {
    font-size: 20px;
    font-weight: 600;
    color: #1a1a1a;
  }

  .price-amount {
    font-size: 22px;
    font-weight: 600;
    color: #1a1a1a;
    text-align: right;
  }

  .price-information {
    border-top: 1px solid #e5e7eb;
    padding-top: 14px;
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
    text-align: right;
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

  textarea {
    width: 100%;
    box-sizing: border-box;
    min-height: 120px;
    padding: 12px;
    border: 1px solid #ddd;
    border-radius: 8px;
    font-size: 16px;
    margin-bottom: 16px;
    resize: vertical;
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

  @media (max-width: 900px) {
    .container {
      grid-template-columns: 1fr;
    }

    .two-columns {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 560px) {
    .step-circle {
      width: 34px;
      height: 34px;
    }

    .progress-line,
    .progress-line-active {
      top: 17px;
    }

    .container {
      padding: 12px;
    }

    .dates,
    .phone-input,
    .main-price,
    .fee-row {
      flex-direction: column;
      gap: 8px;
    }

    .price-amount,
    .fee-amount {
      text-align: left;
    }

    .phone-code {
      width: 100%;
    }

    .next-button {
      max-width: none;
    }
  }
</style>
