<script>
  import { LayoutGrid, List } from 'lucide-vue-next';
  import PaginationControls from '@/components/common/PaginationControls.vue';
  import TheHeader from '@/components/Header.vue';
  import TheFooter from '@/components/Footer.vue';
  import SkeletonGrid from '@/components/common/SkeletonGrid.vue';
  import ErrorState from '@/components/common/ErrorState.vue';
  import EmptyState from '@/components/common/EmptyState.vue';
  import GuestHotelCard from '@/components/home/GuestHotelCard.vue';
  import { getFirstImageUrl as imageUrl } from '@/utils/images';
  import { mapGetters } from 'vuex';
  import sectionFeedback from '@/mixins/sectionFeedback';
  import { UserService } from '@/services/user.service';
  import { getFirstImageUrl } from '@/utils/images';
  export default {
    mixins: [sectionFeedback],
    components: {
      LayoutGrid,
      List,
      PaginationControls,
      TheHeader,
      TheFooter,
      SkeletonGrid,
      EmptyState,
      ErrorState,
      GuestHotelCard,
    },
    data() {
      return {
        hotels: [],
        displayMode: 'grid',
        pagination: { page: 1, limit: 12, total: 0 },
        loadVersion: 0,
        isLoading: false,
        loadError: false,
      };
    },
    computed: {
      ...mapGetters('user', ['getUserInformation']),
      totalPages() {
        return Math.ceil(this.pagination.total / this.pagination.limit);
      },
    },
    methods: {
      setDisplayMode(mode) {
        this.displayMode = mode;
        try {
          localStorage.setItem('travelnest:saved-hotels:display', mode);
        } catch {
          // Keep layout selection available when storage is blocked.
        }
      },
      changePage(page) {
        if (page === this.pagination.page || this.isLoading || page < 1 || page > this.totalPages)
          return;
        this.getSavedHotels(page);
      },
      cardData(row) {
        const h = row.hotelInformation || {};
        return {
          id: row.hotel_id,
          name: h.name,
          address: h.address,
          primaryImageUrl: imageUrl(h.image_urls),
          ratingSummary: { overallRating: h.overall_rating },
        };
      },
      async getSavedHotels(page = this.pagination.page) {
        const version = ++this.loadVersion;
        try {
          this.isLoading = true;
          this.loadError = false;
          const response = await UserService.getFavoriteHotels({
            page,
            limit: this.pagination.limit,
          });
          if (version !== this.loadVersion) return;
          this.hotels = Array.isArray(response?.data) ? response.data : [];
          this.pagination = {
            page: response?.meta?.page ?? page,
            limit: response?.meta?.limit ?? this.pagination.limit,
            total: response?.meta?.total ?? this.hotels.length,
          };
          // Saved items may have been removed in another tab since the last request.
          if (!this.hotels.length && this.pagination.page > Math.max(1, this.totalPages)) {
            await this.getSavedHotels(Math.max(1, this.totalPages));
          }
        } catch (error) {
          if (version === this.loadVersion) this.loadError = true;
        } finally {
          if (version === this.loadVersion) this.isLoading = false;
        }
      },
      // Open the hotel's detail page for a saved card.
      openHotel(hotelId) {
        this.$router.push({ name: 'HotelDetails', params: { hotel_id: hotelId } });
      },
      async deleteSavedHotel(hotel) {
        try {
          await UserService.removeFavoriteHotel(hotel.hotel_id);
          this.hotels = this.hotels.filter((saved) => saved.hotel_id !== hotel.hotel_id);
          this.pagination.total = Math.max(0, this.pagination.total - 1);
          const name = hotel.hotelInformation?.name;
          this.showSuccess(
            name
              ? this.$t('savedHotel.page.removedWithName', { name })
              : this.$t('savedHotel.page.removed')
          );
          if (this.pagination.page > Math.max(1, this.totalPages)) {
            await this.getSavedHotels(Math.max(1, this.totalPages));
          } else if (this.pagination.total > this.hotels.length) {
            // Fill the gap left by the removed card when more saved hotels exist.
            await this.getSavedHotels();
          }
        } catch (error) {
          this.showError();
        }
      },
      getFirstImageUrl,
    },
    async mounted() {
      try {
        const savedMode = localStorage.getItem('travelnest:saved-hotels:display');
        if (savedMode === 'list' || savedMode === 'grid') this.displayMode = savedMode;
      } catch {
        // Use the default grid when storage is unavailable.
      }
      await this.getSavedHotels();
    },
  };
