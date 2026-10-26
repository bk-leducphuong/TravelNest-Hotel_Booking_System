<script>
  import { LayoutGrid, List } from 'lucide-vue-next';
  import Header from '@/components/Header.vue';
  import Footer from '@/components/Footer.vue';
  import SkeletonGrid from '@/components/common/SkeletonGrid.vue';
  import EmptyState from '@/components/common/EmptyState.vue';
  import ErrorState from '@/components/common/ErrorState.vue';
  import MediaImage from '@/components/ui/MediaImage.vue';
  import { guestMoney } from '@/utils/guestPresentation';
  import PaginationControls from '@/components/common/PaginationControls.vue';
  import { mapActions } from 'vuex';
  import router from '@/router/index.js';
  import { getFirstImageUrl } from '@/utils/images';
  import { BookingService } from '@/services/booking.service';
  import { totalPagesFrom } from '@/utils/pagination';

  export default {
    components: {
      LayoutGrid,
      List,
      Header,
      MediaImage,
      Footer,
      SkeletonGrid,
      EmptyState,
      ErrorState,
      PaginationControls,
    },
    data() {
      return {
        bookings: [],
        isLoading: false,
        loadError: false,
        requestVersion: 0,
        filter: 'all',
        displayMode: 'list',
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      };
    },
    computed: {
      showPagination() {
        return this.pagination.totalPages > 1;
      },
      paginationSummary() {
        if (this.pagination.total === 0) return '';
        const { page, limit, total } = this.pagination;
        const start = (page - 1) * limit + 1;
        const end = Math.min(page * limit, total);
        return this.$t('bookingFlow.paginationSummary', { start, end, total });
      },
    },
    watch: {
      // Keep the page in the URL (?page=N) so refresh/back/shared links work.
      async '$route.query.page'(value) {
        const page = this.parsePage(value);
        if (page === this.pagination.page) return;
        this.pagination.page = page;
        await this.getAllBookings(page);
      },
    },
    methods: {
      setDisplayMode(mode) {
        this.displayMode = mode;
        try {
          localStorage.setItem('travelnest:bookings:display', mode);
        } catch {
          // Keep layout selection available when storage is blocked.
        }
      },
      ...mapActions('booking', ['setBookingInformation']),
      guestMoney,
      parsePage(value) {
        const raw = Array.isArray(value) ? value[0] : value;
        const page = parseInt(raw, 10);
        return Number.isInteger(page) && page > 0 ? page : 1;
      },
      // Rolling-window filter matching the trip dropdown. Returns an ISO
      // timestamp (or null for "all") applied server-side on the booking's
      // `created_at`.
      bookedAfterForFilter(filter) {
        const now = new Date();
        switch (filter) {
          case 'today': {
            return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
          }
          case 'last-week': {
            const start = new Date(now);
            start.setDate(start.getDate() - 7);
            return start.toISOString();
          }
          case 'last-month': {
            const start = new Date(now);
            start.setMonth(start.getMonth() - 1);
            return start.toISOString();
          }
          case 'last-year': {
            const start = new Date(now);
            start.setFullYear(start.getFullYear() - 1);
            return start.toISOString();
          }
          default:
            return null;
        }
      },
      async getAllBookings(page = this.pagination.page) {
        const version = ++this.requestVersion;
        this.isLoading = true;
        this.loadError = false;
        try {
          const options = { page, limit: this.pagination.limit };
          const bookedAfter = this.bookedAfterForFilter(this.filter);
          if (bookedAfter) options.bookedAfter = bookedAfter;

          const response = await BookingService.getBookings(false, options);
          if (version !== this.requestVersion) return;
          this.bookings = this.groupBookings(response?.data || []);

          const meta = response?.meta || {};
          const limit = meta.limit ?? this.pagination.limit;
          const total = meta.total ?? this.bookings.length;
          this.pagination = {
            page: meta.page ?? page,
            limit,
            total,
            totalPages: totalPagesFrom(total, limit),
          };
        } catch (error) {
          console.error(error);
          if (version === this.requestVersion) this.loadError = true;
        } finally {
          if (version === this.requestVersion) this.isLoading = false;
        }
      },
      groupBookings(bookings) {
        const groupedBookings = new Map();

        bookings.forEach((booking) => {
          const bookingCode = booking.booking_code;
          const room = {
            roomId: booking.room?.room_id || booking.room_id,
            quantity: booking.quantity,
            roomName: booking.room?.room_name || booking.roomName,
          };
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
              currency: booking.currency || 'USD',
              numberOfGuests: booking.number_of_guests,
            });
          } else {
            groupedBookings.get(bookingCode).rooms.push(room);
          }
        });

        // Convert Map to an array
        return Array.from(groupedBookings.values());
      },
      seeDetails(bookingCode) {
        this.bookings.forEach((booking) => {
          if (booking.booking_code === bookingCode) {
            this.setBookingInformation(booking);
          }
        });

        router.push({ name: 'BookingDetails', params: { bookingCode: bookingCode } });
      },
      // Localized label for a booking status enum.
      statusLabel(status) {
        if (!status) return '';
        const key = `bookingStatus.${status}`;
        const label = this.$t(key);
        return label === key ? status.replace(/_/g, ' ') : label;
      },
      // Format a `YYYY-MM-DD` date without a timezone shift (avoids rendering
      // the previous day for negative-offset zones).
      formatDate(value) {
        if (!value) return '';
        const s = String(value).slice(0, 10);
        const [y, m, d] = s.split('-');
        if (!y || !m || !d) return s;
        return `${d}/${m}/${y}`;
      },
      // The trip dropdown now filters server-side (rolling window on bookedOn),
      // so paging and the total stay consistent across pages.
      async arrangeBookings(criteria) {
        this.filter = criteria;
        this.pagination.page = 1;
        this.$router.push({ query: { ...this.$route.query, page: 1 } });
        await this.getAllBookings(1);
      },
      changePage(page) {
        if (this.isLoading) return;
        if (page === this.pagination.page || page < 1) return;
        if (this.pagination.totalPages && page > this.pagination.totalPages) return;

        this.pagination.page = page;
        this.$router.push({ query: { ...this.$route.query, page } });
        this.getAllBookings(page);
        this.$nextTick(() => {
          this.$refs.listTop?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
        });
      },
      getFirstImageUrl,
    },
    async mounted() {
      try {
        if (localStorage.getItem('travelnest:bookings:display') === 'grid')
          this.displayMode = 'grid';
      } catch {
        // Keep the default list layout when storage is unavailable.
      }
      this.pagination.page = this.parsePage(this.$route.query.page);
      await this.getAllBookings(this.pagination.page);
    },
  };
