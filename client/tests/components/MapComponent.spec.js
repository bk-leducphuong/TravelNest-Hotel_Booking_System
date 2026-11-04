import { describe, it, expect, vi } from 'vitest';
import { shallowMount, flushPromises } from '@vue/test-utils';
vi.mock('@vue-leaflet/vue-leaflet', () => ({
  LMap: { template: '<div />' },
  LTileLayer: {},
  LMarker: {},
}));
vi.mock('@/components/SavedHotelIcon.vue', () => ({ default: { template: '<span />' } }));
vi.mock('@/services/search.service', () => ({ SearchService: { searchMapHotels: vi.fn() } }));
import MapComponent from '@/components/map/MapComponent.vue';
import { SearchService } from '@/services/search.service';

const hotel = {
  hotel_id: 'h1',
  hotel_name: 'Hotel One',
  latitude: 0,
  longitude: 0,
  currency: 'USD',
  min_price_for_dates: '50',
  min_price_for_requested_rooms: '100',
};
function mountMap() {
  return shallowMount(MapComponent, {
    props: {
      hotels: [hotel],
      searchParams: {
        checkIn: '2099-01-01',
        checkOut: '2099-01-03',
        adults: 2,
        rooms: 2,
        city: 'Old city',
        radius: 10,
      },
    },
    global: {
      stubs: { 'el-dialog': { template: '<div><slot /></div>' } },
      mocks: {
        $t: (key) => key,
        $i18n: { locale: 'en' },
        $store: { getters: {} },
        $router: { push: vi.fn() },
      },
    },
  });
}
describe('hotel map', () => {
  it('accepts zero coordinates and rejects empty or out-of-range coordinates', () => {
    const wrapper = mountMap();
    expect(wrapper.vm.hasCoords(hotel)).toBe(true);
    for (const latitude of ['', null, 'bad', 91])
      expect(wrapper.vm.hasCoords({ ...hotel, latitude })).toBe(false);
    wrapper.unmount();
  });
  it('uses the full requested-room stay total and preserves booking context', () => {
    const wrapper = mountMap();
    expect(wrapper.vm.priceOf(hotel)).toBe(100);
    expect(wrapper.vm.priceLabel(hotel)).toBe('$100.00');
    wrapper.vm.openHotel(hotel);
    expect(wrapper.vm.$router.push).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({ rooms: 2, checkInDate: '2099-01-01' }),
      })
    );
    wrapper.unmount();
  });
  it('replaces destination scope and ignores stale responses', async () => {
    const wrapper = mountMap();
    wrapper.vm.currentBounds = () => ({ north: 11, south: 10, east: 107, west: 106 });
    let resolveFirst;
    SearchService.searchMapHotels
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          })
      )
      .mockResolvedValueOnce({ data: { hotels: [{ ...hotel, hotel_id: 'new' }], hasMore: true } });
    const first = wrapper.vm.searchArea();
    await wrapper.vm.searchArea();
    resolveFirst({ data: { hotels: [hotel] } });
    await first;
    await flushPromises();
    expect(wrapper.vm.results[0].hotel_id).toBe('new');
    expect(wrapper.vm.hasMore).toBe(true);
    expect(SearchService.searchMapHotels.mock.calls.at(-1)[0]).not.toHaveProperty('city');
    expect(SearchService.searchMapHotels.mock.calls.at(-1)[0]).not.toHaveProperty('radius');
    wrapper.unmount();
  });
  it('retains previous results when the network fails', async () => {
    const wrapper = mountMap();
    wrapper.vm.currentBounds = () => ({ north: 11, south: 10, east: 107, west: 106 });
    wrapper.vm.results = [hotel];
    SearchService.searchMapHotels.mockRejectedValueOnce(new Error('offline'));
    await wrapper.vm.searchArea();
    expect(wrapper.vm.results).toEqual([hotel]);
    expect(wrapper.vm.error).toBe('map.loadError');
    wrapper.unmount();
  });
});
