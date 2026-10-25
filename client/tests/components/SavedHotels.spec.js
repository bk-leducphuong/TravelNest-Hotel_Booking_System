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
  UserService.getFavoriteHotels.mockResolvedValue({ data: hotels });
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
    vi.clearAllMocks();
  });

  it('renders one card per saved hotel', async () => {
    const { wrapper } = mountView(makeHotels(13));
    await flushPromises();

    expect(wrapper.findAll('.hotel-card')).toHaveLength(13);
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
    expect(toastSuccess).toHaveBeenCalled();
  });
});
