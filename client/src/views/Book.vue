<script>
  import CheckOut from '@/components/book/CheckOut.vue';
  import TheHeader from '@/components/Header.vue';
  import { HoldService } from '@/services/hold.service';
  import { mapGetters } from 'vuex';
  import { useToast } from 'vue-toastification';
  import { getImageUrl } from '@/utils/images';
  import { getUserSocket } from '@/services/userSocket';
  import { stayNights } from '@/utils/stay';

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
      return {
        currentStep: 2,
        steps: [1, 2, 3],
        isHoldConvertedToBooking: false,
        isReleasingHold: false,
        userSocket: null,
        phoneNumber: '',
      };
    },
    computed: {
      ...mapGetters('book', ['getBookingInfor']),
      ...mapGetters('search', ['getSearchData']),
      ...mapGetters('user', ['getUserInformation']),

      nights() { return stayNights(this.getSearchData.checkInDate, this.getSearchData.checkOutDate); },
      progress() {
        return ((this.currentStep - 1) / (this.steps.length - 1)) * 100;
      },
      arrivalOptions() {
        return [
          { value: 'unknown', label: this.$t('bookingFlow.arrivalUnknown') },
          ...Array.from({ length: 24 }, (_, hour) => {
            const nextHour = (hour + 1) % 24;
            const start = `${String(hour).padStart(2, '0')}:00`;
            const end = `${String(nextHour).padStart(2, '0')}:00`;
            return { value: String(hour), label: `${start} - ${end}` };
          }),
        ];
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
    watch: {
      // Prefill the phone number from the profile, but keep it editable so a
      // user without a saved phone can still complete checkout.
      getUserInformation: {
        immediate: true,
        handler(user) {
          if (user && user.phone_number && !this.phoneNumber) {
            this.phoneNumber = user.phone_number;
          }
        },
      },
    },
    async mounted() {
      await this.connectHoldExpirySocket();
    },
    methods: {
      checkFormFulfillment() {
        const { full_name, email } = this.bookingUser;
        const phoneNumber = this.phoneNumber || this.bookingUser.phone_number;
        return Boolean(full_name && email && phoneNumber);
      },
      async nextStep() {
        if (this.currentStep < this.steps.length) {
          if (this.checkFormFulfillment()) {
            this.currentStep++;
            window.scrollTo(0, 0);
          } else {
            this.toast.error(this.$t('bookingFlow.incompleteDetails'));
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
        this.toast.error(this.$t('bookingFlow.holdExpired'));

        this.$router.replace({
          name: 'HotelDetails',
          params: {
            hotel_id: payload.hotelId || this.getBookingInfor?.hotel?.hotel_id,
          },
        });
      },
      async connectHoldExpirySocket() {
        this.userSocket = await getUserSocket();
        this.userSocket.on('hold:expired', this.handleHoldExpired);
      },
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
  <TheHeader :is-search-open="false" />
  <main v-if="getBookingInfor" id="guest-main" tabindex="-1">
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
          <span>{{ $t('bookingFlow.greatLocation') }}</span>
        </div>
      </div>

      <div class="booking-details-container">
        <h3 style="font-size: 20px">{{ $t('bookingFlow.yourBookingDetails') }}</h3>
        <div class="dates">
          <div class="date-box">
            <strong>{{ $t('bookingFlow.checkIn') }}</strong>
            <div>{{ getSearchData.checkInDate }}</div>
            <div>{{ $t('bookingFlow.fromTime', { time: getBookingInfor.hotel.check_in_time }) }}</div>
          </div>
          <div class="date-box">
            <strong>{{ $t('bookingFlow.checkOut') }}</strong>
            <div>{{ getSearchData.checkOutDate }}</div>
            <div>{{ $t('bookingFlow.toTime', { time: getBookingInfor.hotel.check_out_time }) }}</div>
          </div>
        </div>
        <div>{{ $t('bookingFlow.totalStay', { nights: nights }) }}</div>
        <hr style="border: 1px solid #e7e7e7; margin-top: 16px" />
        <div class="room-details">
          {{ $t('bookingFlow.youSelected') }}
          <h6>
            {{ $t('bookingFlow.roomsForAdults', { rooms: getBookingInfor.totalRooms, adults: getSearchData.adults }) }}
            <span v-if="getSearchData.children != 0">{{ $t('bookingFlow.andOneChild') }}</span>
          </h6>
          <div v-for="(room, index) in getBookingInfor.selectedRooms" :key="index">
            {{ room.roomQuantity }} x {{ room.roomName }}
          </div>
        </div>
        <div style="margin-top: 20px">
          <span class="back-button" @click="$router.go(-1)">{{ $t('bookingFlow.changeSelection') }}</span>
        </div>
      </div>

      <div class="hotel-info price-card">
        <h2 class="card-title">{{ $t('bookingFlow.priceSummary') }}</h2>

        <div class="price-summary">
          <div class="main-price">
            <span class="price-label">{{ $t('bookingFlow.total') }}</span>
            <span class="price-amount">
              {{ priceSummary.currency }} {{ priceSummary.totalPrice.toLocaleString('en-US') }}
            </span>
          </div>
        </div>

        <div class="price-information">
          <div class="fee-row">
            <span class="fee-label">{{ $t('bookingFlow.roomPrice') }}</span>
            <span class="fee-amount">
              {{ priceSummary.currency }} {{ priceSummary.subtotal.toLocaleString('en-US') }}
            </span>
          </div>
          <div class="fee-row">
            <span class="fee-label">{{ $t('bookingFlow.taxesAndCharges') }}</span>
            <span class="fee-amount">
              {{ priceSummary.currency }}
              {{ (priceSummary.taxAmount + priceSummary.serviceFeeAmount).toLocaleString('en-US') }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- right container -->
    <div v-if="currentStep == 2" class="sub_container2">
      <!--account loged in-->
      <div class="hotel-info">
        <div style="display: flex; flex-direction: row">
          <div v-if="getUserInformation" class="signin-content">
            <div class="profile-image">
              <img :src="getImageUrl(getUserInformation.profile_picture_url)" alt="Profile" />
            </div>
            <div class="text-container">
              <p class="status-text">{{ $t('bookingFlow.signedIn') }}</p>
              <p class="email-text">{{ getUserInformation.email }}</p>
            </div>
          </div>
        </div>
      </div>
      <!--enter details-->
      <div class="hotel-info details-card">
        <h1>{{ $t('bookingFlow.checkYourDetails') }}</h1>

        <div class="info-banner">
          <span class="info-icon">ℹ️</span>
          {{ $t('bookingFlow.changeDetailsPrefix') }}<RouterLink
            style="color: #006aff"
            :to="{ path: '/account-settings/personal-information' }"
            >{{ $t('bookingFlow.settings') }}</RouterLink
          >!
        </div>

        <form>
          <div class="two-columns">
            <div class="form-group">
              <label>{{ $t('bookingFlow.fullName') }}<span class="required">*</span></label>
              <input
                v-if="getUserInformation"
                :disabled="getUserInformation.full_name != null"
                :placeholder="getUserInformation.full_name"
                type="text"
                required
              />
              <input v-else type="text" :placeholder="$t('bookingFlow.fullNamePlaceholder')" />
            </div>
          </div>

          <div class="form-group">
            <label>{{ $t('bookingFlow.emailAddress') }} <span class="required">*</span></label>
            <input
              v-if="getUserInformation"
              disabled
              :placeholder="getUserInformation.email"
              type="email"
            />
            <input v-else type="email" :placeholder="$t('bookingFlow.emailPlaceholder')" />
            <div class="helper-text">{{ $t('bookingFlow.confirmationEmailNote') }}</div>
          </div>

          <div class="form-group">
            <label>{{ $t('bookingFlow.phoneNumber') }} <span class="required">*</span></label>
            <div class="phone-input">
              <select class="phone-code" :aria-label="$t('guest.phoneCode')">
                <option selected>VN +84</option>
              </select>
              <input
                v-model="phoneNumber"
                type="tel"
                :placeholder="$t('bookingFlow.phonePlaceholder')"
                class="phone-number"
                required
              />
            </div>
            <div class="helper-text">{{ $t('bookingFlow.phoneNote') }}</div>
          </div>
        </form>
      </div>
      <div class="hotel-info">
        <h1>{{ $t('bookingFlow.specialRequests') }}</h1>
        <p class="description">
          {{ $t('bookingFlow.specialRequestsDesc') }}
        </p>

        <label class="textarea-label">
          {{ $t('bookingFlow.specialRequestsHint') }}
          <span class="optional">{{ $t('bookingFlow.optional') }}</span>
        </label>
        <textarea :aria-label="$t('guest.specialRequests')"></textarea>

        <div class="checkbox-item">
          <input id="parking" type="checkbox" />
          <label for="parking" class="checkbox-label"
            >{{ $t('bookingFlow.freeParking') }}</label
          >
        </div>
      </div>
      <div class="hotel-info">
        <h1>{{ $t('bookingFlow.arrivalTime') }}</h1>
        <div class="info-row">
          <span class="icon check">✓</span>
          <span class="info-text">{{ $t('bookingFlow.roomReady') }}</span>
        </div>

        <div class="info-row">
          <span class="icon desk">👥</span>
          <span class="info-text">{{ $t('bookingFlow.frontDesk') }}</span>
        </div>

        <div class="arrival-select">
          <label class="select-label">
            {{ $t('bookingFlow.addArrivalTime') }}
            <span class="optional">{{ $t('bookingFlow.optional') }}</span>
          </label>
          <select :aria-label="$t('guest.arrivalTime')">
            <option selected disabled>{{ $t('bookingFlow.pleaseSelect') }}</option>
            <option v-for="option in arrivalOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
          <p class="timezone-note">{{ $t('bookingFlow.timezoneNote') }}</p>
        </div>
      </div>

      <div style="display: flex; justify-content: flex-end">
        <button class="next-button" @click="nextStep()">
          {{ $t('bookingFlow.nextFinalDetails') }}
          <span class="arrow">›</span>
        </button>
      </div>
    </div>

    <div v-if="currentStep == 3" class="sub_container2">
      <div class="hotel-info">
        <h1>{{ $t('bookingFlow.howToPay') }}</h1>
        <CheckOut
          :booking-infor="getBookingInfor"
          :search-data="getSearchData"
          :user-infor="{
            fullName: bookingUser.full_name,
            email: bookingUser.email,
            phoneNumber: phoneNumber || bookingUser.phone_number,
          }"
          @booking-created="handleBookingCreated"
        />
      </div>
    </div>
  </div>
  </main>
  <main v-else id="guest-main" tabindex="-1" class="guest-page"><section class="guest-section"><h1 class="guest-page-title">{{ $t('guest.chooseStay') }}</h1><RouterLink class="guest-button" to="/">{{ $t('guest.page.search') }}</RouterLink></section></main>
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
