<script>
  import CheckOut from '@/components/book/CheckOut.vue';
  import TheHeader from '@/components/Header.vue';
  import TheFooter from '@/components/Footer.vue';
  import { HoldService } from '@/services/hold.service';
  import { mapGetters } from 'vuex';
  import { getUserSocket } from '@/services/userSocket';
  import { stayNights, formatStayDate } from '@/utils/stay';
  import { guestMoney } from '@/utils/guestPresentation';

  export default {
    components: { CheckOut, TheHeader, TheFooter },
    data() {
      return {
        currentStep: 1,
        fullName: '',
        email: '',
        phoneNumber: '',
        userSocket: null,
        timer: null,
        now: Date.now(),
        isHoldConvertedToBooking: false,
        isReleasingHold: false,
        paymentBusy: false,
        expiredByEvent: false,
      };
    },
    computed: {
      ...mapGetters('book', ['getBookingInfor']),
      ...mapGetters('user', ['getUserInformation']),
      nights() {
        return stayNights(this.getBookingInfor?.checkInDate, this.getBookingInfor?.checkOutDate);
      },
      holdExpired() {
        if (this.expiredByEvent) return true;
        const end = Date.parse(this.getBookingInfor?.hold?.expiresAt);
        return !this.isHoldConvertedToBooking && Number.isFinite(end) && end <= this.now;
      },
      priceSummary() {
        const b = this.getBookingInfor;
        const p = b?.priceBreakdown || {};
        return {
          currency: p.currency || 'USD',
          subtotal: p.subtotal,
          tax: p.taxAmount,
          fee: p.serviceFeeAmount,
          total: p.totalPrice ?? b?.totalPrice,
        };
      },
      policyRooms() {
        return this.getBookingInfor?.cancellationPolicy?.rooms || [];
      },
      created() {
        return Boolean(this.getBookingInfor?.checkoutBooking);
      },
    },
    watch: {
      getUserInformation: {
        immediate: true,
        handler(user) {
          if (!user) return;
          this.fullName ||= user.full_name || '';
          this.email ||= user.email || '';
          this.phoneNumber ||= user.phone_number || '';
        },
      },
    },
    mounted() {
      const contact = this.getBookingInfor?.checkoutGuestDetails;
      if (contact) {
        this.fullName = contact.fullName;
        this.email = contact.email;
        this.phoneNumber = contact.phoneNumber;
      }
      this.isHoldConvertedToBooking = this.created;
      this.timer = setInterval(() => {
        this.now = Date.now();
      }, 1000);
      if (this.getBookingInfor?.holdId) this.connectHoldExpirySocket();
    },
    beforeUnmount() {
      clearInterval(this.timer);
      this.timer = null;
      this.userSocket?.off('hold:expired', this.handleHoldExpired);
    },
    async beforeRouteLeave(to) {
      if (this.paymentBusy) return false;
      if (to.name !== 'BookingConfirmation') await this.releaseAbandonedHold();
      return true;
    },
    methods: {
      guestMoney,
      formatStayDate,
      nextStep() {
        if (this.holdExpired) return;
        this.currentStep = 2;
        this.$nextTick(() => this.$refs.paymentHeading?.focus());
      },
      handleBookingCreated() {
        this.isHoldConvertedToBooking = true;
      },
      async releaseAbandonedHold() {
        const id = this.getBookingInfor?.holdId;
        if (!id || this.isHoldConvertedToBooking || this.created || this.isReleasingHold) return;
        this.isReleasingHold = true;
        try {
          await HoldService.releaseHold(id);
        } catch (error) {
          if (!['HOLD_NOT_ACTIVE', 'HOLD_NOT_FOUND'].includes(error.response?.data?.error?.code))
            console.error('Could not release hold', error);
        } finally {
          this.isReleasingHold = false;
        }
      },
      handleHoldExpired(payload) {
        if (payload?.holdId === this.getBookingInfor?.holdId && !this.isHoldConvertedToBooking)
          this.expiredByEvent = true;
      },
      async connectHoldExpirySocket() {
        try {
          const socket = await getUserSocket();
          if (!this.timer) return;
          this.userSocket = socket;
          socket.on('hold:expired', this.handleHoldExpired);
        } catch {
          /* The local expiry clock still provides recovery if sockets are unavailable. */
        }
      },
    },
  };
