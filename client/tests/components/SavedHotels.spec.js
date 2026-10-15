import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { UserService } from '@/services/user.service'
import SavedHotels from '@/views/SavedHotels.vue'

vi.mock('@/services/user.service', () => ({
  UserService: {
    getFavoriteHotels: vi.fn(),
    removeFavoriteHotel: vi.fn(),
  },
}))
vi.mock('@/request/errorHandler', () => ({ default: vi.fn() }))
const { toastSuccess } = vi.hoisted(() => ({ toastSuccess: vi.fn() }))
vi.mock('vue-toastification', () => ({
  useToast: () => ({ success: toastSuccess, error: vi.fn(), info: vi.fn() }),
}))
// Mock the layout children so the test never pulls in Element Plus styles
// (which jsdom/vitest cannot resolve as a plain node import).
vi.mock('@/components/Header.vue', () => ({ default: { name: 'TheHeader', render: () => null } }))
vi.mock('@/components/Footer.vue', () => ({ default: { name: 'TheFooter', render: () => null } }))
vi.mock('@/components/common/SkeletonGrid.vue', () => ({
  default: { name: 'SkeletonGrid', render: () => null },
}))
vi.mock('@/components/common/EmptyState.vue', () => ({
  default: { name: 'EmptyState', render: () => null },
}))

const makeHotels = (count) =>
  Array.from({ length: count }, (_, i) => ({
    hotel_id: i + 1,
    hotelInformation: {
      name: `Hotel ${i + 1}`,
      image_urls: ['https://example.com/image.jpg'],
      hotel_class: 3,
      overall_rating: 7.5,
      address: `Address ${i + 1}`,
    },
  }))

const mountView = (hotels) => {
  UserService.getFavoriteHotels.mockResolvedValue({ data: hotels })
  const push = vi.fn()
  const wrapper = mount(SavedHotels, {
    global: {
      mocks: {
        $store: { getters: { 'user/getUserInformation': {} } },
        $router: { push },
      },
      stubs: {
        TheHeader: true,
        TheFooter: true,
        SkeletonGrid: true,
        EmptyState: true,
      },
    },
  })
  return { wrapper, push }
}

// jsdom has no layout engine, so scrollWidth/clientWidth are always 0. Stub
// the measurements to emulate a real (over)flowing slider before measuring.
const setSliderMetrics = (wrapper, { scrollWidth, clientWidth, scrollLeft = 0 }) => {
  const el = wrapper.find('.slider-wrapper').element
  Object.defineProperty(el, 'scrollWidth', { configurable: true, value: scrollWidth })
  Object.defineProperty(el, 'clientWidth', { configurable: true, value: clientWidth })
  Object.defineProperty(el, 'scrollLeft', {
    configurable: true,
    writable: true,
    value: scrollLeft,
  })
  el.scrollTo = vi.fn()
  wrapper.vm.updateSliderMetrics()
  return el
}

const isDisabled = (wrapper, selector) =>
  wrapper.find(selector).attributes('disabled') !== undefined

describe('SavedHotels', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders one card per saved hotel', async () => {
    const { wrapper } = mountView(makeHotels(13))
    await flushPromises()

    expect(wrapper.findAll('.hotel-card')).toHaveLength(13)
  })

  it('enables the next arrow once the row overflows (regression)', async () => {
    const { wrapper } = mountView(makeHotels(13))
    await flushPromises()

    setSliderMetrics(wrapper, { scrollWidth: 3000, clientWidth: 1200 })
    await wrapper.vm.$nextTick()

    expect(isDisabled(wrapper, '.nav-button.prev')).toBe(true)
    expect(isDisabled(wrapper, '.nav-button.next')).toBe(false)
  })

  it('disables both arrows when the cards fit without overflow', async () => {
    const { wrapper } = mountView(makeHotels(2))
    await flushPromises()

    setSliderMetrics(wrapper, { scrollWidth: 480, clientWidth: 1200 })
    await wrapper.vm.$nextTick()

    expect(isDisabled(wrapper, '.nav-button.prev')).toBe(true)
    expect(isDisabled(wrapper, '.nav-button.next')).toBe(true)
  })

  it('advances the slider and clamps at both ends', async () => {
    const { wrapper } = mountView(makeHotels(13))
    await flushPromises()

    const el = setSliderMetrics(wrapper, { scrollWidth: 1400, clientWidth: 1200 })
    await wrapper.vm.$nextTick()

    await wrapper.find('.nav-button.next').trigger('click')
    expect(wrapper.vm.sliderPosition).toBe(200) // maxScroll clamps the +300 step
    expect(el.scrollTo).toHaveBeenCalledWith({ left: 200, behavior: 'smooth' })

    await wrapper.vm.$nextTick()
    expect(isDisabled(wrapper, '.nav-button.next')).toBe(true)

    await wrapper.find('.nav-button.prev').trigger('click')
    expect(wrapper.vm.sliderPosition).toBe(0)
  })

  it('opens the hotel detail page when a card is clicked (#99)', async () => {
    const { wrapper, push } = mountView(makeHotels(2))
    await flushPromises()

    await wrapper.find('.hotel-card').trigger('click')

    expect(push).toHaveBeenCalledWith({
      name: 'HotelDetails',
      params: { hotel_id: 1 },
    })
  })

  it('removes a hotel via the × without navigating, and confirms (#99)', async () => {
    const { wrapper, push } = mountView(makeHotels(3))
    await flushPromises()
    UserService.removeFavoriteHotel.mockResolvedValue()

    await wrapper.find('.close-button').trigger('click')
    await flushPromises()

    expect(UserService.removeFavoriteHotel).toHaveBeenCalledWith(1)
    expect(wrapper.findAll('.hotel-card')).toHaveLength(2)
    expect(push).not.toHaveBeenCalled() // the × must not open the card
    expect(toastSuccess).toHaveBeenCalled()
  })
})
