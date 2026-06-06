<template>
  <aside class="hotel-filter-sidebar" aria-label="Hotel filters">
    <div class="filter-header">
      <strong>Bộ lọc</strong>
      <button
        type="button"
        class="clear-button"
        :disabled="isLoading || !hasActiveFilters"
        @click="$emit('clear-filters')"
      >
        Xóa tất cả
      </button>
    </div>

    <section class="filter-section budget-section">
      <h3>Ngân sách mỗi đêm</h3>
      <div class="budget-mode">Mỗi đêm</div>
      <div class="budget-inputs">
        <label>
          <span>Tối thiểu</span>
          <input
            v-model.number="localBudget.minPrice"
            type="number"
            min="0"
            step="10"
            :disabled="isLoading"
            placeholder="0"
            @input="scheduleBudgetEmit"
          />
        </label>
        <label>
          <span>Tối đa</span>
          <input
            v-model.number="localBudget.maxPrice"
            type="number"
            min="0"
            step="10"
            :disabled="isLoading"
            placeholder="Không giới hạn"
            @input="scheduleBudgetEmit"
          />
        </label>
      </div>
      <p class="budget-summary">
        {{ currency }}
        {{ formatAmount(filters.minPrice || 0) }} -
        {{ filters.maxPrice ? formatAmount(filters.maxPrice) : 'Không giới hạn' }}
      </p>
    </section>

    <section class="filter-section">
      <h3>Các bộ lọc phổ biến</h3>
      <label class="filter-option">
        <span>
          <input
            type="checkbox"
            :checked="filters.freeCancellation"
            :disabled="isLoading"
            @change="updateBoolean('freeCancellation', $event.target.checked)"
          />
          Miễn phí hủy
        </span>
        <small>{{ getCount('freeCancellation') }}</small>
      </label>
      <label
        v-for="option in popularOptions"
        :key="option.key"
        class="filter-option"
      >
        <span>
          <input
            type="checkbox"
            :checked="isPopularSelected(option)"
            :disabled="isLoading"
            @change="togglePopular(option, $event.target.checked)"
          />
          {{ option.label }}
        </span>
        <small>{{ getCount(option.countKey || option.value) }}</small>
      </label>
    </section>

    <section class="filter-section">
      <h3>Bữa ăn</h3>
      <label v-for="option in mealOptions" :key="option.value" class="filter-option">
        <span>
          <input
            type="checkbox"
            :checked="filters.mealPlans.includes(option.value)"
            :disabled="isLoading"
            @change="toggleArrayValue('mealPlans', option.value, $event.target.checked)"
          />
          {{ option.label }}
        </span>
        <small>{{ getCount(option.value) }}</small>
      </label>
    </section>

    <section class="filter-section">
      <h3>Khoảng cách</h3>
      <p v-if="!hasCoordinates" class="hint">Cần tọa độ để lọc theo khoảng cách.</p>
      <label v-for="option in distanceOptions" :key="option.value" class="filter-option">
        <span>
          <input
            type="radio"
            name="distance-filter"
            :checked="filters.radius === option.value"
            :disabled="isLoading || !hasCoordinates"
            @change="updateValue('radius', option.value)"
          />
          {{ option.label }}
        </span>
      </label>
    </section>

    <section class="filter-section">
      <h3>Xếp hạng sao</h3>
      <label v-for="star in starOptions" :key="star" class="filter-option">
        <span>
          <input
            type="checkbox"
            :checked="filters.hotelClass.includes(star)"
            :disabled="isLoading"
            @change="toggleArrayValue('hotelClass', star, $event.target.checked)"
          />
          {{ star }} sao
        </span>
        <small>{{ getStarCount(star) }}</small>
      </label>
    </section>

    <section class="filter-section">
      <h3>Điểm đánh giá</h3>
      <label v-for="option in reviewScoreOptions" :key="option.value" class="filter-option">
        <span>
          <input
            type="radio"
            name="review-score-filter"
            :checked="filters.minRating === option.value"
            :disabled="isLoading"
            @change="updateValue('minRating', option.value)"
          />
          {{ option.label }}
        </span>
        <small>{{ getRatingCount(option.value) }}</small>
      </label>
    </section>

    <section class="filter-section">
      <h3>Tiện nghi</h3>
      <label v-for="option in facilityOptions" :key="option.value" class="filter-option">
        <span>
          <input
            type="checkbox"
            :checked="filters.amenities.includes(option.value)"
            :disabled="isLoading"
            @change="toggleArrayValue('amenities', option.value, $event.target.checked)"
          />
          {{ option.label }}
        </span>
        <small>{{ getCount(option.value) }}</small>
      </label>
    </section>
  </aside>
