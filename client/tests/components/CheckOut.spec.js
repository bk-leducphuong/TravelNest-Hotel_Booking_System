import { mount, flushPromises } from '@vue/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createI18n } from 'vue-i18n';
import en from '@/locales/en.json';
import CheckOut from '@/components/book/CheckOut.vue';
import { loadStripe } from '@stripe/stripe-js';
import { BookingService } from '@/services/booking.service';
vi.mock('@stripe/stripe-js', () => ({ loadStripe: vi.fn() }));
vi.mock('@/services/booking.service', () => ({
  BookingService: { createBooking: vi.fn(), createBookingPaymentIntent: vi.fn() },
}));
vi.mock('@/services/payment.service', () => ({
  PaymentService: { listPaymentMethods: vi.fn().mockResolvedValue({ data: [] }) },
}));
const card = { mount: vi.fn(), on: vi.fn(), destroy: vi.fn() };
let confirm;
function render() {
  return mount(CheckOut, {
    props: {
      bookingInfor: { holdId: 'hold-1' },
      searchData: {},
      userInfor: {
        fullName: 'Test Guest',
        email: 'test@example.test',
        phoneNumber: '+84912345678',
      },
    },
    global: {
      plugins: [createI18n({ locale: 'en', messages: { en } })],
      mocks: { $store: { dispatch: vi.fn() }, $router: { replace: vi.fn() } },
    },
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  confirm = vi.fn();
  loadStripe.mockResolvedValue({
    elements: () => ({ create: () => card }),
    confirmCardPayment: confirm,
  });
  BookingService.createBooking.mockResolvedValue({ data: { bookingId: 1, bookingCode: 'TN123' } });
  BookingService.createBookingPaymentIntent.mockResolvedValue({
    data: { clientSecret: 'test-secret', status: 'requires_payment_method' },
  });
});
describe('checkout retry and payment status', () => {
  it('keeps a failed payment on the same booking and uses entered contact values', async () => {
    confirm
      .mockResolvedValueOnce({ error: { message: 'Card declined' } })
      .mockResolvedValueOnce({ paymentIntent: { status: 'succeeded' } });
    const wrapper = render();
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toContain('Card declined');
    expect(wrapper.vm.$router.replace).not.toHaveBeenCalled();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(BookingService.createBooking).toHaveBeenCalledTimes(1);
    expect(BookingService.createBooking).toHaveBeenCalledWith(
      {
        holdId: 'hold-1',
        guestDetails: {
          fullName: 'Test Guest',
          email: 'test@example.test',
          phoneNumber: '+84912345678',
        },
      },
      expect.any(String)
    );
    expect(wrapper.vm.$router.replace).toHaveBeenCalledWith({
      path: '/book/complete',
      query: { bookingCode: 'TN123' },
    });
    wrapper.unmount();
    expect(card.destroy).toHaveBeenCalled();
  });
  it('shows recovery when Stripe initialization fails without creating a booking', async () => {
    loadStripe.mockRejectedValueOnce(new Error('offline'));
    const wrapper = render();
    await flushPromises();
    expect(wrapper.text()).toContain(en.guest.checkout.paymentUnavailable);
    expect(wrapper.find('button[type=submit]').attributes('disabled')).toBeDefined();
    expect(BookingService.createBooking).not.toHaveBeenCalled();
    wrapper.unmount();
  });
  it('does not report an incomplete confirmation as paid', async () => {
    confirm.mockResolvedValue({ paymentIntent: { status: 'requires_action' } });
    const wrapper = render();
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toContain(en.guest.checkout.paymentIncomplete);
    expect(wrapper.vm.$router.replace).not.toHaveBeenCalled();
    wrapper.unmount();
  });
});