</script>
<template>
  <TheHeader :is-search-open="false" />
  <main id="guest-main" tabindex="-1" class="guest-page">
    <section v-if="!getBookingInfor || !nights" class="guest-section">
      <h1 class="guest-page-title">{{ $t('guest.chooseStay') }}</h1>
      <RouterLink class="guest-button" to="/">{{ $t('guest.page.search') }}</RouterLink>
    </section>
    <template v-else>
      <div class="checkout-heading">
        <p class="guest-subtitle">
          {{ $t('bookingFlow.stepOf', { step: currentStep, total: 2 }) }}
        </p>
        <h1 class="guest-page-title">{{ $t('guest.page.checkout') }}</h1>
      </div>
      <section v-if="holdExpired" role="alert" class="guest-section checkout-expired">
        <h2>{{ $t('bookingFlow.holdExpired') }}</h2>
        <RouterLink class="guest-button" :to="`/hotels/${getBookingInfor.hotel.hotel_id}`">{{
          $t('bookingFlow.changeSelection')
        }}</RouterLink>
      </section>
      <div v-else class="checkout-grid">
        <div class="checkout-body">
          <section v-if="currentStep === 1" class="guest-section">
            <h2>{{ $t('bookingFlow.checkYourDetails') }}</h2>
            <p class="guest-subtitle">{{ $t('bookingFlow.confirmationEmailNote') }}</p>
            <form class="guest-form" @submit.prevent="nextStep">
              <label for="checkout-name"
                >{{ $t('bookingFlow.fullName')
                }}<input
                  id="checkout-name"
                  v-model.trim="fullName"
                  name="name"
                  autocomplete="name"
                  required
                  maxlength="100"
                  :readonly="created"
              /></label>
              <label for="checkout-email"
                >{{ $t('bookingFlow.emailAddress')
                }}<input
                  id="checkout-email"
                  v-model.trim="email"
                  name="email"
                  type="email"
                  autocomplete="email"
                  required
                  maxlength="254"
                  :readonly="created"
              /></label>
              <label for="checkout-phone"
                >{{ $t('bookingFlow.phoneNumber')
                }}<input
                  id="checkout-phone"
                  v-model.trim="phoneNumber"
                  name="tel"
                  type="tel"
                  autocomplete="tel"
                  pattern="[+]?[0-9\s\(\)\-]{7,20}"
                  :title="$t('guest.checkout.phoneHint')"
                  required
                  :readonly="created"
              /></label>
              <p class="guest-subtitle">{{ $t('guest.checkout.phoneHint') }}</p>
              <button class="guest-button" type="submit">
                {{ $t('bookingFlow.nextFinalDetails') }}
              </button>
            </form>
          </section>
          <section v-else class="guest-section">
            <h2 ref="paymentHeading" tabindex="-1">{{ $t('bookingFlow.howToPay') }}</h2>
            <p class="checkout-contact">{{ fullName }} · {{ email }} · {{ phoneNumber }}</p>
            <button
              v-if="!created"
              type="button"
              class="checkout-edit"
              :disabled="paymentBusy"
              @click="currentStep = 1"
            >
              {{ $t('guest.checkout.editDetails') }}
            </button>
            <CheckOut
              :booking-infor="getBookingInfor"
              :search-data="{
                checkInDate: getBookingInfor.checkInDate,
                checkOutDate: getBookingInfor.checkOutDate,
              }"
              :user-infor="{ fullName, email, phoneNumber }"
              @booking-created="handleBookingCreated"
              @busy="paymentBusy = $event"
            />
          </section>
          <section class="guest-section">
            <h2>{{ $t('bookingFlow.cancellationPolicy') }}</h2>
            <p v-if="!policyRooms.length" class="guest-subtitle">
              {{ $t('bookingFlow.policyEmpty') }}
            </p>
            <ul v-else class="checkout-policy">
              <li v-for="rule in policyRooms" :key="rule.roomId">
                <strong>{{
                  rule.isRefundable ? $t('bookingFlow.refundable') : $t('bookingFlow.nonRefundable')
                }}</strong>
                <p v-if="rule.freeCancellationUntilHoursBeforeCheckin != null">
                  {{
                    $t('bookingFlow.freeCancellationUntil', {
                      hours: rule.freeCancellationUntilHoursBeforeCheckin,
                    })
                  }}
                </p>
                <p v-if="rule.refundPercentBeforeDeadline != null">
                  {{
                    $t('guest.checkout.refundBefore', { percent: rule.refundPercentBeforeDeadline })
                  }}
                </p>
                <p v-if="rule.refundPercentAfterDeadline != null">
                  {{
                    $t('guest.checkout.refundAfter', { percent: rule.refundPercentAfterDeadline })
                  }}
                </p>
              </li>
            </ul>
          </section>
        </div>
        <aside class="guest-section checkout-summary">
          <h2>{{ getBookingInfor.hotel.name }}</h2>
          <p class="guest-subtitle">{{ getBookingInfor.hotel.address }}</p>
          <dl class="checkout-facts">
            <div>
              <dt>{{ $t('bookingFlow.checkIn') }}</dt>
              <dd>{{ formatStayDate(getBookingInfor.checkInDate, $i18n.locale) }}</dd>
            </div>
            <div>
              <dt>{{ $t('bookingFlow.checkOut') }}</dt>
              <dd>{{ formatStayDate(getBookingInfor.checkOutDate, $i18n.locale) }}</dd>
            </div>
          </dl>
          <p>
            {{ $t('bookingFlow.nightPlural', { count: nights }) }} ·
            {{ $t('hotelDetails.table.guests') }}: {{ getBookingInfor.numberOfGuests }}
          </p>
          <ul>
            <li v-for="room in getBookingInfor.selectedRooms" :key="room.room_id">
              {{ room.roomName }} × {{ room.roomQuantity }}
            </li>
          </ul>
          <hr />
          <h3>{{ $t('bookingFlow.priceSummary') }}</h3>
          <dl class="checkout-prices">
            <div v-if="priceSummary.subtotal != null">
              <dt>{{ $t('bookingFlow.roomPrice') }}</dt>
              <dd>{{ guestMoney(priceSummary.subtotal, priceSummary.currency, $i18n.locale) }}</dd>
            </div>
            <div v-if="priceSummary.tax != null">
              <dt>{{ $t('bookingFlow.taxesAndCharges') }}</dt>
              <dd>
                {{
                  guestMoney(
                    Number(priceSummary.tax) + Number(priceSummary.fee || 0),
                    priceSummary.currency,
                    $i18n.locale
                  )
                }}
              </dd>
            </div>
            <div class="checkout-total">
              <dt>{{ $t('bookingFlow.total') }}</dt>
              <dd>{{ guestMoney(priceSummary.total, priceSummary.currency, $i18n.locale) }}</dd>
            </div>
          </dl>
          <p class="guest-subtitle">{{ $t('guest.checkout.quoteNote') }}</p>
        </aside>
      </div>
    </template>
  </main>
  <TheFooter />
