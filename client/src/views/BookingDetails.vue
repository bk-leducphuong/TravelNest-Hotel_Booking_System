<script>
import Footer from '@/components/Footer.vue';
import Header from '@/components/Header.vue'
import { mapGetters } from 'vuex';
import { getFirstImageUrl } from '@/utils/images'
export default {
  components: {
    Header,
    Footer
  },
  data() {
    return {
      bookingCode: this.$route.params.bookingCode
    }
  },
  computed: {
    ...mapGetters('booking', ['getBookingInformation']),
    ...mapGetters('user', ['getUserInformation']),
    isCancellable() {
      return ['pending_payment', 'confirmed', 'payment_failed', 'checked_in'].includes(
        this.getBookingInformation?.status
      )
    }
  },
  methods: {
    getFirstImageUrl,
    // Localized label for a booking status enum.
    statusLabel(status) {
      if (!status) return ''
      const key = `bookingStatus.${status}`
      const label = this.$t(key)
      return label === key ? status.replace(/_/g, ' ') : label
    }
  }
}
</script>
<template>
  <Header :isSearchOpen="false" />
  <div class="confirmation-container" v-if="getBookingInformation.status === 'confirmed'">
    <h1 class="greeting">{{ $t('bookingFlow.thanksUser', { name: getUserInformation.username }) }}</h1>
    <h2 class="confirmation-title">{{ $t('bookingFlow.bookingConfirmedIn', { hotel: getBookingInformation.hotel.name }) }}</h2>
    <ul class="details-list">
      <li>
        <span class="icon">✔</span> {{ $t('bookingFlow.confirmationEmailSent') }}
        <strong>{{ getUserInformation.email }}</strong> <a href="#" class="edit-link">{{ $t('bookingFlow.edit') }}</a>
      </li>
      <li>
        <span class="icon">✔</span> <a href="#" class="highlight-link">{{ $t('bookingFlow.getBetterRoom') }} </a> {{ $t('bookingFlow.getBetterRoomPrice') }}
      </li>
      <li>
        <span class="icon">✔</span> {{ $t('bookingFlow.paymentHandledPrefix') }} <strong>{{ $t('bookingFlow.paymentWord') }}</strong> {{ $t('bookingFlow.paymentHandledMid') }}
        <strong>Chalet Islamabad</strong>. {{ $t('bookingFlow.priceSectionPrefix') }} <strong>{{ $t('bookingFlow.priceWord') }}</strong> {{ $t('bookingFlow.priceSectionSuffix') }}
      </li>
      <li>
        <span class="icon">✔</span> {{ $t('bookingFlow.paperlessPrefix') }}
        <a href="#" class="highlight-link">{{ $t('bookingFlow.downloadApp') }}</a>
      </li>
      <li>
        <span class="icon">✔</span> <strong>{{ $t('bookingFlow.creditsAmount') }}</strong> {{ $t('bookingFlow.creditsAddedTo') }}
        <a href="#" class="highlight-link">{{ $t('bookingFlow.wallet') }}</a> {{ $t('bookingFlow.creditsTail') }}
      </li>
    </ul>
    <div class="button-container">
      <button class="button print-btn"><i class="fa-solid fa-print"></i>  {{ $t('bookingFlow.printConfirmation') }}</button>
      <button class="button save-btn"><i class="fa-solid fa-floppy-disk"></i>  {{ $t('bookingFlow.saveConfirmation') }}</button>
    </div>
  </div>

  <div class="confirmation-container" v-if="getBookingInformation.status != 'confirmed'">
    <h1 class="greeting">{{ $t('bookingFlow.thankYouService') }}</h1>
    <h2 class="confirmation-title">{{ $t('bookingFlow.bookingStatusIn', { hotel: getBookingInformation.hotel?.name, status: statusLabel(getBookingInformation.status) }) }}</h2>
  </div>

  <h1 class="section-title">{{ $t('bookingFlow.checkYourDetailsTitle') }}</h1>
  <div class="details-container">
    <!-- Left Section -->
    <div class="details-left">
      <div class="property-details">
        <div style="display: flex; gap: 10px; margin-bottom: 20px;">
          <img :src="getFirstImageUrl(getBookingInformation.hotel.image_urls)" alt="Hotel Image" class="property-image" />
          <div>
            <h2 class="property-name">{{ getBookingInformation.hotel.name }}</h2>
            <span class="rating">★★★★★</span>
            <span class="badge">Genius</span>
          </div>
        </div>
        <p><strong>{{ $t('bookingFlow.bookingCode') }}</strong> {{ getBookingInformation.booking_code }}</p>
        <p><strong>{{ $t('bookingFlow.pinCode') }}</strong> 4338 <span class="lock-icon">🔒</span></p>
        <h3 class="subheading">{{ $t('bookingFlow.bookingDetailsTitle') }}</h3>
        <p v-for="room in getBookingInformation.rooms" :key="room.roomId || room.roomName">{{ room.roomName }} x {{ room.quantity }}</p>
        <p><strong>{{ $t('bookingFlow.youBookedForAdults', { count: getBookingInformation.numberOfGuests }) }}</strong></p>
        <p><strong>{{ $t('bookingFlow.checkInLabel') }}</strong> {{ new Date(getBookingInformation.checkInDate).toString().split(' ').slice(0, 4).join(' ') }} (12:00 PM - 12:00 AM)</p>
        <p><strong>{{ $t('bookingFlow.checkOutLabel') }}</strong>  {{ new Date(getBookingInformation.checkOutDate).toString().split(' ').slice(0, 4).join(' ') }}  (12:00 PM - 1:00 PM)</p>
      </div>
    </div>

    <!-- Right Section -->
    <div class="details-right" v-if="isCancellable">
      <h2 class="subheading">{{ $t('bookingFlow.isEverythingCorrect') }}</h2>
      <p class="note">
        {{ $t('bookingFlow.changeBookingNote') }}
      </p>
      <ul class="action-list">
        <li><RouterLink :to="{path: `/bookings/${bookingCode}/cancel`}" class="action-link"><i class="fa-solid fa-xmark" style="color: #ea1010;"></i> {{ $t('bookingFlow.cancelYourBooking') }}</RouterLink></li>
        <li><RouterLink to="/" class="action-link"><i class="fa-solid fa-wrench" style="color: #005eff;"></i> {{ $t('bookingFlow.bookAnotherRoom') }}</RouterLink></li>
      </ul>
    </div>
    <div class="details-right" v-if="!isCancellable">
      <h2 class="subheading">{{ $t('bookingFlow.whatHappensNext') }}</h2>
      <p class="note">
        {{ $t('bookingFlow.bookingLockedNote') }}
      </p>
      <ul class="action-list">
        <li><RouterLink to="/" class="action-link"><i class="fa-solid fa-wrench" style="color: #005eff;"></i> {{ $t('bookingFlow.bookAnotherRoom') }}</RouterLink></li>
      </ul>
    </div>
  </div>
  <Footer />
