<script>
  import { LayoutGrid, List } from 'lucide-vue-next';
  import TheFooter from '@/components/Footer.vue';
  import TheHeader from '../components/Header.vue';
  import SkeletonGrid from '@/components/common/SkeletonGrid.vue';
  import ErrorState from '@/components/common/ErrorState.vue';
  import EmptyState from '@/components/common/EmptyState.vue';
  import PaginationControls from '@/components/common/PaginationControls.vue';
  import { mapGetters, mapActions } from 'vuex';
  import { ReviewService } from '@/services/review.service';
  import { BookingService } from '@/services/booking.service';
  import { getFirstImageUrl, getImageUrl } from '@/utils/images';
  import { totalPagesFrom } from '@/utils/pagination';

  export default {
    components: {
      LayoutGrid,
      List,
      TheHeader,
      TheFooter,
      SkeletonGrid,
      EmptyState,
      ErrorState,
      PaginationControls,
    },
    data() {
      return {
        reviews: [],
        bookings: [],
        isLoading: false,
        isPageLoading: false,
        isBookingsPageLoading: false,
        viewMode: 'all',
        displayMode: 'list',
        reviewsError: false,
        bookingsError: false,
        expandedReviewId: null,
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0, published: 0, hidden: 0 },
        // Reviewable stays have their own server-side pagination so the page
        // never pulls a guest's whole booking history.
        bookingsPagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      };
    },
    computed: {
      ...mapGetters('user', ['getUserInformation']),
      // The reviewable endpoint already returns only completed, unreviewed
      // bookings; keep the status guard as a defensive filter.
      notReviewedBookings() {
        return this.bookings.filter((booking) => booking.status === 'completed');
      },
      // "All reviews" = everything the user wrote (published + hidden by moderation).
      allReviewsCount() {
        return this.pagination.published + this.pagination.hidden;
      },
      // "Reviewed" = the visible (published) reviews.
      reviewed() {
        return this.pagination.published;
      },
      // Server truth for the tab badge: the loaded page is capped at `limit`.
      notReviewed() {
        return this.bookingsPagination.total;
      },
      // The "Reviewed" tab lists published reviews only; "All reviews" lists all.
      reviewStatusFilter() {
        return this.viewMode === 'reviewed' ? 'published' : undefined;
      },
      displayedReviews() {
        return this.viewMode === 'notReviewed' ? [] : this.reviews;
      },
      displayedBookings() {
        return this.viewMode === 'reviewed' ? [] : this.notReviewedBookings;
      },
      showPagination() {
        return this.viewMode !== 'notReviewed' && this.pagination.totalPages > 1;
      },
      // Stays pagination is shown wherever stays are listed ("All" and
      // "Not reviewed yet"), independently of the reviews pagination.
      showBookingsPagination() {
        return this.viewMode !== 'reviewed' && this.bookingsPagination.totalPages > 1;
      },
      paginationSummary() {
        return this.rangeSummary(this.pagination);
      },
      bookingsPaginationSummary() {
        return this.rangeSummary(this.bookingsPagination);
      },
    },
    watch: {
      // Switching to/from the "Reviewed" tab changes which reviews are listed
      // (published only vs all), so refetch from page 1 with the right filter.
      async viewMode(newVal, oldVal) {
        if (newVal !== 'reviewed' && oldVal !== 'reviewed') return;
        this.pagination.page = 1;
        await this.loadReviews(1);
        if (this.parsePage(this.$route.query.page) !== 1) {
          this.$router.replace({ query: { ...this.$route.query, page: 1 } }).catch(() => {});
        }
      },
      // Keep the reviews page in the URL (?page=N) so refresh/back/shared links work.
      async '$route.query.page'(value) {
        const page = this.parsePage(value);
        if (page === this.pagination.page) return;
        this.pagination.page = page;
        this.isPageLoading = true;
        try {
          await this.loadReviews(page);
        } finally {
          this.isPageLoading = false;
        }
      },
      // Reviewable stays have their own page (?bookingsPage=N) because they are
      // listed independently of the written reviews.
      async '$route.query.bookingsPage'(value) {
        const page = this.parsePage(value);
        if (page === this.bookingsPagination.page) return;
        this.bookingsPagination.page = page;
        this.isBookingsPageLoading = true;
        try {
          await this.loadBookings(page);
        } finally {
          this.isBookingsPageLoading = false;
        }
      },
    },
    methods: {
      setDisplayMode(mode) {
        this.displayMode = mode;
        try {
          localStorage.setItem('travelnest:reviews:display', mode);
        } catch {
          // Keep layout selection available when storage is blocked.
        }
      },
      ...mapActions('user', ['retrieveUserInformation']),
      parsePage(value) {
        const raw = Array.isArray(value) ? value[0] : value;
        const page = parseInt(raw, 10);
        return Number.isInteger(page) && page > 0 ? page : 1;
      },
      rangeSummary({ page, limit, total }) {
        if (total === 0) return '';
        const start = (page - 1) * limit + 1;
        const end = Math.min(page * limit, total);
        return this.$t('reviewsPage.paginationSummary', { start, end, total });
      },
      async loadReviews(page = this.pagination.page) {
        this.reviewsError = false;
        try {
          const params = { page, limit: this.pagination.limit };
          if (this.reviewStatusFilter) params.status = this.reviewStatusFilter;

          const response = await ReviewService.getReviews(params);
          this.reviews = response?.data ?? [];
          const meta = response?.meta ?? {};
          const limit = meta.limit ?? this.pagination.limit;
          const total = meta.total ?? this.reviews.length;
          this.pagination = {
            page: meta.page ?? page,
            limit,
            total,
            totalPages: totalPagesFrom(total, limit),
            published: meta.published ?? this.pagination.published,
            hidden: meta.hidden ?? this.pagination.hidden,
          };
        } catch (error) {
          this.reviewsError = true;
        }
      },
      async loadBookings(page = this.bookingsPagination.page) {
        this.bookingsError = false;
        try {
          const response = await BookingService.getReviewableBookings({
            page,
            limit: this.bookingsPagination.limit,
          });
          this.bookings = response?.data ?? [];
          const meta = response?.meta ?? {};
          const limit = meta.limit ?? this.bookingsPagination.limit;
          const total = meta.total ?? this.bookings.length;
          this.bookingsPagination = {
            page: meta.page ?? page,
            limit,
            total,
            totalPages: totalPagesFrom(total, limit),
          };
        } catch (error) {
          this.bookingsError = true;
        }
      },
      async load() {
        this.isLoading = true;
        try {
          await Promise.all([
            this.loadReviews(this.pagination.page),
            this.loadBookings(this.bookingsPagination.page),
          ]);
        } finally {
          this.isLoading = false;
        }
      },
      changePage(page) {
        if (this.isLoading || this.isPageLoading) return;
        if (page === this.pagination.page || page < 1) return;
        if (this.pagination.totalPages && page > this.pagination.totalPages) return;

        this.$router.push({ query: { ...this.$route.query, page } });
        this.$nextTick(() => {
          this.$refs.rightContainer?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
        });
      },
      changeBookingsPage(page) {
        if (this.isLoading || this.isBookingsPageLoading) return;
        if (page === this.bookingsPagination.page || page < 1) return;
        if (this.bookingsPagination.totalPages && page > this.bookingsPagination.totalPages) return;

        this.$router.push({ query: { ...this.$route.query, bookingsPage: page } });
        this.$nextTick(() => {
          this.$refs.rightContainer?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
        });
      },
      makeReview(bookingCode, hotelId, hotelName) {
        this.$router.push({
          name: 'ReviewDetails',
          query: { bc: bookingCode, hid: hotelId, hn: hotelName },
        });
      },
      // Expand/collapse a written review to show its rating, media and any
      // moderation note inline.
      toggleReview(reviewId) {
        this.expandedReviewId = this.expandedReviewId === reviewId ? null : reviewId;
      },
      isReviewExpanded(reviewId) {
        return this.expandedReviewId === reviewId;
      },
      sortedMedia(media) {
        if (!Array.isArray(media)) return [];
        return [...media].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
      },
      // Swap a broken/empty image for a neutral placeholder instead of a broken icon.
      placeholderImage() {
        const label = this.$t('reviewsPage.noImage');
        return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="125" height="125" role="img" aria-label="${label}"><rect width="100%" height="100%" fill="#f2f2f2"/><text x="50%" y="50%" font-family="Arial, sans-serif" font-size="12" fill="#9aa0a6" text-anchor="middle" dominant-baseline="middle">${label}</text></svg>`
        )}`;
      },
      onImageError(event) {
        const el = event?.target;
        if (!el || el.dataset.fallbackApplied) return;
        el.dataset.fallbackApplied = 'true';
        el.src = this.placeholderImage();
      },
      getFirstImageUrl,
      getImageUrl,
    },
    async mounted() {
      try {
        if (localStorage.getItem('travelnest:reviews:display') === 'grid')
          this.displayMode = 'grid';
      } catch {
        // Use the default list layout when browser storage is unavailable.
      }
      this.pagination.page = this.parsePage(this.$route.query.page);
      this.bookingsPagination.page = this.parsePage(this.$route.query.bookingsPage);
      await Promise.all([this.load(), this.retrieveUserInformation().catch(() => {})]);
    },
  };
