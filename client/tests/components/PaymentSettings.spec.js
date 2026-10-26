import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { PaymentService } from '@/services/payment.service';
import PaymentSettings from '@/components/user/account-settings/PaymentSettings.vue';

vi.mock('@/services/payment.service', () => ({
  PaymentService: {
    listPaymentMethods: vi.fn(),
    setDefaultPaymentMethod: vi.fn(),
    removePaymentMethod: vi.fn(),
    createSetupIntent: vi.fn(),
    savePaymentMethod: vi.fn(),
  },
}));

vi.mock('vue-toastification', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

const methods = [
  {
    id: 'pm_1',
    brand: 'visa',
    last4: '4242',
    expMonth: 12,
    expYear: 2030,
    cardholderName: 'Ada Lovelace',
    isDefault: true,
  },
  {
    id: 'pm_2',
    brand: 'mastercard',
    last4: '4444',
    expMonth: 1,
    expYear: 2029,
    cardholderName: 'Ada Lovelace',
    isDefault: false,
  },
];

const mountView = () =>
  mount(PaymentSettings, {
    global: {
      mocks: {
        $store: { getters: { 'user/getUserInformation': { full_name: 'Ada Lovelace' } } },
        $t: (key) => key,
      },
      stubs: {
        // Avoid booting Stripe.js in jsdom.
        AddCardModal: true,
      },
    },
  });

describe('PaymentSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    PaymentService.listPaymentMethods.mockResolvedValue({ data: methods });
  });

  it('renders saved cards with the default badge', async () => {
    const wrapper = mountView();
    await flushPromises();

    const cards = wrapper.findAll('.saved-card');
    expect(cards).toHaveLength(2);
    expect(cards[0].text()).toContain('Visa');
    expect(cards[0].text()).toContain('4242');
    expect(cards[0].find('.default-badge').exists()).toBe(true);
    expect(cards[1].find('.default-badge').exists()).toBe(false);
  });

  it('shows an empty state when there are no cards', async () => {
    PaymentService.listPaymentMethods.mockResolvedValue({ data: [] });

    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.find('.muted-card').exists()).toBe(true);
    expect(wrapper.findAll('.saved-card')).toHaveLength(0);
  });

  it('sets a card as default', async () => {
    PaymentService.setDefaultPaymentMethod.mockResolvedValue({ data: {} });

    const wrapper = mountView();
    await flushPromises();

    await wrapper.find('.saved-card:nth-child(2) .link-button').trigger('click');
    await flushPromises();

    expect(PaymentService.setDefaultPaymentMethod).toHaveBeenCalledWith('pm_2');
    expect(PaymentService.listPaymentMethods).toHaveBeenCalledTimes(2);
  });

  it('confirms before removing a card', async () => {
    PaymentService.removePaymentMethod.mockResolvedValue({ data: { id: 'pm_1', removed: true } });

    const wrapper = mountView();
    await flushPromises();

    await wrapper.find('.saved-card:nth-child(1) .link-button.danger').trigger('click');
    expect(wrapper.findComponent({ name: 'ConfirmDialog' }).exists()).toBe(true);
    expect(PaymentService.removePaymentMethod).not.toHaveBeenCalled();

    await wrapper.find('.danger-button').trigger('click');
    await flushPromises();

    expect(PaymentService.removePaymentMethod).toHaveBeenCalledWith('pm_1');
  });

  it('cancels removal without calling the API', async () => {
    const wrapper = mountView();
    await flushPromises();

    await wrapper.find('.saved-card:nth-child(1) .link-button.danger').trigger('click');
    await wrapper.find('.guest-button-secondary').trigger('click');

    expect(wrapper.findComponent({ name: 'ConfirmDialog' }).exists()).toBe(false);
    expect(PaymentService.removePaymentMethod).not.toHaveBeenCalled();
  });
  it('shows a retryable fetch error instead of an empty card list, then recovers', async () => {
    PaymentService.listPaymentMethods.mockRejectedValueOnce(new Error('internal database failure'));
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.find('[role="alert"]').text()).toContain('account.payment.errors.load');
    expect(wrapper.text()).not.toContain('internal database failure');
    expect(wrapper.find('.muted-card').exists()).toBe(false);
    await wrapper.find('[role="alert"] button').trigger('click');
    await flushPromises();
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect(wrapper.findAll('.saved-card')).toHaveLength(2);
  });

  it('keeps successful action feedback visible until dismissed', async () => {
    const wrapper = mountView();
    await flushPromises();
    await wrapper.find('.saved-card:nth-child(2) .link-button').trigger('click');
    await flushPromises();
    expect(wrapper.find('[role="status"]').text()).toContain(
      'account.payment.toasts.defaultUpdated'
    );
    expect(wrapper.find('[role="status"] svg').exists()).toBe(true);
    await wrapper.find('.section-feedback-dismiss').trigger('click');
    expect(wrapper.find('[role="status"]').exists()).toBe(false);
  });
});
