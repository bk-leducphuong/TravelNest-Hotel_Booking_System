import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import en from '@/locales/en.json';
import BookingRecord from '@/components/booking/BookingRecord.vue';
import { BookingService } from '@/services/booking.service';
vi.mock('@/services/booking.service', () => ({ BookingService: { getBookingByCode: vi.fn() } }));
const mountRecord = (code = 'TN123') =>
  mount(BookingRecord, {
    props: { code },
    global: {
      plugins: [createI18n({ legacy: true, locale: 'en', messages: { en } })],
      stubs: { RouterLink: { template: '<a><slot /></a>' }, MediaImage: true },
    },
  });
describe('URL-loaded booking record', () => {
  beforeEach(() => vi.clearAllMocks());
  it('loads its code directly and shows real status, dates and total', async () => {
    BookingService.getBookingByCode.mockResolvedValue({
      data: {
        booking_code: 'TN123',
        status: 'pending_payment',
        check_in_date: '2026-11-10',
        check_out_date: '2026-11-13',
        total_price: '240.50',
        hotel: { name: 'Actual hotel' },
      },
    });
    const wrapper = mountRecord();
    await flushPromises();
    expect(BookingService.getBookingByCode).toHaveBeenCalledWith('TN123');
    expect(wrapper.text()).toContain('Actual hotel');
    expect(wrapper.find('h1').text()).toBe('Awaiting payment');
    expect(wrapper.text()).toContain('3 nights');
    expect(wrapper.text()).toContain('240.50');
    expect(wrapper.text()).not.toMatch(/4338|Chalet|Genius|PKR/);
    wrapper.unmount();
  });
  it('distinguishes failed fetch from empty data and supports retry', async () => {
    BookingService.getBookingByCode
      .mockRejectedValueOnce({ response: { status: 503 } })
      .mockResolvedValueOnce({
        data: { booking_code: 'TN123', status: 'cancelled', hotel: { name: 'Recovered' } },
      });
    const wrapper = mountRecord();
    await flushPromises();
    expect(wrapper.find('[role=alert]').text()).toContain(en.guest.loadFailed);
    await wrapper.find('[role=alert] button').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Recovered');
    expect(wrapper.find('[role=alert]').exists()).toBe(false);
    wrapper.unmount();
  });
  it('does not let an earlier code overwrite a later navigation', async () => {
    let resolveOld;
    BookingService.getBookingByCode
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveOld = resolve;
          })
      )
      .mockResolvedValueOnce({ data: { booking_code: 'NEW', hotel: { name: 'New hotel' } } });
    const wrapper = mountRecord('OLD');
    await wrapper.setProps({ code: 'NEW' });
    await flushPromises();
    resolveOld({ data: { booking_code: 'OLD', hotel: { name: 'Old hotel' } } });
    await flushPromises();
    expect(wrapper.text()).toContain('New hotel');
    expect(wrapper.text()).not.toContain('Old hotel');
    wrapper.unmount();
  });
});
