import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import en from '@/locales/en.json';
import RefundTracker from '@/components/booking/RefundTracker.vue';
import { BookingService } from '@/services/booking.service';

vi.mock('@/services/booking.service', () => ({
  BookingService: { getRefundStatus: vi.fn() },
}));
vi.mock('@/components/common/FeedbackMessage.vue', () => ({
  default: {
    name: 'FeedbackMessage',
    props: ['message'],
    emits: ['retry'],
    template: '<div role="alert" @click="$emit(\'retry\')">{{ message }}</div>',
  },
}));

const mountTracker = (props = {}) =>
  mount(RefundTracker, {
    props: { bookingId: 'b1', bookingCode: 'TN1', ...props },
    global: {
      plugins: [createI18n({ legacy: true, locale: 'en', messages: { en } })],
    },
  });

const statusResponse = ({ outcome = 'refund_required', refund = null } = {}) => ({
  data: {
    decision: {
      outcome,
      quote: { cancellationFee: 25, currency: 'USD', etaDays: { min: 5, max: 10 } },
    },
    refund,
  },
});

const refund = (overrides = {}) => ({
  refundId: 'ref-1',
  amount: 75,
  currency: 'USD',
  status: 'processing',
  workflowState: 'provider_pending',
  eligibility: 'eligible',
  ...overrides,
});

describe('RefundTracker', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the amount, destination and estimate while a refund is in flight', async () => {
    BookingService.getRefundStatus.mockResolvedValue(statusResponse({ refund: refund() }));

    const wrapper = mountTracker();
    await flushPromises();

    expect(BookingService.getRefundStatus).toHaveBeenCalledWith('b1');
    expect(wrapper.text()).toContain(en.guest.cancel.chip.provider_pending);
    expect(wrapper.text()).toContain(en.guest.cancel.status.provider_pending);
    expect(wrapper.text()).toContain('$75.00');
    expect(wrapper.text()).toContain(en.guest.cancel.destination);
    expect(wrapper.text()).toContain(
      en.guest.cancel.eta.replace('{min}', '5').replace('{max}', '10')
    );
    expect(wrapper.vm.pollTimer).not.toBeNull();
    wrapper.unmount();
  });

  it('stops polling once the refund is terminal', async () => {
    BookingService.getRefundStatus.mockResolvedValue(
      statusResponse({ refund: refund({ status: 'succeeded', workflowState: 'succeeded' }) })
    );

    const wrapper = mountTracker();
    await flushPromises();

    expect(wrapper.text()).toContain(en.guest.cancel.chip.succeeded);
    expect(wrapper.vm.pollTimer).toBeNull();
    wrapper.unmount();
  });

  it('shows an undecided review without an amount', async () => {
    BookingService.getRefundStatus.mockResolvedValue(
      statusResponse({
        outcome: 'manual_review',
        refund: refund({ amount: 0, eligibility: 'manual_review', workflowState: 'manual_review' }),
      })
    );

    const wrapper = mountTracker();
    await flushPromises();

    expect(wrapper.text()).toContain(en.guest.cancel.chip.manual_review);
    expect(wrapper.text()).not.toContain('$0.00');
    expect(wrapper.text()).toContain('TN1');
    wrapper.unmount();
  });

  it('shows no-refund decisions without promising money', async () => {
    BookingService.getRefundStatus.mockResolvedValue(statusResponse({ outcome: 'no_refund' }));

    const wrapper = mountTracker();
    await flushPromises();

    expect(wrapper.text()).toContain(en.guest.cancel.chip.no_refund);
    expect(wrapper.text()).toContain(en.guest.cancel.status.no_refund);
    expect(wrapper.vm.pollTimer).toBeNull();
    wrapper.unmount();
  });

  it('shows a retry state when the status request fails', async () => {
    BookingService.getRefundStatus.mockRejectedValue({ response: { status: 503 } });

    const wrapper = mountTracker();
    await flushPromises();

    expect(wrapper.find('[role=alert]').text()).toContain(en.guest.refundUnavailable);
    BookingService.getRefundStatus.mockResolvedValue(statusResponse({ refund: refund() }));
    await wrapper.find('[role=alert]').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain(en.guest.cancel.status.provider_pending);
    wrapper.unmount();
  });
});
