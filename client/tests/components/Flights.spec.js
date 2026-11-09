import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import en from '@/locales/en.json';
import FlightsView from '@/views/Flights.vue';
import PartnersService from '@/services/partners.service';
import { openPartnerUrl } from '@/utils/partnerLink';

vi.mock('@/services/partners.service', () => ({
  default: { getLink: vi.fn() },
}));
vi.mock('@/utils/partnerLink', () => ({
  openPartnerUrl: vi.fn(() => true),
}));

const mountView = () =>
  mount(FlightsView, {
    global: {
      plugins: [createI18n({ legacy: true, locale: 'en', messages: { en } })],
      stubs: { Header: true, Footer: true },
    },
  });

const fillForm = (wrapper, overrides = {}) => {
  Object.assign(wrapper.vm.form, {
    origin: 'HAN',
    destination: 'SGN',
    departDate: '2026-12-01',
    adults: 2,
    ...overrides,
  });
};

describe('FlightsView', () => {
  beforeEach(() => vi.clearAllMocks());

  it('asks the API for a partner link and renders a sponsored fallback link', async () => {
    PartnersService.getLink.mockResolvedValue({
      data: { service: 'flights', provider: 'Example Air', url: 'https://partner.example/x' },
    });

    const wrapper = mountView();
    fillForm(wrapper);
    await wrapper.vm.submit();
    await flushPromises();

    expect(PartnersService.getLink).toHaveBeenCalledWith(
      'flights',
      expect.objectContaining({ origin: 'HAN', destination: 'SGN', adults: 2 })
    );
    expect(openPartnerUrl).toHaveBeenCalledWith('https://partner.example/x');

    const link = wrapper.find('a.guest-button');
    expect(link.attributes('href')).toBe('https://partner.example/x');
    expect(link.attributes('rel')).toContain('sponsored');
    expect(link.text()).toContain('Example Air');
  });

  it('explains when the partner is not configured yet', async () => {
    PartnersService.getLink.mockRejectedValue({
      response: { data: { error: { code: 'PARTNER_NOT_CONFIGURED' } } },
    });

    const wrapper = mountView();
    fillForm(wrapper);
    await wrapper.vm.submit();
    await flushPromises();

    expect(wrapper.text()).toContain(en['partners.unavailable']);
    expect(wrapper.find('a.guest-button').exists()).toBe(false);
    expect(openPartnerUrl).not.toHaveBeenCalled();
  });
});
