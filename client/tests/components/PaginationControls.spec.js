import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import PaginationControls from '@/components/common/PaginationControls.vue'

// The component renders its labels/summary through vue-i18n. Feed it the same
// English strings so the existing assertions keep checking real output.
const i18n = createI18n({
  locale: 'en',
  messages: {
    en: {
      'misc.pagination.ariaLabel': 'Pagination',
      'misc.pagination.previous': 'Previous',
      'misc.pagination.next': 'Next',
      'misc.pagination.summary': 'Showing {start}-{end} of {total}',
    },
  },
})

const mountControls = (props = {}) =>
  mount(PaginationControls, {
    props: {
      page: 1,
      totalPages: 3,
      total: 45,
      limit: 20,
      ...props,
    },
    global: { plugins: [i18n] },
  })

const buttons = (wrapper) => wrapper.findAll('.pagination-button')

describe('PaginationControls', () => {
  it('renders nothing when there is a single page', () => {
    const wrapper = mountControls({ totalPages: 1, total: 10 })
    expect(wrapper.find('.pagination-wrapper').exists()).toBe(false)
  })

  it('renders the summary, page numbers and ellipsis', () => {
    const wrapper = mountControls({ page: 10, totalPages: 20, total: 400 })
    expect(wrapper.find('.pagination-summary').text()).toBe('Showing 181-200 of 400')
    expect(wrapper.findAll('.pagination-ellipsis')).toHaveLength(2)
    const numbers = wrapper.findAll('.pagination-button.page-number').map((b) => b.text())
    expect(numbers).toEqual(['1', '8', '9', '10', '11', '12', '20'])
    expect(wrapper.find('.pagination-button.active').text()).toBe('10')
  })

  it('uses a custom summary when provided', () => {
    const wrapper = mountControls({ summary: 'Hiển thị 1-20 trong 45 chỗ nghỉ' })
    expect(wrapper.find('.pagination-summary').text()).toBe('Hiển thị 1-20 trong 45 chỗ nghỉ')
  })

  it('disables prev on the first page and next on the last page', () => {
    const first = buttons(mountControls({ page: 1 }))
    expect(first[0].attributes('disabled')).toBeDefined()
    expect(first[first.length - 1].attributes('disabled')).toBeUndefined()

    const last = buttons(mountControls({ page: 3 }))
    expect(last[0].attributes('disabled')).toBeUndefined()
    expect(last[last.length - 1].attributes('disabled')).toBeDefined()
  })

  it('emits change with the clicked page', async () => {
    const wrapper = mountControls({ page: 2, totalPages: 5, total: 100 })
    const target = wrapper
      .findAll('.pagination-button.page-number')
      .find((b) => b.text() === '3')

    await target.trigger('click')

    expect(wrapper.emitted('change')).toEqual([[3]])
  })

  it('does not emit when clicking the current page or while loading', async () => {
    const current = mountControls({ page: 2, totalPages: 5, total: 100 })
    const currentBtn = current
      .findAll('.pagination-button.page-number')
      .find((b) => b.text() === '2')
    await currentBtn.trigger('click')
    expect(current.emitted('change')).toBeUndefined()

    const loading = mountControls({ page: 2, totalPages: 5, total: 100, isLoading: true })
    const nextBtn = buttons(loading)[buttons(loading).length - 1]
    await nextBtn.trigger('click')
    expect(loading.emitted('change')).toBeUndefined()
  })
})
