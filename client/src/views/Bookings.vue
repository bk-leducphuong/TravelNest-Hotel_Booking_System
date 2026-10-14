<script>
import Header from '@/components/Header.vue'
import Footer from '@/components/Footer.vue'
import SkeletonGrid from '@/components/common/SkeletonGrid.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import { mapActions } from 'vuex'
import router from '@/router/index.js'
import { getFirstImageUrl } from '@/utils/images'
import { BookingService } from '@/services/booking.service'
import { totalPagesFrom } from '@/utils/pagination'

export default {
  components: {
    Header,
    Footer,
    SkeletonGrid,
    EmptyState,
    PaginationControls
  },
  data() {
    return {
      bookings: [],
      isLoading: false,
      filter: 'all',
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
    }
  },
  computed: {
    showPagination() {
      return this.pagination.totalPages > 1
    },
    paginationSummary() {
      if (this.pagination.total === 0) return ''
      const { page, limit, total } = this.pagination
      const start = (page - 1) * limit + 1
      const end = Math.min(page * limit, total)
      return `Showing ${start}-${end} of ${total} bookings`
    }
  },
  watch: {
    // Keep the page in the URL (?page=N) so refresh/back/shared links work.
    async '$route.query.page'(value) {
      const page = this.parsePage(value)
      if (page === this.pagination.page) return
      this.pagination.page = page
      await this.getAllBookings(page)
    }
  },
  methods: {
    ...mapActions('booking', ['setBookingInformation']),
    parsePage(value) {
      const raw = Array.isArray(value) ? value[0] : value
      const page = parseInt(raw, 10)
      return Number.isInteger(page) && page > 0 ? page : 1
    },
    // Rolling-window filter matching the trip dropdown. Returns an ISO
    // timestamp (or null for "all") applied server-side on the booking's
    // `created_at`.
    bookedAfterForFilter(filter) {
      const now = new Date()
      switch (filter) {
        case 'today': {
          return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
        }
        case 'last-week': {
          const start = new Date(now)
          start.setDate(start.getDate() - 7)
          return start.toISOString()
        }
        case 'last-month': {
          const start = new Date(now)
          start.setMonth(start.getMonth() - 1)
          return start.toISOString()
        }
        case 'last-year': {
          const start = new Date(now)
          start.setFullYear(start.getFullYear() - 1)
          return start.toISOString()
        }
        default:
          return null
      }
    },
    async getAllBookings(page = this.pagination.page) {
      this.isLoading = true
      try {
        const options = { page, limit: this.pagination.limit }
        const bookedAfter = this.bookedAfterForFilter(this.filter)
        if (bookedAfter) options.bookedAfter = bookedAfter

        const response = await BookingService.getBookings(false, options)
        this.bookings = this.groupBookings(response?.data || [])

        const meta = response?.meta || {}
        const limit = meta.limit ?? this.pagination.limit
        const total = meta.total ?? this.bookings.length
        this.pagination = {
          page: meta.page ?? page,
          limit,
          total,
          totalPages: totalPagesFrom(total, limit)
        }
      } catch (error) {
        console.error(error)
        this.bookings = []
      } finally {
        this.isLoading = false
      }
    },
    groupBookings(bookings) {
      const groupedBookings = new Map()

      bookings.forEach((booking) => {
        const bookingCode = booking.booking_code
        const room = {
          roomId: booking.room?.room_id || booking.room_id,
          quantity: booking.quantity,
          roomName: booking.room?.room_name || booking.roomName
        }
        if (!groupedBookings.has(bookingCode)) {
          groupedBookings.set(bookingCode, {
            booking_code: bookingCode,
            rooms: [room],
            checkInDate: booking.check_in_date,
            checkOutDate: booking.check_out_date,
            bookedOn: booking.created_at,
            hotel: booking.hotel,
            status: booking.status,
            totalPrice: booking.total_price,
            numberOfGuests: booking.number_of_guests
          })
        } else {
          groupedBookings.get(bookingCode).rooms.push(room)
        }
      })

      // Convert Map to an array
      return Array.from(groupedBookings.values())
    },
    seeDetails(bookingCode) {
      this.bookings.forEach((booking) => {
        if (booking.booking_code === bookingCode) {
          this.setBookingInformation(booking)
        }
      })

      router.push({ name: 'BookingDetails', params: { bookingCode: bookingCode } })
    },
    // Localized label for a booking status enum.
    statusLabel(status) {
      if (!status) return ''
      const key = `bookingStatus.${status}`
      const label = this.$t(key)
      return label === key ? status.replace(/_/g, ' ') : label
    },
    // Format a `YYYY-MM-DD` date without a timezone shift (avoids rendering
    // the previous day for negative-offset zones).
    formatDate(value) {
      if (!value) return ''
      const s = String(value).slice(0, 10)
      const [y, m, d] = s.split('-')
      if (!y || !m || !d) return s
      return `${d}/${m}/${y}`
    },
    // The trip dropdown now filters server-side (rolling window on bookedOn),
    // so paging and the total stay consistent across pages.
    async arrangeBookings(criteria) {
      this.filter = criteria
      this.pagination.page = 1
      this.$router.push({ query: { ...this.$route.query, page: 1 } })
      await this.getAllBookings(1)
    },
    changePage(page) {
      if (this.isLoading) return
      if (page === this.pagination.page || page < 1) return
      if (this.pagination.totalPages && page > this.pagination.totalPages) return

      this.pagination.page = page
      this.$router.push({ query: { ...this.$route.query, page } })
      this.getAllBookings(page)
      this.$nextTick(() => {
        this.$refs.listTop?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
      })
    },
    getFirstImageUrl
  },
  async mounted() {
    this.pagination.page = this.parsePage(this.$route.query.page)
    await this.getAllBookings(this.pagination.page)
  }
}
</script>
<template>
  <Header :isSearchOpen="false" />
  <div class="header-container">
    <div class="header-title">Bookings & Trips</div>
    <div class="header">
      <div class="header-left">
        <select class="dropdown" id="trip-list" aria-label="Filter trips" @change="arrangeBookings($event.target.value)">
          <option value="all">Tất cả</option>
          <option value="today">Hôm nay</option>
          <option value="last-week">1 tuần trước</option>
          <option value="last-month">1 tháng trước</option>
          <option value="last-year">1 năm trước</option>
        </select>
      </div>
    </div>
  </div>
  <div class="account-settings" ref="listTop">
    <SkeletonGrid v-if="isLoading" :count="3" image-height="110px" />
    <EmptyState
      v-else-if="bookings.length === 0"
      title="No bookings yet"
      message="When you book a stay, it will appear here."
      icon="fa-solid fa-suitcase-rolling"
    />
    <template v-else>
      <div class="booking-container" v-for="booking in bookings" :key="booking.booking_code">
      <h3 style="margin-bottom: 5px; font-weight: 700">{{ booking.hotel.name }}</h3>
      <p>
        Booked on {{ formatDate(booking.bookedOn) }}
      </p>
      <div class="booking-content-container">
        <div class="section">
          <div class="hotel-image-container">
            <img :src="getFirstImageUrl(booking.hotel.image_urls)" alt="hotel-image" />
          </div>
          <div style="flex: 1; display: flex; justify-content: space-between">
            <div class="content">
              <h2>{{ booking.hotel.city }}</h2>
              <p>
                {{ formatDate(booking.checkInDate) }} -
                {{ formatDate(booking.checkOutDate) }}
              </p>
              <p>Free cancellation</p>
              <p
                :class="{
                  active: booking.status === 'confirmed',
                  cancel: booking.status === 'cancelled'
                }"
              >
                {{ statusLabel(booking.status) }}
              </p>
            </div>
            <div class="content price-container">
              <h2>USD {{ parseInt(booking.totalPrice).toLocaleString('en-US') }}</h2>
              <i class="fa-solid fa-ellipsis-vertical fa-lg"></i>
            </div>
          </div>
        </div>
        <div class="line"></div>
        <div class="see-more-section" @click="seeDetails(booking.booking_code)">
          <i class="fa-solid fa-angle-right fa-xl"></i>
        </div>
      </div>
    </div>

    <PaginationControls
      v-if="showPagination"
      :page="pagination.page"
      :total-pages="pagination.totalPages"
      :total="pagination.total"
      :limit="pagination.limit"
      :is-loading="isLoading"
      :summary="paginationSummary"
      @change="changePage"
    />
    </template>
  </div>
  <Footer />