</template>
<style scoped>
.confirmation-container {
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 8px;
  margin: 50px 50px;
  padding: 20px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.greeting {
  color: #333;
  font-size: 1.2rem;
  margin-bottom: 10px;
}

.confirmation-title {
  color: #000;
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 20px;
}

.details-list {
  list-style: none;
  margin-bottom: 20px;
}

.details-list li {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.icon {
  color: #4caf50;
  font-weight: bold;
  margin-right: 10px;
}

.edit-link {
  font-size: 0.9rem;
  margin-left: 10px;
  color: #007bff;
  text-decoration: none;
}

.highlight-link {
  color: #007bff;
  text-decoration: none;
  font-weight: bold;
}

.highlight-link:hover {
  text-decoration: underline;
}

.button-container {
  display: flex;
  gap: 10px;
}

.button {
  border: none;
  padding: 10px 15px;
  font-size: 1rem;
  color: #fff;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.3s ease;
}

.print-btn {
  background-color: #0056b3;
}

.save-btn {
  background-color: #007bff;
}

.button:hover {
  opacity: 0.9;
}

/* Container */
.details-container {
  display: flex;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  margin: 50px 50px;
}

/* Left Section */
.details-left {
  flex: 3;
  padding: 20px;
  border-right: 1px solid #ddd;
}

.section-title {
    margin-left: 50px;
  font-size: 1.5rem;
  margin-bottom: 15px;
}

.property-name {
  font-size: 1.3rem;
  font-weight: bold;
  margin-bottom: 5px;
}

.property-image {
  width: 100px;
  height: 100px;
  border-radius: 10px;
  object-fit: cover;
}

.badge {
  background-color: #007bff;
  color: #fff;
  font-size: 0.8rem;
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 8px;
}

.rating {
  color: #fbc02d;
  margin-bottom: 15px;
}

.subheading {
  font-size: 1.1rem;
  font-weight: bold;
  margin: 20px 0 10px;
}

.lock-icon {
  color: #4caf50;
  font-size: 0.9rem;
}

.calendar-links {
  margin-top: 10px;
}

.calendar-link {
  font-size: 0.9rem;
  color: #007bff;
  text-decoration: none;
  margin-right: 15px;
}

.calendar-link:hover {
  text-decoration: underline;
}

.action-link {
  color: #007bff;
  text-decoration: none;
  font-weight: bold;
}

.action-link:hover {
  text-decoration: underline;
}

/* Right Section */
.details-right {
  flex: 2;
  padding: 20px;
}

.note {
  font-size: 0.9rem;
  margin: 10px 0 20px;
}

.action-list {
  list-style: none;
}

.action-list li {
  margin-bottom: 10px;
}
</style>