</script>
<template>
  <Header :is-search-open="false" />
  <main id="guest-main" tabindex="-1" class="guest-page" ref="listTop">
    <div class="trips-heading">
      <h1 class="guest-page-title">{{ $t('bookingFlow.bookingsAndTrips') }}</h1>
      <div class="trips-controls">
        <label
          ><select
            class="guest-select"
            :value="filter"
            @change="arrangeBookings($event.target.value)"
          >
            <option
              v-for="value in ['all', 'today', 'last-week', 'last-month', 'last-year']"
              :key="value"
              :value="value"
            >
              {{
                $t(
                  {
                    all: 'bookingFlow.filterAll',
                    today: 'bookingFlow.filterToday',
                    'last-week': 'bookingFlow.filterLastWeek',
                    'last-month': 'bookingFlow.filterLastMonth',
                    'last-year': 'bookingFlow.filterLastYear',
                  }[value]
                )
              }}
            </option>
          </select></label
        >
        <div class="trips-display-toggle" role="group" :aria-label="$t('bookingFlow.displayType')">
          <button
            type="button"
            :aria-pressed="displayMode === 'list'"
            @click="setDisplayMode('list')"
          >
            <List :size="16" aria-hidden="true" />{{ $t('bookingFlow.listView') }}
          </button>
          <button
            type="button"
            :aria-pressed="displayMode === 'grid'"
            @click="setDisplayMode('grid')"
          >
            <LayoutGrid :size="16" aria-hidden="true" />{{ $t('bookingFlow.gridView') }}
          </button>
        </div>
      </div>
    </div>
    <SkeletonGrid v-if="isLoading" :count="3" image-height="110px" /><ErrorState
      v-else-if="loadError"
      :title="$t('guest.loadFailed')"
      :message="$t('guest.retryHint')"
      :retry-label="$t('guest.retry')"
      @retry="getAllBookings()"
    /><EmptyState
      v-else-if="!bookings.length"
      :title="$t('bookingFlow.noBookingsTitle')"
      :message="$t('bookingFlow.noBookingsMessage')"
    />
    <div v-else class="trips-list" :class="`trips-list--${displayMode}`">
      <article
        v-for="booking in bookings"
        :key="booking.booking_code"
        class="guest-section trip-card"
      >
        <MediaImage
          :src="getFirstImageUrl(booking.hotel?.image_urls)"
          :alt="booking.hotel?.name || ''"
        />
        <div class="trip-content">
          <span class="guest-pill">{{ statusLabel(booking.status) }}</span>
          <h2>{{ booking.hotel?.name }}</h2>
          <p>{{ formatDate(booking.checkInDate) }} → {{ formatDate(booking.checkOutDate) }}</p>
          <p class="guest-subtitle">{{ booking.booking_code }}</p>
        </div>
        <div class="trip-action">
          <strong>{{ guestMoney(booking.totalPrice, booking.currency, $i18n.locale) }}</strong
          ><button type="button" class="guest-button" @click="seeDetails(booking.booking_code)">
            {{ $t('guest.viewBooking') }}
          </button>
        </div>
      </article>
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
  </main>
  <Footer />
