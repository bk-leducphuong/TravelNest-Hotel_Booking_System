const mockAdapterInstance = {
  detachPaymentMethod: jest.fn(),
  updateCustomerDefaultPaymentMethod: jest.fn(),
};

jest.mock('@modules/payment/infrastructure/adapters/stripe-payment.adapter', () =>
  jest.fn(() => mockAdapterInstance)
);

jest.mock('@modules/payment/infrastructure/saved-payment-method.repository', () => ({
  findByPaymentMethodId: jest.fn(),
  findByUserId: jest.fn(),
  deleteByPaymentMethodId: jest.fn(),
  setDefaultById: jest.fn(),
}));

const savedPaymentMethodRepository = require('@modules/payment/infrastructure/saved-payment-method.repository');
const { removePaymentMethod } = require('@modules/payment/application/guest/removePaymentMethod');

describe('payment/application/guest/removePaymentMethod', () => {
  it('throws 404 for a card owned by another user', async () => {
    savedPaymentMethodRepository.findByPaymentMethodId.mockResolvedValue({
      id: 'row_1',
      user_id: 'someone-else',
    });

    await expect(removePaymentMethod('u1', 'pm_1')).rejects.toMatchObject({
      statusCode: 404,
      code: 'PAYMENT_METHOD_NOT_FOUND',
    });
  });

  it('detaches and deletes a non-default card', async () => {
    savedPaymentMethodRepository.findByPaymentMethodId.mockResolvedValue({
      id: 'row_1',
      user_id: 'u1',
      is_default: false,
      stripe_payment_method_id: 'pm_1',
    });

    const result = await removePaymentMethod('u1', 'pm_1');

    expect(mockAdapterInstance.detachPaymentMethod).toHaveBeenCalledWith('pm_1');
    expect(savedPaymentMethodRepository.deleteByPaymentMethodId).toHaveBeenCalledWith('pm_1');
    expect(mockAdapterInstance.updateCustomerDefaultPaymentMethod).not.toHaveBeenCalled();
    expect(result).toEqual({
      id: 'pm_1',
      removed: true,
      defaultPaymentMethodId: null,
    });
  });

  it('promotes the next card when the default is removed', async () => {
    savedPaymentMethodRepository.findByPaymentMethodId.mockResolvedValue({
      id: 'row_1',
      user_id: 'u1',
      is_default: true,
      stripe_customer_id: 'cus_1',
      stripe_payment_method_id: 'pm_1',
    });
    savedPaymentMethodRepository.findByUserId.mockResolvedValue([
      { id: 'row_2', stripe_customer_id: 'cus_1', stripe_payment_method_id: 'pm_2' },
    ]);

    const result = await removePaymentMethod('u1', 'pm_1');

    expect(mockAdapterInstance.updateCustomerDefaultPaymentMethod).toHaveBeenCalledWith(
      'cus_1',
      'pm_2'
    );
    expect(savedPaymentMethodRepository.setDefaultById).toHaveBeenCalledWith('row_2');
    expect(result.defaultPaymentMethodId).toBe('pm_2');
  });

  it('clears the Stripe default when the last card is removed', async () => {
    savedPaymentMethodRepository.findByPaymentMethodId.mockResolvedValue({
      id: 'row_1',
      user_id: 'u1',
      is_default: true,
      stripe_customer_id: 'cus_1',
      stripe_payment_method_id: 'pm_1',
    });
    savedPaymentMethodRepository.findByUserId.mockResolvedValue([]);

    const result = await removePaymentMethod('u1', 'pm_1');

    expect(mockAdapterInstance.updateCustomerDefaultPaymentMethod).toHaveBeenCalledWith(
      'cus_1',
      null
    );
    expect(result.defaultPaymentMethodId).toBeNull();
  });
});