</template>
<style scoped>
/* header */
.header-container {
  /* max-width: 1200px; */
  margin: 0 auto;
  padding: 20px 40px;
  border-bottom: 1px solid #ddd;
  background-color: #f9f9f9;
}

.header-title {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 10px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  /* padding: 15px 20px; */
}

.header-left,
.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.dropdown {
  padding: 5px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
}

.btn {
  padding: 8px 12px;
  font-size: 14px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.primary-btn {
  background-color: #007bff;
  color: white;
}

.secondary-btn {
  background-color: white;
  color: #007bff;
  border: 1px solid #007bff;
}

.map-btn {
  background-color: #007bff;
  color: white;
  padding: 8px 16px;
}
/* end header */

.account-settings {
  position: relative;
  /* max-width: 800px; */
  margin: 0 auto;
  padding: 40px;
  padding-top: 0px !important;
  font-family: Arial, sans-serif;
}
.booking-content-container {
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 8px;
  /* box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1); */
  cursor: pointer;
  border-radius: 10px;
  margin-bottom: 30px;
}
.section {
  display: flex;
  align-items: initial;
  height: auto;
}

.line {
  width: 95%;
  margin: 0 auto;
  height: 1px;
  background-color: #e5e7eb;
}

.see-more-section {
  border-radius: 0 0 10px 10px;
  text-align: right;
  padding: 17px;
}

.see-more-section:hover {
  background-color: #f3f3f3;
}

.hotel-image-container {
  width: 110px;
  height: 110px;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f2f2f2;
  border-radius: 5px;
  margin-right: 20px;
  margin-left: 10px;
  margin-bottom: 10px;
  margin-top: 10px;
}
.hotel-image-container img {
  border-radius: 10px;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.content h2 {
  font-size: 20px;
  margin-bottom: 10px;
  font-weight: bold;
  margin-top: 10px;
  color: #4c4c4c;
}
.content p {
  color: #666;
  margin: 2px;
}
.content {
  display: flex;
  flex-direction: column;
  text-align: justify;
}

.price-container {
  justify-content: space-between;
  text-align: right;
  margin: 5px;
  margin-right: 20px;
  flex-direction: row !important;
  gap: 20px;
  align-items: center;
}

.manage-link {
  color: #4285f4;
  text-decoration: none;

  padding-bottom: 10px;
}
.manage-link:hover {
  text-decoration: underline;
  margin-bottom: 10px;
}
button {
  background-color: white;
  border: none;
  text-align: right;
  color: #666;
  cursor: pointer;
}

.vl-parent {
  position: relative;
  height: 100%;
  width: 100%;
}

.no-bookings-found {
  text-align: center;
  margin: 40px;
}

.no-bookings-found div {
  font-size: 26px;
  font-weight: 700;
}

.active {
  color: #00ff00 !important;
}

.cancel {
  color: #ff2c2c !important;
}

@media (max-width: 768px) {
  .header-container {
    padding: 16px;
  }

  .header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .header-left,
  .header-right {
    flex-wrap: wrap;
  }

  .account-settings {
    padding: 16px;
  }

  .section {
    flex-direction: column;
  }

  .hotel-image-container {
    width: 100%;
    height: 180px;
    margin: 0 0 12px 0;
  }

  .price-container {
    flex-direction: row !important;
    justify-content: space-between;
  }
}
</style>
