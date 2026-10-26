import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { UserService } from '@/services/user.service';
import SavedHotels from '@/views/SavedHotels.vue';

vi.mock('@/services/user.service', () => ({
  UserService: {
    getFavoriteHotels: vi.fn(),
    removeFavoriteHotel: vi.fn(),
  },
}));
vi.mock('@/request/errorHandler', () => ({ default: vi.fn() }));
const { toastSuccess } = vi.hoisted(() => ({ toastSuccess: vi.fn() }));
vi.mock('vue-toastification', () => ({
  useToast: () => ({ success: toastSuccess, error: vi.fn(), info: vi.fn() }),
}));
// Mock the layout children so the test never pulls in Element Plus styles
// (which jsdom/vitest cannot resolve as a plain node import).
vi.mock('@/components/Header.vue', () => ({ default: { name: 'TheHeader', render: () => null } }));
vi.mock('@/components/Footer.vue', () => ({ default: { name: 'TheFooter', render: () => null } }));
vi.mock('@/components/common/SkeletonGrid.vue', () => ({
  default: { name: 'SkeletonGrid', render: () => null },
}));
vi.mock('@/components/common/EmptyState.vue', () => ({
  default: { name: 'EmptyState', render: () => null },
}));

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
  }));

const mountView = (hotels) => {
  UserService.getFavoriteHotels.mockImplementation(async ({ page = 1, limit = 12 } = {}) => ({
    data: hotels.slice((page - 1) * limit, page * limit),
    meta: { page, limit, total: hotels.length },
  }));
  const push = vi.fn();
  const wrapper = mount(SavedHotels, {
    global: {
      mocks: {
        $store: { getters: { 'user/getUserInformation': {} } },
        $router: { push },
        $t: (key) => key,
      },
      stubs: {
        TheHeader: true,
        TheFooter: true,
        SkeletonGrid: true,
        EmptyState: true,
      },
    },
  });
  return { wrapper, push };
};

describe('SavedHotels', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders a bounded first page and the total saved count', async () => {
    const { wrapper } = mountView(makeHotels(13));
    await flushPromises();

    expect(wrapper.findAll('.hotel-card')).toHaveLength(12);
    expect(wrapper.vm.pagination.total).toBe(13);
    expect(UserService.getFavoriteHotels).toHaveBeenCalledWith({ page: 1, limit: 12 });
    expect(wrapper.find('.pagination').exists()).toBe(true);
  });

  it('requests the next server page and keeps the selected layout', async () => {
    const { wrapper } = mountView(makeHotels(13));
    await flushPromises();
    await wrapper.findAll('.saved-display-toggle button')[0].trigger('click');
    await wrapper.findAll('.pagination button').at(-1).trigger('click');
    await flushPromises();
    expect(UserService.getFavoriteHotels).toHaveBeenLastCalledWith({ page: 2, limit: 12 });
    expect(wrapper.findAll('.hotel-card')).toHaveLength(1);
    expect(wrapper.find('.hotel-card').text()).toContain('Hotel 13');
    expect(wrapper.find('.saved-hotels--list').exists()).toBe(true);
    expect(wrapper.vm.pagination.total).toBe(13);
    wrapper.unmount();
  });

  it('saves layout preferences without fetching the saved hotels again', async () => {
    const { wrapper } = mountView(makeHotels(3));
    await flushPromises();
    expect(wrapper.find('.saved-hotels--grid').exists()).toBe(true);
    await wrapper.findAll('.saved-display-toggle button')[0].trigger('click');
    expect(localStorage.getItem('travelnest:saved-hotels:display')).toBe('list');
    expect(UserService.getFavoriteHotels).toHaveBeenCalledTimes(1);
    expect(wrapper.findAll('.hotel-card')).toHaveLength(3);
    wrapper.unmount();
    const { wrapper: restored } = mountView(makeHotels(3));
    await flushPromises();
    expect(restored.find('.saved-hotels--list').exists()).toBe(true);
    restored.unmount();
  });

  it('keeps layout selection working when storage is blocked', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Blocked');
    });
    const { wrapper } = mountView(makeHotels(1));
    await flushPromises();
    await wrapper.findAll('.saved-display-toggle button')[0].trigger('click');
    expect(wrapper.find('.saved-hotels--list').exists()).toBe(true);
    wrapper.unmount();
  });

  it('returns to the previous page after removing the last hotel on the final page', async () => {
    const { wrapper } = mountView(makeHotels(13));
    await flushPromises();
    await wrapper.findAll('.pagination button').at(-1).trigger('click');
    await flushPromises();
    UserService.removeFavoriteHotel.mockResolvedValue();
    UserService.getFavoriteHotels.mockResolvedValueOnce({
      data: makeHotels(12),
      meta: { page: 1, limit: 12, total: 12 },
    });
    await wrapper.find('.close-button').trigger('click');
    await flushPromises();
    expect(UserService.removeFavoriteHotel).toHaveBeenCalledWith(13);
    expect(UserService.getFavoriteHotels).toHaveBeenLastCalledWith({ page: 1, limit: 12 });
    expect(wrapper.findAll('.hotel-card')).toHaveLength(12);
    expect(wrapper.find('.pagination').exists()).toBe(false);
    expect(wrapper.vm.pagination.total).toBe(12);
    wrapper.unmount();
  });

  it('keeps a saved card when removing it fails', async () => {
    const { wrapper } = mountView(makeHotels(1));
    await flushPromises();
    UserService.removeFavoriteHotel.mockRejectedValueOnce(new Error('offline'));
    await wrapper.find('.close-button').trigger('click');
    await flushPromises();
    expect(wrapper.findAll('.hotel-card')).toHaveLength(1);
    expect(wrapper.vm.pagination.total).toBe(1);
    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it('shows a load failure separately and retries without losing the page', async () => {
    const { wrapper } = mountView([]);
    await flushPromises();
    UserService.getFavoriteHotels.mockRejectedValueOnce(new Error('offline'));
    await wrapper.vm.getSavedHotels();
    await flushPromises();
    expect(wrapper.find('[role=alert]').exists()).toBe(true);
    UserService.getFavoriteHotels.mockResolvedValue({ data: makeHotels(1) });
    await wrapper.find('[role=alert] button').trigger('click');
    await flushPromises();
    expect(wrapper.findAll('.hotel-card')).toHaveLength(1);
    wrapper.unmount();
  });

  it('opens the hotel detail page when a card is clicked (#99)', async () => {
    const { wrapper, push } = mountView(makeHotels(2));
    await flushPromises();

    await wrapper.find('.hotel-card a').trigger('click');

    expect(push).toHaveBeenCalledWith({
      name: 'HotelDetails',
      params: { hotel_id: 1 },
    });
  });

  it('removes a hotel via the × without navigating, and confirms (#99)', async () => {
    const { wrapper, push } = mountView(makeHotels(3));
    await flushPromises();
    UserService.removeFavoriteHotel.mockResolvedValue();

    await wrapper.find('.close-button').trigger('click');
    await flushPromises();

    expect(UserService.removeFavoriteHotel).toHaveBeenCalledWith(1);
    expect(wrapper.findAll('.hotel-card')).toHaveLength(2);
    expect(push).not.toHaveBeenCalled(); // the × must not open the card
    expect(wrapper.find('[role="status"]').text()).toContain('savedHotel.page.removed');
    expect(toastSuccess).not.toHaveBeenCalled();
  });
});
