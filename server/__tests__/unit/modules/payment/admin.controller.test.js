jest.mock('@modules/payment/application/admin/listTransactions', () => ({
  listTransactions: jest.fn(),
}));
jest.mock('@modules/payment/application/admin/getTransaction', () => ({ getTransaction: jest.fn() }));
jest.mock('@modules/payment/application/admin/getHotelPaymentSummary', () => ({
  getHotelPaymentSummary: jest.fn(),
}));
jest.mock('@modules/payment/application/admin/initiateRefund', () => ({ initiateRefund: jest.fn() }));
jest.mock('@modules/payment/application/admin/listRefunds', () => ({ listRefunds: jest.fn() }));
jest.mock('@modules/payment/application/admin/getRefund', () => ({ getRefund: jest.fn() }));
jest.mock('@modules/payment/application/admin/retryRefund', () => ({ retryRefund: jest.fn() }));

const { getTransaction } = require('@modules/payment/application/admin/getTransaction');
const { getRefund } = require('@modules/payment/application/admin/getRefund');
const { initiateRefund } = require('@modules/payment/application/admin/initiateRefund');
const controller = require('@modules/payment/api/admin.controller');

describe('payment admin controller ownership guard', () => {
  it('404s a transaction from another hotel', async () => {
    getTransaction.mockResolvedValue({ id: 't1', hotel_id: 'h2' });
    const next = global.testUtils.mockNext();

    await controller.getTransactionHandler(
      global.testUtils.mockRequest({
        params: { transactionId: 't1' },
        hotelContext: { hotelId: 'h1', isPlatformAdmin: false },
      }),
      global.testUtils.mockResponse(),
      next
    );

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
  });

  it('404s a refund from another hotel', async () => {
    getRefund.mockResolvedValue({ id: 'r1', hotel_id: 'h2' });
    const next = global.testUtils.mockNext();

    await controller.getRefundHandler(
      global.testUtils.mockRequest({
        params: { refundId: 'r1' },
        hotelContext: { hotelId: 'h1', isPlatformAdmin: false },
      }),
      global.testUtils.mockResponse(),
      next
    );

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
  });

  it('blocks a cross-hotel refund before it runs', async () => {
    getTransaction.mockResolvedValue({ id: 't1', hotel_id: 'h2' });
    const next = global.testUtils.mockNext();

    await controller.initiateRefundHandler(
      global.testUtils.mockRequest({
        params: { transactionId: 't1' },
        body: {},
        hotelContext: { hotelId: 'h1', isPlatformAdmin: false },
      }),
      global.testUtils.mockResponse(),
      next
    );

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
    expect(initiateRefund).not.toHaveBeenCalled();
  });
});