</template>

<script>
  const MEAL_CODES = ['BREAKFAST_INCLUDED', 'HALF_BOARD', 'FULL_BOARD', 'ALL_INCLUSIVE'];

  export default {
    name: 'HotelFilterSidebar',
    props: {
      filters: {
        type: Object,
        required: true,
      },
      filterOptions: {
        type: Object,
        default: () => ({}),
      },
      isLoading: {
        type: Boolean,
        default: false,
      },
      hasCoordinates: {
        type: Boolean,
        default: false,
      },
      currency: {
        type: String,
        default: 'USD',
      },
    },
    emits: ['update:filters', 'clear-filters'],
    data() {
      return {
        budgetTimer: null,
        localBudget: {
          minPrice: this.filters.minPrice,
          maxPrice: this.filters.maxPrice,
        },
        popularOptions: [
          { key: 'breakfast', label: 'Bao gồm bữa sáng', type: 'amenity', value: 'BREAKFAST_INCLUDED' },
          { key: 'pool', label: 'Hồ bơi', type: 'amenity', value: 'POOL' },
          { key: 'bathtub', label: 'Bồn tắm', type: 'amenity', value: 'BATHTUB' },
          { key: 'balcony', label: 'Ban công', type: 'amenity', value: 'BALCONY' },
          { key: 'excellent', label: 'Tuyệt hảo: 9 điểm trở lên', type: 'rating', value: 4.5 },
          { key: 'four-star', label: '4 sao', type: 'star', value: 4 },
        ],
        mealOptions: [
          { label: 'Bao gồm bữa sáng', value: 'BREAKFAST_INCLUDED' },
          { label: 'Bao bữa sáng & bữa tối', value: 'HALF_BOARD' },
          { label: 'Bao bữa sáng, trưa & tối', value: 'FULL_BOARD' },
          { label: 'Trọn gói', value: 'ALL_INCLUSIVE' },
        ],
        distanceOptions: [
          { label: 'Trong vòng 1 km', value: 1 },
          { label: 'Trong vòng 3 km', value: 3 },
          { label: 'Trong vòng 5 km', value: 5 },
          { label: 'Trong vòng 10 km', value: 10 },
          { label: 'Trong vòng 25 km', value: 25 },
          { label: 'Trong vòng 50 km', value: 50 },
        ],
        starOptions: [5, 4, 3, 2, 1],
        reviewScoreOptions: [
          { label: 'Tuyệt hảo: 9+', value: 4.5 },
          { label: 'Rất tốt: 8+', value: 4 },
          { label: 'Tốt: 7+', value: 3.5 },
          { label: 'Dễ chịu: 6+', value: 3 },
        ],
        facilityOptions: [
          { label: 'WiFi miễn phí', value: 'FREE_WIFI' },
          { label: 'Chỗ đậu xe', value: 'PARKING' },
          { label: 'Hồ bơi', value: 'POOL' },
          { label: 'Trung tâm thể dục', value: 'FITNESS_CENTER' },
          { label: 'Spa', value: 'SPA' },
          { label: 'Xe đưa đón sân bay', value: 'AIRPORT_SHUTTLE' },
          { label: 'Nhà hàng', value: 'RESTAURANT' },
          { label: 'Quầy bar', value: 'BAR' },
          { label: 'Dịch vụ phòng', value: 'ROOM_SERVICE' },
          { label: 'Điều hòa nhiệt độ', value: 'AIR_CONDITIONING' },
          { label: 'Phòng không hút thuốc', value: 'NON_SMOKING' },
          { label: 'Phù hợp xe lăn', value: 'WHEELCHAIR_ACCESSIBLE' },
        ],
      };
    },
    computed: {
      hasActiveFilters() {
        return Boolean(
          this.filters.minPrice ||
            this.filters.maxPrice ||
            this.filters.freeCancellation ||
            this.filters.minRating ||
            this.filters.radius ||
            this.filters.amenities.length ||
            this.filters.mealPlans.length ||
            this.filters.hotelClass.length
        );
      },
    },
    watch: {
      'filters.minPrice'(value) {
        this.localBudget.minPrice = value;
      },
      'filters.maxPrice'(value) {
        this.localBudget.maxPrice = value;
      },
    },
    beforeUnmount() {
      if (this.budgetTimer) window.clearTimeout(this.budgetTimer);
    },
    methods: {
      emitFilters(nextPatch) {
        this.$emit('update:filters', {
          ...this.filters,
          ...nextPatch,
        });
      },
      updateValue(key, value) {
        this.emitFilters({ [key]: value });
      },
      updateBoolean(key, value) {
        this.emitFilters({ [key]: Boolean(value) });
      },
      toggleArrayValue(key, value, checked) {
        const current = new Set(this.filters[key] || []);
        if (checked) current.add(value);
        else current.delete(value);
        this.emitFilters({ [key]: Array.from(current) });
      },
      togglePopular(option, checked) {
        if (option.type === 'amenity') {
          const key = MEAL_CODES.includes(option.value) ? 'mealPlans' : 'amenities';
          this.toggleArrayValue(key, option.value, checked);
          return;
        }

        if (option.type === 'rating') {
          this.emitFilters({ minRating: checked ? option.value : null });
          return;
        }

        if (option.type === 'star') {
          this.toggleArrayValue('hotelClass', option.value, checked);
        }
      },
      isPopularSelected(option) {
        if (option.type === 'amenity') {
          const key = MEAL_CODES.includes(option.value) ? 'mealPlans' : 'amenities';
          return this.filters[key].includes(option.value);
        }
        if (option.type === 'rating') return this.filters.minRating === option.value;
        if (option.type === 'star') return this.filters.hotelClass.includes(option.value);
        return false;
      },
      scheduleBudgetEmit() {
        if (this.budgetTimer) window.clearTimeout(this.budgetTimer);
        this.budgetTimer = window.setTimeout(() => {
          const minPrice = this.normalizePrice(this.localBudget.minPrice);
          const maxPrice = this.normalizePrice(this.localBudget.maxPrice);
          this.emitFilters({
            minPrice,
            maxPrice: maxPrice && minPrice && maxPrice < minPrice ? minPrice : maxPrice,
          });
        }, 300);
      },
      normalizePrice(value) {
        const numberValue = Number(value);
        return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
      },
      formatAmount(value) {
        return Number(value || 0).toLocaleString('en-US');
      },
      getCount(key) {
        const count = this.filterOptions?.amenities?.[key] ?? this.filterOptions?.popular?.[key];
        return Number.isFinite(count) ? count : '';
      },
      getStarCount(star) {
        const count = this.filterOptions?.hotelClass?.[star];
        return Number.isFinite(count) ? count : '';
      },
      getRatingCount(value) {
        const count = this.filterOptions?.reviewScores?.[value];
        return Number.isFinite(count) ? count : '';
      },
    },
  };