</script>
<template>
  <TheHeader :is-search-open="false" />
  <main id="guest-main" tabindex="-1" class="guest-page">
    <FeedbackMessage v-if="feedback" v-bind="feedback" @dismiss="clearFeedback" />
    <h1 class="guest-page-title">{{ $t('savedHotel.page.title') }}</h1>
    <p class="guest-subtitle">
      {{ $t('savedHotel.page.savedCount', { count: pagination.total }) }}
    </p>
    <div v-if="pagination.total" class="saved-toolbar">
      <div
        class="saved-display-toggle"
        role="group"
        :aria-label="$t('savedHotel.page.displayType')"
      >
        <button
          type="button"
          :aria-pressed="displayMode === 'list'"
          @click="setDisplayMode('list')"
        >
          <List :size="16" aria-hidden="true" />{{ $t('savedHotel.page.listView') }}
        </button>
        <button
          type="button"
          :aria-pressed="displayMode === 'grid'"
          @click="setDisplayMode('grid')"
        >
          <LayoutGrid :size="16" aria-hidden="true" />{{ $t('savedHotel.page.gridView') }}
        </button>
      </div>
    </div>
    <SkeletonGrid v-if="isLoading" :count="3" image-height="200px" />
    <ErrorState v-else-if="loadError" @retry="getSavedHotels()" />
    <EmptyState
      v-else-if="!hotels.length"
      :title="$t('savedHotel.page.emptyTitle')"
      :message="$t('savedHotel.page.emptyMessage')"
    />
    <div v-else class="saved-hotels" :class="`saved-hotels--${displayMode}`">
      <GuestHotelCard
        v-for="hotel in hotels"
        :key="hotel.hotel_id"
        class="hotel-card"
        :hotel="cardData(hotel)"
        :show-favorite="false"
        @open="openHotel(hotel.hotel_id)"
        ><template #action
          ><button
            class="close-button"
            type="button"
            :aria-label="$t('savedHotel.page.removeAria', { name: hotel.hotelInformation?.name })"
            @click="deleteSavedHotel(hotel)"
          >
            ×
          </button></template
        ></GuestHotelCard
      >
    </div>
    <PaginationControls
      v-if="totalPages > 1 && !loadError"
      :page="pagination.page"
      :total-pages="totalPages"
      :total="pagination.total"
      :limit="pagination.limit"
      :is-loading="isLoading"
      @change="changePage"
    />
  </main>
  <TheFooter />
</template>
<style scoped>
  .saved-toolbar {
    display: flex;
    justify-content: flex-end;
    margin-top: 24px;
  }
  .saved-display-toggle {
    display: flex;
    gap: 2px;
    padding: 3px;
    border: 1px solid var(--tn-border);
    border-radius: 12px;
    background: white;
  }
  .saved-display-toggle button {
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
  .saved-display-toggle button[aria-pressed='true'] {
    background: var(--tn-brand);
    color: white;
  }
  .saved-display-toggle button:focus-visible {
    outline: 2px solid var(--tn-brand);
    outline-offset: 3px;
  }
  .saved-hotels {
    display: grid;
    gap: 24px;
    margin-top: 24px;
  }
  .saved-hotels--grid {
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr));
  }
  .saved-hotels--list {
    grid-template-columns: minmax(0, 1fr);
  }
  .saved-hotels--list :deep(.hotel-card) {
    display: grid;
    grid-template-columns: 240px minmax(0, 1fr);
    border: 1px solid var(--tn-border);
  }
  .saved-hotels--list :deep(.guest-property-photo .guest-media) {
    height: 100%;
    min-height: 180px;
  }
  .saved-hotels--list :deep(.guest-property-copy) {
    align-self: center;
  }
  @media (max-width: 600px) {
    .saved-hotels--list :deep(.hotel-card) {
      grid-template-columns: 120px minmax(0, 1fr);
    }
    .saved-hotels--list :deep(.guest-property-photo .guest-media) {
      min-height: 160px;
    }
    .saved-hotels--list :deep(.guest-property-copy) {
      padding: 16px;
    }
    .saved-hotels--list :deep(.guest-property h3) {
      font-size: 16px;
    }
  }
  .close-button {
    position: absolute;
    right: 12px;
    top: 12px;
    min-width: 44px;
    min-height: 44px;
    border: 0;
    border-radius: 50%;
    background: white;
    color: var(--tn-ink);
    font-size: 24px;
    cursor: pointer;
  }
</style>