</template>
<style scoped>
  .trips-heading {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 24px;
    flex-wrap: wrap;
    margin-bottom: 24px;
  }
  .trips-controls {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 16px;
  }
  .trips-display-toggle {
    display: flex;
    gap: 2px;
    padding: 3px;
    border: 1px solid var(--tn-border);
    border-radius: 12px;
    background: white;
  }
  .trips-display-toggle button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: 44px;
    padding: 8px 12px;
    border: 0;
    border-radius: 9px;
    background: transparent;
    color: var(--tn-brand);
    font: inherit;
    font-size: 13px;
    cursor: pointer;
  }
  .trips-display-toggle button[aria-pressed='true'] {
    color: white;
    background: var(--tn-brand);
  }
  .trips-display-toggle button:focus-visible {
    outline: 2px solid var(--tn-brand);
    outline-offset: 3px;
  }
  .trips-heading label {
    font-size: 12px;
    color: var(--tn-muted);
  }
  .trips-list {
    display: grid;
    gap: 20px;
  }
  .trip-card {
    display: flex;
    align-items: center;
    gap: 24px;
  }
  .trip-card > .guest-media {
    width: 140px;
    height: 140px;
    flex-shrink: 0;
  }
  .trip-content {
    flex: 1;
    min-width: 0;
  }
  .trip-content h2 {
    margin: 12px 0 8px;
    font-size: 20px;
    overflow-wrap: anywhere;
  }
  .trip-content p {
    margin: 4px 0;
    font-size: 14px;
  }
  .trip-action {
    display: grid;
    gap: 16px;
    text-align: right;
  }
  .trip-action strong {
    font-size: 24px;
    color: var(--tn-brand);
  }
  @media (max-width: 767px) {
    .trips-heading {
      align-items: stretch;
      flex-direction: column;
    }
    .trip-card {
      flex-wrap: wrap;
    }
    .trip-action {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .trip-card > .guest-media {
      width: 100%;
      height: 180px;
    }
  }
  .trips-list--grid {
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
  }
  .trips-list--grid .trip-card {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
    padding: 20px;
    min-width: 0;
  }
  .trips-list--grid .trip-card > .guest-media {
    width: 100%;
    height: 180px;
  }
  .trips-list--grid .trip-action {
    display: grid;
    text-align: left;
    justify-content: stretch;
    border-top: 1px solid var(--tn-border);
    padding-top: 16px;
  }
</style>