</script>

<style scoped>
  .hotel-filter-sidebar {
    border: 1px solid #d9d9d9;
    border-radius: 8px;
    background: #fff;
    overflow: hidden;
  }

  .filter-header,
  .filter-section {
    padding: 14px 16px;
    border-bottom: 1px solid #e6e6e6;
  }

  .filter-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .filter-section:last-child {
    border-bottom: 0;
  }

  h3 {
    margin: 0 0 10px;
    font-size: 15px;
    line-height: 1.3;
  }

  .clear-button {
    margin: 0;
    padding: 4px 8px;
    border: 0;
    background: transparent;
    color: #006ce4;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
  }

  .clear-button:disabled {
    color: #8f8f8f;
    cursor: not-allowed;
  }

  .budget-mode {
    display: inline-flex;
    margin-bottom: 12px;
    padding: 6px 10px;
    border-radius: 999px;
    background: #003b95;
    color: #fff;
    font-size: 13px;
    font-weight: 600;
  }

  .budget-inputs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .budget-inputs label {
    margin: 0;
    font-size: 12px;
    font-weight: 600;
  }

  .budget-inputs input {
    width: 100%;
    margin: 4px 0 0;
    padding: 8px;
    border: 1px solid #bdbdbd;
    border-radius: 4px;
    font-size: 13px;
  }

  .budget-summary,
  .hint {
    margin: 10px 0 0;
    color: #595959;
    font-size: 12px;
  }

  .filter-option {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
    margin: 0;
    padding: 5px 0;
    font-size: 13px;
    font-weight: 400;
    line-height: 1.35;
  }

  .filter-option span {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    min-width: 0;
  }

  .filter-option input {
    margin-top: 2px;
    flex: 0 0 auto;
  }

  .filter-option small {
    min-width: 24px;
    color: #6b6b6b;
    text-align: right;
  }
</style>
