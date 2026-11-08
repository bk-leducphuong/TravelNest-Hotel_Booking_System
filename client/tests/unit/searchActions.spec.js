import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/search.service', () => ({
  SearchService: { saveSearch: vi.fn().mockResolvedValue({}) },
}));

import actions from '@/stores/search/actions';
import { SearchService } from '@/services/search.service';

const state = {
  searchData: {
    location: 'Ha Noi',
    checkInDate: '2026-11-10',
    checkOutDate: '2026-11-13',
    adults: 2,
    children: 0,
    rooms: 1,
    numberOfDays: 3,
  },
};

const savedEntry = () => JSON.parse(localStorage.getItem('recentSearches'))[0];

describe('search store recent-search persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    SearchService.saveSearch.mockClear();
  });

  it('keeps the coordinates and radius with the recent search', async () => {
    await actions.saveSearchInformation(
      { state },
      { latitude: '21.029', longitude: '105.805', radius: '5', locationSource: 'gps' }
    );

    expect(savedEntry()).toMatchObject({
      latitude: 21.029,
      longitude: 105.805,
      radius: 5,
      locationSource: 'gps',
    });
    expect(SearchService.saveSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        latitude: 21.029,
        longitude: 105.805,
        radius: 5,
        locationSource: 'gps',
      })
    );
  });

  it('does not turn missing coordinates into 0,0', async () => {
    await actions.saveSearchInformation({ state }, { latitude: null, longitude: null });

    expect(savedEntry().latitude).toBeUndefined();
    expect(savedEntry().longitude).toBeUndefined();
    expect(SearchService.saveSearch).toHaveBeenCalledWith(
      expect.not.objectContaining({ latitude: 0, longitude: 0 })
    );
  });
});
