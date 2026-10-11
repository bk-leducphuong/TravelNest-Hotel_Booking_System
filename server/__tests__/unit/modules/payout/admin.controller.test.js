jest.mock('@modules/payout/application/admin/listPayouts', () => ({ listPayouts: jest.fn() }));
jest.mock('@modules/payout/application/admin/getPayout', () => ({ getPayout: jest.fn() }));
jest.mock('@modules/payout/application/admin/getConnectedAccount', () => ({
  getConnectedAccount: jest.fn(),
}));
jest.mock('@modules/payout/application/admin/getHotelPayoutSummary', () => ({
  getHotelPayoutSummary: jest.fn(),
}));
jest.mock('@modules/payout/application/admin/generateEligiblePayouts', () => ({
  generateEligiblePayouts: jest.fn(),
}));
jest.mock('@modules/payout/application/admin/processPayout', () => ({ processPayout: jest.fn() }));
jest.mock('@modules/payout/application/admin/setPayoutStatus', () => ({
  setPayoutStatus: jest.fn(),
}));
jest.mock('@modules/payout/application/admin/listConnectedAccounts', () => ({
  listConnectedAccounts: jest.fn(),
}));
jest.mock('@modules/payout/application/admin/checkConnectedAccount', () => ({
  checkConnectedAccount: jest.fn(),
}));
jest.mock('@modules/payout/application/admin/createConnectAccount', () => ({
  createConnectAccount: jest.fn(),
}));
jest.mock('@modules/payout/application/admin/createAccountLink', () => ({
  createAccountLink: jest.fn(),
}));
jest.mock('@modules/payout/application/admin/syncConnectedAccount', () => ({
  syncConnectedAccount: jest.fn(),
}));

const { getPayout } = require('@modules/payout/application/admin/getPayout');
const { getConnectedAccount } = require('@modules/payout/application/admin/getConnectedAccount');
const { processPayout } = require('@modules/payout/application/admin/processPayout');
const { createAccountLink } = require('@modules/payout/application/admin/createAccountLink');
const controller = require('@modules/payout/api/admin.controller');

describe('payout admin controller ownership guard', () => {
  it('404s a payout from another hotel', async () => {
    getPayout.mockResolvedValue({ id: 'p1', hotel_id: 'h2' });
    const next = global.testUtils.mockNext();

    await controller.getPayoutHandler(
      global.testUtils.mockRequest({
        params: { payoutId: 'p1' },
        hotelContext: { hotelId: 'h1', isPlatformAdmin: false },
      }),
      global.testUtils.mockResponse(),
      next
    );

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
  });

  it('blocks processing a cross-hotel payout', async () => {
    getPayout.mockResolvedValue({ id: 'p1', hotel_id: 'h2' });
    const next = global.testUtils.mockNext();

    await controller.processPayoutHandler(
      global.testUtils.mockRequest({
        params: { payoutId: 'p1' },
        hotelContext: { hotelId: 'h1', isPlatformAdmin: false },
      }),
      global.testUtils.mockResponse(),
      next
    );

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
    expect(processPayout).not.toHaveBeenCalled();
  });

  it('blocks linking a cross-hotel connected account', async () => {
    getConnectedAccount.mockResolvedValue({ id: 'ca1', hotel_id: 'h2' });
    const next = global.testUtils.mockNext();

    await controller.createAccountLinkHandler(
      global.testUtils.mockRequest({
        params: { accountId: 'ca1' },
        body: {},
        hotelContext: { hotelId: 'h1', isPlatformAdmin: false },
      }),
      global.testUtils.mockResponse(),
      next
    );

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
    expect(createAccountLink).not.toHaveBeenCalled();
  });
});
