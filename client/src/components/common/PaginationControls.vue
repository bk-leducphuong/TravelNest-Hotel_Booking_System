<template>
  <div v-if="totalPages > 1" class="pagination-wrapper">
    <p v-if="summaryText" class="pagination-summary">{{ summaryText }}</p>
    <nav class="pagination" aria-label="Pagination">
      <button
        type="button"
        class="pagination-button"
        :disabled="page <= 1 || isLoading"
        @click="go(page - 1)"
      >
        {{ prevLabel }}
      </button>

      <template v-for="item in pageNumbers" :key="item">
        <span v-if="typeof item === 'string'" class="pagination-ellipsis">...</span>
        <button
          v-else
          type="button"
          class="pagination-button page-number"
          :class="{ active: item === page }"
          :aria-current="item === page ? 'page' : null"
          :disabled="isLoading"
          @click="go(item)"
        >
          {{ item }}
        </button>
      </template>

      <button
        type="button"
        class="pagination-button"
        :disabled="page >= totalPages || isLoading"
        @click="go(page + 1)"
      >
        {{ nextLabel }}
      </button>
    </nav>
  </div>
</template>

<script>
  import { buildPageNumbers, resultRange } from '@/utils/pagination'

  export default {
    name: 'PaginationControls',
    props: {
      page: { type: Number, default: 1 },
      totalPages: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
      limit: { type: Number, default: 20 },
      isLoading: { type: Boolean, default: false },
      prevLabel: { type: String, default: 'Previous' },
      nextLabel: { type: String, default: 'Next' },
      // Optional pre-built summary. When empty, an English "Showing X–Y of N"
      // summary is rendered automatically.
      summary: { type: String, default: '' },
    },
    emits: ['change'],
    computed: {
      pageNumbers() {
        return buildPageNumbers(this.page, this.totalPages)
      },
      currentResultStart() {
        return resultRange(this.page, this.limit, this.total).start
      },
      currentResultEnd() {
        return resultRange(this.page, this.limit, this.total).end
      },
      summaryText() {
        if (this.summary) return this.summary
        if (this.total <= 0) return ''
        return `Showing ${this.currentResultStart}-${this.currentResultEnd} of ${this.total}`
      },
    },
    methods: {
      go(target) {
        if (this.isLoading) return
        if (target === this.page || target < 1 || target > this.totalPages) return
        this.$emit('change', target)
      },
    },
  }
</script>

<style scoped>
  .pagination-wrapper {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin: 24px 0 8px;
    padding: 16px 0;
    border-top: 1px solid #e6e6e6;
  }

  .pagination-summary {
    margin: 0;
    color: #595959;
    font-size: 14px;
  }

  .pagination {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .pagination-button {
    min-width: 38px;
    height: 38px;
    margin: 0;
    border: 1px solid #006ce4;
    border-radius: 4px;
    background-color: #fff;
    color: #006ce4;
    font-weight: 600;
    cursor: pointer;
  }

  .pagination-button:hover:not(:disabled),
  .pagination-button.active {
    background-color: #003b95;
    border-color: #003b95;
    color: #fff;
  }

  .pagination-button:disabled {
    border-color: #d9d9d9;
    color: #999;
    cursor: not-allowed;
  }

  .pagination-ellipsis {
    min-width: 24px;
    text-align: center;
    color: #595959;
  }
</style>
