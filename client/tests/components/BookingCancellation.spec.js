import { it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import en from '@/locales/en.json';
import BookingCancellation from '@/views/BookingCancellation.vue';
import { BookingService } from '@/services/booking.service';
vi.mock('@/components/Header.vue', () => ({ default: { template: '<header />' } }));
vi.mock('@/components/Footer.vue', () => ({ default: { template: '<footer />' } }));
vi.mock('@/services/booking.service', () => ({
  BookingService: {
    getBookingByCode: vi.fn(),
    getCancellationQuote: vi.fn(),
    cancelBooking: vi.fn(),
    getRefundStatus: vi.fn(),
  },
}));
const quote = {
  quoteId: 'q1',
  refundAmount: 75,
  amountPaid: 100,
  cancellationFee: 25,
  currency: 'USD',
  eligibility: 'eligible',
  etaDays: { min: 5, max: 10 },
};
const mountPage = () =>
  mount(BookingCancellation, {
    global: {
      plugins: [createI18n({ legacy: true, locale: 'en', messages: { en } })],
      mocks: { $route: { params: { bookingCode: 'TN1' } } },
      stubs: { RouterLink: { template: '<a><slot /></a>' } },
    },
  });
beforeEach(() => {
  vi.clearAllMocks();
  BookingService.getBookingByCode.mockResolvedValue({
    data: {
      id: 'b1',
      booking_code: 'TN1',
      status: 'confirmed',
      total_price: 100,
      currency: 'USD',
      hotel: { name: 'Refund hotel' },
    },
  });
  BookingService.getCancellationQuote.mockResolvedValue({ data: { ...quote } });
  BookingService.cancelBooking.mockResolvedValue({
    data: {
      decision: { outcome: 'refund_required' },
      refund: { amount: 75, currency: 'USD', status: 'pending', workflowState: 'queued' },
    },
  });
  BookingService.getRefundStatus.mockResolvedValue({
    data: {
      decision: {
        outcome: 'refund_required',
        quote: { cancellationFee: 25, currency: 'USD', etaDays: { min: 5, max: 10 } },
      },
      refund: {
        amount: 75,
        currency: 'USD',
        status: 'pending',
        workflowState: 'queued',
        eligibility: 'eligible',
      },
    },
  });
});
it('shows the server quote and confirms it without an opt-out refund checkbox', async () => {
  const wrapper = mountPage();
  await flushPromises();
  expect(wrapper.text()).toContain('75.00');
  expect(wrapper.text()).toContain('25.00');
  expect(wrapper.findAll('input[type=checkbox]')).toHaveLength(1);
  await wrapper.find('input[type=checkbox]').setValue(true);
  await wrapper.find('form').trigger('submit');
  await flushPromises();
  expect(BookingService.cancelBooking).toHaveBeenCalledWith('b1', 'q1');
  expect(wrapper.text()).toContain('Refund queued for processing.');
  expect(wrapper.text()).not.toContain('24 hours');
  wrapper.unmount();
});
it('reopens refund tracking for an already cancelled booking', async () => {
  BookingService.getBookingByCode.mockResolvedValue({
    data: {
      id: 'b1',
      booking_code: 'TN1',
      status: 'cancelled',
      total_price: 100,
      currency: 'USD',
      hotel: { name: 'Refund hotel' },
    },
  });

  const wrapper = mountPage();
  await flushPromises();

  expect(BookingService.getCancellationQuote).not.toHaveBeenCalled();
  expect(BookingService.getRefundStatus).toHaveBeenCalledWith('b1');
  expect(wrapper.text()).toContain(en.guest.cancel.trackingTitle);
  expect(wrapper.text()).toContain(en.guest.cancel.status.queued);
  wrapper.unmount();
});

it('requires acknowledgement again when the quote expires', async () => {
  BookingService.cancelBooking.mockRejectedValue({ response: { status: 409 } });
  const wrapper = mountPage();
  await flushPromises();
  await wrapper.find('input[type=checkbox]').setValue(true);
  await wrapper.find('form').trigger('submit');
  await flushPromises();
  expect(BookingService.getCancellationQuote).toHaveBeenCalledTimes(2);
  expect(wrapper.find('input[type=checkbox]').element.checked).toBe(false);
  expect(wrapper.text()).toContain(en.guest.cancel.quoteChanged);
  wrapper.unmount();
});
it('shows an undecided review instead of promising a zero refund', async () => {
  BookingService.getCancellationQuote.mockResolvedValue({
    data: { ...quote, eligibility: 'manual_review', refundAmount: 0 },
  });
  const wrapper = mountPage();
  await flushPromises();
  expect(wrapper.text()).toContain(en.guest.cancel.manualReview);
  expect(wrapper.text()).not.toContain('Refund amount: $0');
  wrapper.unmount();
});