</script>
<template>
  <TheHeader :isSearchOpen="false" />
  <main id="guest-main" tabindex="-1" class="guest-page review-dashboard">
    <div class="left-container">
      <div class="profile-section">
        <img
          v-if="getUserInformation"
          :src="getImageUrl(getUserInformation.profile_picture_url)"
          :alt="$t('reviewsPage.profileAlt')"
          class="profile-image"
        />
        <div>
          <h2 class="profile-name" v-if="getUserInformation">{{ getUserInformation.username }}</h2>
          <button
            type="button"
            class="edit-profile"
            @click="this.$router.push('/account-settings/personal-information')"
          >
            {{ $t('reviewsPage.editProfile') }}
          </button>
        </div>
      </div>

      <div class="nav-links">
        <button
          type="button"
          class="nav-link"
          :class="{ selected: viewMode === 'all' }"
          @click="viewMode = 'all'"
        >
          {{ $t('reviewsPage.allReviews') }}
          <span class="review-count">{{ allReviewsCount }}</span>
        </button>
        <button
          type="button"
          class="nav-link"
          :class="{ selected: viewMode === 'notReviewed' }"
          @click="viewMode = 'notReviewed'"
        >
          {{ $t('reviewsPage.notReviewedYet') }}
          <span class="review-count">{{ notReviewed }}</span>
        </button>
        <button
          type="button"
          class="nav-link"
          :class="{ selected: viewMode === 'reviewed' }"
          @click="viewMode = 'reviewed'"
        >
          {{ $t('reviewsPage.reviewed') }}
          <span class="review-count">{{ reviewed }}</span>
        </button>
      </div>
    </div>
    <div class="right-container" ref="rightContainer">
      <div class="reviews-toolbar">
        <div
          class="reviews-display-toggle"
          role="group"
          :aria-label="$t('reviewsPage.displayType')"
        >
          <button
            type="button"
            :aria-pressed="displayMode === 'list'"
            @click="setDisplayMode('list')"
          >
            <List :size="16" aria-hidden="true" />{{ $t('reviewsPage.listView') }}
          </button>
          <button
            type="button"
            :aria-pressed="displayMode === 'grid'"
            @click="setDisplayMode('grid')"
          >
            <LayoutGrid :size="16" aria-hidden="true" />{{ $t('reviewsPage.gridView') }}
          </button>
        </div>
      </div>
      <SkeletonGrid v-if="isLoading" :count="2" image-height="125px" />
      <div v-else-if="reviewsError || bookingsError" role="alert">
        <ErrorState
          :title="$t('guest.loadFailed')"
          :message="$t('guest.retryHint')"
          :retry-label="$t('guest.retry')"
          @retry="load"
        />
      </div>
      <EmptyState
        v-else-if="displayedReviews.length === 0 && displayedBookings.length === 0"
        :title="$t('reviewsPage.emptyTitle')"
        :message="$t('reviewsPage.emptyMessage')"
        icon="fa-regular fa-star"
      />
      <template v-else>
        <div class="review-list" :class="`review-list--${displayMode}`">
          <!-- Stays awaiting a review -->
          <div class="review-card" v-for="booking in displayedBookings" :key="booking.id">
            <div class="review-card-body">
              <img
                v-if="getFirstImageUrl(booking.hotel?.image_urls)"
                :src="getFirstImageUrl(booking.hotel?.image_urls)"
                :alt="$t('reviewsPage.propertyAlt')"
                class="property-image"
                @error="onImageError"
              />
              <div v-else class="property-image property-image-placeholder" aria-hidden="true">
                <i class="fa-regular fa-image"></i>
              </div>
              <div class="review-content">
                <h4>{{ $t('reviewsPage.notReviewedStay', { hotel: booking.hotel?.name }) }}</h4>
                <div></div>
                <button
                  class="review-button"
                  @click="makeReview(booking.booking_code, booking.hotel?.id, booking.hotel?.name)"
                >
                  {{ $t('reviewsPage.reviewYourStay') }}
                </button>
              </div>
            </div>
          </div>
          <PaginationControls
            v-if="showBookingsPagination"
            class="list-pagination"
            :page="bookingsPagination.page"
            :total-pages="bookingsPagination.totalPages"
            :total="bookingsPagination.total"
            :limit="bookingsPagination.limit"
            :is-loading="isLoading || isBookingsPageLoading"
            :summary="bookingsPaginationSummary"
            @change="changeBookingsPage"
          />

          <!-- Written reviews -->
          <div
            class="review-card clickable"
            :class="{ 'is-expanded': isReviewExpanded(review.id) }"
            v-for="review in displayedReviews"
            :key="review.id"
            role="button"
            tabindex="0"
            :aria-expanded="isReviewExpanded(review.id) ? 'true' : 'false'"
            @click="toggleReview(review.id)"
            @keydown.enter.prevent="toggleReview(review.id)"
            @keydown.space.prevent="toggleReview(review.id)"
          >
            <div class="review-card-body">
              <img
                v-if="getFirstImageUrl(review.hotel?.image_urls)"
                :src="getFirstImageUrl(review.hotel?.image_urls)"
                :alt="$t('reviewsPage.propertyAlt')"
                class="property-image"
                @error="onImageError"
              />
              <div v-else class="property-image property-image-placeholder" aria-hidden="true">
                <i class="fa-regular fa-image"></i>
              </div>
              <div class="review-content">
                <h4>{{ $t('reviewsPage.reviewedStay', { hotel: review.hotel?.name }) }}</h4>
                <div class="review-meta">
                  <span class="review-status">{{ $t('reviewsPage.reviewed') }}</span>
                  <span v-if="review.status === 'hidden'" class="review-hidden-badge">{{
                    $t('reviewsPage.hidden')
                  }}</span>
                  <i
                    class="fa-solid review-toggle-icon"
                    :class="isReviewExpanded(review.id) ? 'fa-chevron-up' : 'fa-chevron-down'"
                    aria-hidden="true"
                  ></i>
                </div>
                <p v-if="review.title">
                  <strong>{{ review.title }}</strong>
                </p>
                <p v-if="review.comment" class="review-comment">{{ review.comment }}</p>

                <div v-if="isReviewExpanded(review.id)" class="review-details">
                  <div v-if="review.rating_overall" class="review-rating">
                    <span class="score-badge">{{ review.rating_overall }}</span>
                    <span class="review-rating-label">{{ $t('reviewsPage.outOfTen') }}</span>
                  </div>
                  <p v-if="review.status === 'hidden'" class="review-hidden-note">
                    {{ $t('reviewsPage.hiddenNote') }}
                  </p>
                  <div v-if="sortedMedia(review.media).length" class="review-media">
                    <img
                      v-for="(media, index) in sortedMedia(review.media)"
                      :key="media.id || index"
                      :src="getImageUrl(media.thumbnail_url || media.url)"
                      :alt="$t('reviewsPage.reviewPhotoAlt')"
                      class="review-media-item"
                      @error="onImageError"
                    />
                  </div>
                  <p v-else class="review-media-empty">{{ $t('reviewsPage.noPhotos') }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <PaginationControls
          v-if="showPagination"
          :page="pagination.page"
          :total-pages="pagination.totalPages"
          :total="pagination.total"
          :limit="pagination.limit"
          :is-loading="isLoading || isPageLoading"
          :summary="paginationSummary"
          @change="changePage"
        />
      </template>
    </div>
  </main>
  <TheFooter />
</template>
<style scoped>
  .review-dashboard {
    /* max-width: 1200px; */
    margin: 30px 40px;
    display: flex;
    justify-content: space-between;
    gap: 20px;
  }

  .left-container {
    width: 30%;
  }

  .right-container {
    width: 70%;
  }

  .profile-section {
    display: flex;
    align-items: center;
    padding: 16px;
    background: white;
    border-radius: 8px;
    margin-bottom: 20px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .profile-image {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    margin-right: 12px;
    object-fit: cover;
  }

  .profile-name {
    font-size: 18px;
    font-weight: 500;
    margin: 0;
  }

  .edit-profile {
    color: #1a73e8;
    text-decoration: none;
    font-size: 14px;
  }

  .nav-links {
    display: flex;
    flex-direction: column;
    gap: 8px;
    background: white;
    padding: 8px;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .nav-link {
    display: flex;
    justify-content: space-between;
    padding: 8px 16px;
    color: #1a73e8;
    text-decoration: none;
    border-radius: 4px;
  }

  .nav-link:hover {
    background: #f1f3f4;
  }

  .review-count {
    color: #1a73e8;
    font-weight: 500;
  }

  .review-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .review-card {
    background: white;
    padding: 16px;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .review-card.clickable {
    cursor: pointer;
  }

  .review-card.clickable:hover,
  .review-card.clickable:focus-visible {
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.16);
  }

  .review-card.clickable:focus-visible {
    outline: 2px solid #1a73e8;
    outline-offset: 2px;
  }

  .review-meta {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .review-toggle-icon {
    margin-left: auto;
    color: #1a73e8;
  }

  .review-details {
    margin-top: 4px;
    padding-top: 12px;
    border-top: 1px solid #e5e7eb;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .review-rating {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .review-rating-label {
    color: #666;
    font-size: 13px;
  }

  .review-hidden-badge {
    display: inline-block;
    padding: 4px 8px;
    background: #fdecea;
    color: #b3261e;
    border-radius: 4px;
    font-size: 12px;
  }

  .review-hidden-note {
    margin: 0;
    color: #b26a00;
    background: #fff4e5;
    padding: 8px 10px;
    border-radius: 4px;
    font-size: 13px;
  }

  .review-media {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .review-media-item {
    width: 88px;
    height: 88px;
    object-fit: cover;
    border-radius: 6px;
  }

  .review-media-empty {
    margin: 0;
    color: #666;
    font-size: 13px;
  }

  .property-image {
    width: 125px;
    height: 125px;
    border-radius: 4px;
    object-fit: cover;
    align-self: center;
  }

  .property-image-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f2f2f2;
    color: #9aa0a6;
    font-size: 24px;
  }

  .review-button {
    background: #1a73e8;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
    bottom: 0px;
  }

  .review-status {
    display: inline-block;
    padding: 4px 8px;
    background: #e6f4ea;
    color: #137333;
    border-radius: 4px;
    font-size: 12px;
  }

  .score-badge {
    background: #1a73e8;
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-weight: bold;
  }

  .exceptional-text {
    font-weight: 500;
    margin-left: 8px;
  }

  .review-content {
    display: flex;
    flex-direction: column;
    gap: 8px;
    position: relative;
    width: 100%;
    height: 100%;
  }

  .selected {
    border-left: 4px solid #1a73e8;
  }

  @media (max-width: 768px) {
    .review-dashboard {
      flex-direction: column;
      margin: 20px 16px;
      gap: 16px;
    }

    .left-container,
    .right-container {
      width: 100%;
    }
  }
</style>
<style scoped>
  .review-dashboard {
    margin: 0 auto;
    display: grid;
    grid-template-columns: 260px minmax(0, 1fr);
    gap: 24px;
  }
  .left-container,
  .right-container {
    width: auto;
    min-width: 0;
  }
  .profile-section,
  .review-card {
    border-radius: 20px;
    box-shadow: none;
  }
  .nav-links button {
    display: block;
    width: 100%;
    padding: 14px 16px;
    text-align: left;
    background: white;
    border: 0;
    color: var(--tn-ink);
    cursor: pointer;
  }
  .nav-links button.selected {
    color: var(--tn-brand);
    background: var(--tn-soft);
  }
  .review-card {
    margin-bottom: 20px;
  }
  .review-button {
    border-radius: 10px;
    background: var(--tn-action);
  }
  @media (max-width: 767px) {
    .review-dashboard {
      display: block;
    }
    .left-container {
      margin-bottom: 24px;
    }
    .nav-links {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .nav-links button {
      width: auto;
      flex: 1;
      min-height: 44px;
      border-radius: 10px;
    }
    .profile-section {
      display: none;
    }
    .review-card > div {
      flex-wrap: wrap;
    }
    .property-image {
      max-width: 100%;
    }
  }
</style>

<style scoped>
  .edit-profile {
    border: 0;
    background: transparent;
    color: var(--tn-action);
    min-height: 44px;
    padding: 8px 0;
    cursor: pointer;
  }
</style>

<style scoped>
  .reviews-toolbar {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 20px;
  }
  .reviews-display-toggle {
    display: flex;
    gap: 2px;
    padding: 3px;
    border: 1px solid var(--tn-border);
    border-radius: 12px;
    background: white;
  }
  .reviews-display-toggle button {
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
  .reviews-display-toggle button[aria-pressed='true'] {
    color: white;
    background: var(--tn-brand);
  }
  .reviews-display-toggle button:focus-visible {
    outline: 2px solid var(--tn-brand);
    outline-offset: 3px;
  }
  .review-card-body {
    display: flex;
    gap: 16px;
    align-items: flex-start;
    height: 100%;
  }
  .review-card {
    min-width: 0;
    margin-bottom: 0;
  }
  .review-content {
    min-width: 0;
    height: auto;
    overflow-wrap: anywhere;
  }
  .property-image {
    flex-shrink: 0;
  }
  /* Keep the stays pagination on its own row in grid mode. */
  .review-list--grid .list-pagination {
    grid-column: 1 / -1;
  }
  .review-list--grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr));
    align-items: start;
  }
  .review-list--grid .review-card-body {
    flex-direction: column;
    flex-wrap: nowrap;
  }
  .review-list--grid .property-image {
    width: 100%;
    height: 180px;
    border-radius: 12px;
  }
  .review-list--grid .review-comment {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 4;
    overflow: hidden;
  }
  .review-list--grid .is-expanded .review-comment {
    display: block;
    overflow: visible;
  }
  .review-button {
    min-height: 44px;
  }
</style>
