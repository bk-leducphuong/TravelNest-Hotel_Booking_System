<script>
  import CheckOut from '@/components/book/CheckOut.vue';
  import TheHeader from '@/components/Header.vue';
  import TheFooter from '@/components/Footer.vue';
  import { HoldService } from '@/services/hold.service';
  import { PromotionService } from '@/services/promotion.service';
  import { mapGetters } from 'vuex';
  import { getUserSocket } from '@/services/userSocket';
  import { stayNights, formatStayDate } from '@/utils/stay';
  import { guestMoney, promotionBadgeDescriptor, promotionDisplayName } from '@/utils/guestPresentation';

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
        promoCode: '',
        promoBusy: false,
        promoError: '',
        promoNotice: '',
        currentQuote: null,
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
      hasAppliedCode() {
        return Boolean(
          this.getBookingInfor?.promotionCode ||
            (this.priceSummary.promotion?.mode === 'code' && this.priceSummary.promotion?.code)
        );
      },
      priceSummary() {
        const b = this.getBookingInfor;
        const p = this.currentQuote || b?.priceBreakdown || {};
        return {
          currency: p.currency || 'USD',
          subtotal: p.subtotal,
          discount: p.discountAmount,
          discountedSubtotal: p.discountedSubtotal,
          tax: p.taxAmount,
          fee: p.serviceFeeAmount,
          total: p.totalPrice ?? b?.totalPrice,
          promotion: p.promotion || b?.promotion || null,
          codeOutcome: p.codeOutcome || b?.codeOutcome || null,
          priceFingerprint: p.priceFingerprint || b?.pricingFingerprint || null,
        };
      },
      policyRooms() {
        return this.getBookingInfor?.cancellationPolicy?.rooms || [];
      },
      payAtProperty() {
        return this.getBookingInfor?.paymentPolicy?.mode === 'pay_at_property';
      },
      paymentDueAt() {
        return (
          this.getBookingInfor?.paymentPolicy?.checkInAt ||
          this.getBookingInfor?.paymentDueAt ||
          null
        );
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
      this.currentQuote = this.getBookingInfor?.priceBreakdown || null;
      this.promoCode = this.getBookingInfor?.promotionCode || this.getBookingInfor?.promotion?.code || '';
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
      promotionLabel(promotion) {
        const name = promotionDisplayName(promotion);
        if (name) return name;
        const descriptor = promotionBadgeDescriptor(promotion);
        return this.$t(descriptor.key, descriptor.params);
      },
      applyQuote(data) {
        this.currentQuote = data?.priceBreakdown || null;
        this.$store.dispatch('book/booking', {
          ...this.getBookingInfor,
          totalPrice: data?.totalPrice ?? this.getBookingInfor.totalPrice,
          priceBreakdown: data?.priceBreakdown || this.getBookingInfor.priceBreakdown,
          pricingFingerprint: data?.priceFingerprint || this.getBookingInfor.pricingFingerprint,
          promotion: data?.promotion || null,
          promotionCode: this.promoCode.trim() || null,
        });
      },
      async applyPromoCode() {
        if (this.promoBusy || !this.getBookingInfor?.holdId) return;
        this.promoBusy = true;
        this.promoError = '';
        this.promoNotice = '';
        try {
          const response = await PromotionService.preview({
            holdId: this.getBookingInfor.holdId,
            code: this.promoCode.trim() || null,
          });
          const data = response.data;
          this.applyQuote(data);
          if (data.codeOutcome?.status === 'automatic_better') {
            this.promoNotice = this.$t('guest.checkout.saleIsBetter');
          } else if (!data.promotion) {
            this.promoNotice = this.$t('guest.checkout.noPromotion');
          } else {
            this.promoNotice = this.$t('guest.checkout.promotionApplied', {
              name: this.promotionLabel(data.promotion),
            });
          }
        } catch (error) {
          const apiError = error.response?.data?.error;
          const keyByCode = {
            PROMOTION_NOT_AVAILABLE: 'guest.checkout.errors.notAvailable',
            PROMOTION_NOT_ELIGIBLE: 'guest.checkout.errors.notEligible',
            PROMOTION_LIMIT_REACHED: 'guest.checkout.errors.limitReached',
            PROMOTION_USER_LIMIT_REACHED: 'guest.checkout.errors.userLimitReached',
            PRICE_CHANGED: 'guest.checkout.priceChanged',
          };
          const key = keyByCode[apiError?.code];
          this.promoError = key
            ? this.$t(key)
            : apiError?.message || this.$t('guest.loadFailed');
        } finally {
          this.promoBusy = false;
        }
      },
      async removePromoCode() {
        if (this.promoBusy) return;
        this.promoCode = '';
        await this.applyPromoCode();
      },
      handlePriceChanged(quote) {
        if (quote) this.applyQuote({ priceBreakdown: quote, totalPrice: quote.totalPrice, priceFingerprint: quote.priceFingerprint, promotion: quote.promotion });
        this.promoNotice = this.$t('guest.checkout.priceChanged');
      },
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
              @price-changed="handlePriceChanged"
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
          <form class="promo-form" @submit.prevent="applyPromoCode">
            <label for="checkout-promo">{{ $t('guest.checkout.promoCode') }}</label>
            <div class="promo-row">
              <input
                id="checkout-promo"
                v-model.trim="promoCode"
                name="promoCode"
                autocomplete="off"
                maxlength="64"
                :placeholder="$t('guest.checkout.promoPlaceholder')"
                :disabled="promoBusy || created"
              />
              <button
                type="submit"
                class="guest-button"
                :disabled="promoBusy || created || !promoCode.trim()"
              >
                {{ $t('guest.checkout.applyCode') }}
              </button>
              <button
                v-if="hasAppliedCode"
                type="button"
                class="guest-button guest-button-secondary"
                :disabled="promoBusy || created"
                @click="removePromoCode"
              >
                {{ $t('guest.checkout.removeCode') }}
              </button>
            </div>
            <p v-if="promoBusy" role="status" class="guest-subtitle">
              {{ $t('guest.loading') }}
            </p>
            <p v-if="promoError" role="alert" class="promo-error">{{ promoError }}</p>
            <p v-if="promoNotice" role="status" class="guest-subtitle">{{ promoNotice }}</p>
          </form>
          <h3>{{ $t('bookingFlow.priceSummary') }}</h3>
          <p v-if="priceSummary.promotion" class="checkout-promotion">
            <span class="guest-pill">{{ $t('guest.checkout.saleBadge') }}</span>
            {{ promotionLabel(priceSummary.promotion) }}
          </p>
          <dl class="checkout-prices">
            <div v-if="priceSummary.subtotal != null">
              <dt>{{ $t('bookingFlow.roomPrice') }}</dt>
              <dd>{{ guestMoney(priceSummary.subtotal, priceSummary.currency, $i18n.locale) }}</dd>
            </div>
            <div v-if="Number(priceSummary.discount) > 0" class="checkout-discount">
              <dt>{{ $t('guest.checkout.discount', { name: promotionLabel(priceSummary.promotion) }) }}</dt>
              <dd>
                −{{ guestMoney(priceSummary.discount, priceSummary.currency, $i18n.locale) }}
              </dd>
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
          <p v-if="payAtProperty" class="checkout-pay-at-property" role="note">
            <strong>{{ $t('bookingFlow.payAtPropertyNotice') }}</strong>
            <span v-if="paymentDueAt">
              {{
                $t('bookingFlow.paymentDueOnArrival', {
                  date: formatStayDate(paymentDueAt, $i18n.locale),
                })
              }}
            </span>
          </p>
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
  .checkout-pay-at-property {
    display: grid;
    gap: 4px;
    padding: 12px;
    border: 1px solid var(--tn-border);
    border-radius: 10px;
    background: #f2f8f2;
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
  .checkout-discount dd {
    color: #1c7c54;
    font-weight: 500;
  }
  .checkout-promotion {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
  }
  .promo-form {
    margin: 20px 0;
  }
  .promo-form label {
    display: block;
    margin-bottom: 8px;
    font-size: 14px;
    font-weight: 500;
  }
  .promo-row {
    display: flex;
    gap: 8px;
  }
  .promo-row input {
    flex: 1;
    min-width: 0;
    padding: 10px 12px;
    border: 1px solid var(--tn-border);
    border-radius: 8px;
    font: inherit;
  }
  .promo-row .guest-button {
    width: auto;
    padding-inline: 16px;
  }
  .promo-error {
    color: #b3261e;
    font-size: 14px;
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