</template>
<style scoped>
  .checkout-heading {
    margin-bottom: 24px;
  }
  .checkout-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
    gap: 24px;
    align-items: start;
  }
  .checkout-body {
    display: grid;
    gap: 24px;
  }
  .checkout-summary {
    position: sticky;
    top: 24px;
  }
  .checkout-facts {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin: 24px 0;
  }
  .checkout-facts dt {
    font-size: 12px;
    color: var(--tn-muted);
  }
  dd {
    margin: 0;
  }
  .checkout-prices > div {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    margin: 16px 0;
  }
  .checkout-total {
    color: var(--tn-brand);
    font-size: 22px;
    font-weight: 500;
  }
  .checkout-contact {
    overflow-wrap: anywhere;
    font-size: 14px;
  }
  .checkout-edit {
    background: none;
    border: 0;
    color: var(--tn-action);
    padding: 8px 0;
    cursor: pointer;
    text-decoration: underline;
  }
  .checkout-policy {
    padding-left: 20px;
    font-size: 14px;
  }
  .checkout-policy p {
    margin: 4px 0;
  }
  .checkout-summary ul {
    padding-left: 20px;
    font-size: 14px;
  }
  .checkout-expired {
    margin-top: 24px;
  }
  @media (max-width: 767px) {
    .checkout-grid {
      grid-template-columns: minmax(0, 1fr);
    }
    .checkout-summary {
      position: static;
      grid-row: 1;
    }
    .checkout-total {
      font-size: 20px;
    }
  }
</style>
