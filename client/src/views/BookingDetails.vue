<script>
import Footer from '@/components/Footer.vue';
import Header from '@/components/Header.vue'
import { mapGetters } from 'vuex';
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
    ...mapGetters('user', ['getUserInformation'])
  },
}
</script>
<template>
  <Header :isSearchOpen="false" />
  <div class="confirmation-container" v-if="getBookingInformation.status === 'confirmed'">
    <h1 class="greeting">Thanks, {{ getUserInformation.username}}!</h1>
    <h2 class="confirmation-title">Your booking in {{ getBookingInformation.hotel.name }} is confirmed.</h2>
    <ul class="details-list">
      <li>
        <span class="icon">✔</span> We sent your confirmation email to
        <strong>{{ getUserInformation.email }}</strong> <a href="#" class="edit-link">Edit</a>
      </li>
      <li>
        <span class="icon">✔</span> <a href="#" class="highlight-link">Get a better room </a> for
        just PKR 1,721.26
      </li>
      <li>
        <span class="icon">✔</span> Your <strong>payment</strong> will be handled by
        <strong>Chalet Islamabad</strong>. The <strong>Price</strong> section below has more
        details.
      </li>
      <li>
        <span class="icon">✔</span> Get paperless confirmation when you
        <a href="#" class="highlight-link">download the app</a>
      </li>
      <li>
        <span class="icon">✔</span> <strong>PKR 1,898 Credits</strong> will be added to your
        <a href="#" class="highlight-link">Wallet</a> 14 days after your stay.
      </li>
    </ul>
    <div class="button-container">
      <button class="button print-btn"><i class="fa-solid fa-print"></i>  Print confirmation</button>
      <button class="button save-btn"><i class="fa-solid fa-floppy-disk"></i>  Save confirmation to phone</button>
    </div>
  </div>

  <div class="confirmation-container" v-if="getBookingInformation.status != 'confirmed'">
    <h1 class="greeting">Thank you for using our service!</h1>
    <h2 class="confirmation-title">Your booking in {{ getBookingInformation.hotel.name }} is {{ getBookingInformation.status }}.</h2>
  </div>

  <h1 class="section-title">Check Your Details</h1>
  <div class="details-container">
    <!-- Left Section -->
    <div class="details-left">
      <div class="property-details">
        <div style="display: flex; gap: 10px; margin-bottom: 20px;">
          <img :src="JSON.parse(getBookingInformation.hotel.image_urls)[0]" alt="Hotel Image" class="property-image" />
          <div>
            <h2 class="property-name">{{ getBookingInformation.hotel.name }}</h2>
            <span class="rating">★★★★★</span>
            <span class="badge">Genius</span>
          </div>
        </div>
        <p><strong>Booking code:</strong> {{ getBookingInformation.booking_code }}</p>
        <p><strong>PIN Code:</strong> 4338 <span class="lock-icon">🔒</span></p>
        <h3 class="subheading">Booking Details</h3>
        <p v-for="room in getBookingInformation.rooms">{{ room.roomName }} x {{ room.quantity }}</p>
        <p><strong>You booked for:</strong> {{ getBookingInformation.numberOfGuests }} adult</p>
        <p><strong>Check-in:</strong> {{ new Date(getBookingInformation.checkInDate).toString().split(' ').slice(0, 4).join(' ') }} (12:00 PM - 12:00 AM)</p>
        <p><strong>Check-out:</strong>  {{ new Date(getBookingInformation.checkOutDate).toString().split(' ').slice(0, 4).join(' ') }}  (12:00 PM - 1:00 PM)</p>
        <div class="calendar-links">
          <a href="#" class="calendar-link">Outlook/iCal</a>
          <a href="#" class="calendar-link">Google calendar</a>
        </div>
      </div>
    </div>

    <!-- Right Section -->
    <div class="details-right" v-if="getBookingInformation.status === 'confirmed'">
      <h2 class="subheading">Is everything correct?</h2>
      <p class="note">
        You can always view or change your booking online – no registration required.
      </p>
      <ul class="action-list">
        <li><RouterLink :to="{path: `/bookings/${bookingCode}/cancel`}" class="action-link"><i class="fa-solid fa-xmark" style="color: #ea1010;"></i> Cancel your booking</RouterLink></li>
        <li><a href="#" class="action-link"><i class="fa-solid fa-pen-to-square" style="color: #0d5de7;"></i> Edit guest details</a></li>
        <li><a href="#" class="action-link"><i class="fa-solid fa-message" style="color: #005eff;"></i> Message property</a></li>
        <li><a href="#" class="action-link"><i class="fa-regular fa-calendar-days" style="color: #005eff;"></i> Change dates</a></li>
        <li><a href="#" class="action-link"><i class="fa-solid fa-wrench" style="color: #005eff;"></i> Change your room</a></li>
      </ul>
    </div>
    <div class="details-right" v-if="getBookingInformation.status !== 'confirmed'">
      <h2 class="subheading">What happens next?</h2>
      <p class="note">
        
      </p>
      <ul class="action-list">
        <li><a href="#" class="action-link"><i class="fa-solid fa-wrench" style="color: #005eff;"></i> Book another room</a></li>
        <li><a href="#" class="action-link"><i class="fa-solid fa-pen-to-square" style="color: #0d5de7;"></i> Report a problem</a></li>
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
