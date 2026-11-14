jest.mock('@config/database.config', () => ({ transaction: jest.fn() }));
jest.mock('@config/logger.config', () => ({
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
}));
jest.mock('@modules/notification', () => ({ sendPayoutNotification: jest.fn() }));
jest.mock('@modules/payment', () => ({
  lockHotelBalance: jest.fn(),
  availableHotelBalance: jest.fn(),
  getPrimaryOwnerByHotelId: jest.fn(),
  getTransactionById: jest.fn(),
}));
jest.mock('@modules/payout/infrastructure/payout.repository', () => ({
  findById: jest.fn(),
  findForClaim: jest.fn(),
  findEligibleBookingsForPayout: jest.fn(),
  findReadyConnectedAccount: jest.fn(),
  findConnectedAccountById: jest.fn(),
  create: jest.fn(),
  createItems: jest.fn(),
  update: jest.fn(),
  sumReserved: jest.fn(),
}));
jest.mock('@modules/payout/application/settleTransfer', () => ({
  settleTransfer: jest.fn(),
}));
jest.mock('@modules/payout/infrastructure/stripe-client', () => ({
  isStripeConfigured: jest.fn(),
  getStripe: jest.fn(),
}));
jest.mock('@modules/payout/application/payout-settings', () => ({
  getEligibilityCutoffDate: jest.fn(() => new Date('2026-01-01T00:00:00.000Z')),
  getMinimumPayoutAmount: jest.fn(() => 0),
  getBatchSize: jest.fn(() => 500),
}));

const sequelize = require('@config/database.config');
const notificationModule = require('@modules/notification');
const paymentModule = require('@modules/payment');
const payoutRepository = require('@modules/payout/infrastructure/payout.repository');
const { settleTransfer } = require('@modules/payout/application/settleTransfer');
const { getStripe, isStripeConfigured } = require('@modules/payout/infrastructure/stripe-client');
const payoutSettings = require('@modules/payout/application/payout-settings');
const payoutService = require('@modules/payout/application/payout.service');

function booking(overrides = {}) {
  return {
    id: 'b1',
    hotel_id: 'h1',
    total_price: '100.00',
    currency: 'USD',
    platform_commission_amount: '10.00',
    check_in_date: '2026-01-01',
    check_out_date: '2026-01-03',
    transaction: { id: 't1' },
    ...overrides,
  };
}

function readyAccount(hotelId, ownerId) {
  return {
    id: `acct-${hotelId}`,
    user_id: ownerId,
    hotel_id: hotelId,
    payouts_enabled: true,
    onboarding_status: 'completed',
  };
}

describe('payout/application/payout.service', () => {
  beforeEach(() => {
    const tx = { LOCK: { UPDATE: 'UPDATE' } };
    sequelize.transaction.mockImplementation((callback) => callback(tx));
    paymentModule.lockHotelBalance.mockResolvedValue({});
    paymentModule.availableHotelBalance.mockResolvedValue(1000);
    paymentModule.getPrimaryOwnerByHotelId.mockResolvedValue('o1');
    payoutRepository.sumReserved.mockResolvedValue(0);
    payoutRepository.createItems.mockResolvedValue([]);
    payoutRepository.update.mockResolvedValue([1]);
    payoutRepository.findReadyConnectedAccount.mockImplementation(async ({ hotelId, ownerId }) =>
      readyAccount(hotelId, ownerId)
    );
    payoutRepository.create.mockImplementation(async (data) => ({
      id: `payout-${data.hotelId}`,
      ...data,
    }));
    settleTransfer.mockResolvedValue(undefined);
    isStripeConfigured.mockReturnValue(true);
    payoutSettings.getEligibilityCutoffDate.mockReturnValue(new Date('2026-01-01T00:00:00.000Z'));
    payoutSettings.getMinimumPayoutAmount.mockReturnValue(0);
    payoutSettings.getBatchSize.mockReturnValue(500);
  });

  describe('createEligiblePayouts', () => {
    it('groups eligible bookings into one payout per hotel/owner and records one item per booking', async () => {
      payoutRepository.findEligibleBookingsForPayout.mockResolvedValue([
        booking({ id: 'b1' }),
        booking({ id: 'b2' }),
      ]);

      const result = await payoutService.createEligiblePayouts({ hotelId: 'h1' });

      expect(payoutRepository.findEligibleBookingsForPayout).toHaveBeenCalledWith(
        new Date('2026-01-01T00:00:00.000Z'),
        { hotelId: 'h1' },
        expect.objectContaining({ limit: 500 })
      );

      expect(payoutRepository.create).toHaveBeenCalledTimes(1);
      expect(payoutRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          hotelId: 'h1',
          ownerId: 'o1',
          amount: 180,
          platformFeeAmount: 20,
          currency: 'USD',
        }),
        expect.objectContaining({
          transaction: expect.objectContaining({ LOCK: expect.anything() }),
        })
      );

      const items = payoutRepository.createItems.mock.calls[0][0];
      expect(items).toHaveLength(2);
      expect(items[0]).toEqual(
        expect.objectContaining({
          bookingId: 'b1',
          grossAmount: 100,
          platformFeeAmount: 10,
          netAmount: 90,
        })
      );
      expect(result).toMatchObject({ scanned: 2, created: 1 });
    });

    it('skips bookings that already have a payout item', async () => {
      payoutRepository.findEligibleBookingsForPayout.mockResolvedValue([
        booking({ id: 'b1', payout_item: { id: 'item-1' } }),
      ]);

      const result = await payoutService.createEligiblePayouts();

      expect(payoutRepository.create).not.toHaveBeenCalled();
      expect(result).toMatchObject({ scanned: 1, created: 0 });
    });

    it('skips a hotel without a payout-ready account instead of failing the batch', async () => {
      payoutRepository.findEligibleBookingsForPayout.mockResolvedValue([booking()]);
      payoutRepository.findReadyConnectedAccount.mockResolvedValue(null);

      const result = await payoutService.createEligiblePayouts();

      expect(result).toMatchObject({ scanned: 1, created: 0 });
    });

    it('splits bookings from different hotels into separate payouts', async () => {
      payoutRepository.findEligibleBookingsForPayout.mockResolvedValue([
        booking({ id: 'b1', hotel_id: 'h1' }),
        booking({ id: 'b2', hotel_id: 'h2' }),
      ]);
      paymentModule.getPrimaryOwnerByHotelId.mockImplementation(async (hotelId) =>
        hotelId === 'h1' ? 'o1' : 'o2'
      );

      const result = await payoutService.createEligiblePayouts();

      expect(payoutRepository.create).toHaveBeenCalledTimes(2);
      expect(result).toMatchObject({ scanned: 2, created: 2 });
    });
  });

  describe('processStripeTransfer', () => {
    let payoutState;
    let stripe;

    beforeEach(() => {
      payoutState = {
        id: 'p1',
        hotel_id: 'h1',
        owner_id: 'o1',
        amount: '90.00',
        currency: 'USD',
        status: 'pending',
        connected_payment_account: { provider_account_id: 'acct_1' },
      };
      stripe = { transfers: { create: jest.fn(), retrieve: jest.fn() } };
      getStripe.mockReturnValue(stripe);
      payoutRepository.findById.mockImplementation(async () => ({ ...payoutState }));
      payoutRepository.findForClaim.mockImplementation(async () => ({ ...payoutState }));
      payoutRepository.update.mockImplementation(async (id, changes) => {
        Object.assign(payoutState, changes);
        return [1];
      });
    });

    it('claims, transfers with the payout idempotency key, settles and notifies', async () => {
      stripe.transfers.create.mockResolvedValue({ id: 'tr_1', amount: 9000, currency: 'usd' });

      const result = await payoutService.processStripeTransfer('p1');

      expect(stripe.transfers.create).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 9000, destination: 'acct_1' }),
        expect.objectContaining({ idempotencyKey: 'payout-p1' })
      );
      expect(settleTransfer).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'p1' }),
        expect.objectContaining({ id: 'tr_1' })
      );
      expect(notificationModule.sendPayoutNotification).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'completed', currency: 'USD' })
      );
      expect(result).toMatchObject({ id: 'p1' });
    });

    it('marks a definitive Stripe rejection as failed and notifies the owner', async () => {
      stripe.transfers.create.mockRejectedValue(
        Object.assign(new Error('No such destination'), {
          type: 'StripeInvalidRequestError',
          statusCode: 400,
          code: 'resource_missing',
        })
      );

      await expect(payoutService.processStripeTransfer('p1')).rejects.toMatchObject({
        code: 'PAYOUT_FAILED',
      });

      expect(payoutState.status).toBe('failed');
      expect(notificationModule.sendPayoutNotification).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'failed', reason: 'No such destination' })
      );
    });

    it('keeps a transient/unknown outcome in processing for reconciliation', async () => {
      stripe.transfers.create.mockRejectedValue(
        Object.assign(new Error('socket hang up'), { type: 'StripeConnectionError' })
      );

      await expect(payoutService.processStripeTransfer('p1')).rejects.toMatchObject({
        code: 'PAYOUT_OUTCOME_UNKNOWN',
      });

      expect(payoutState.status).toBe('processing');
      expect(notificationModule.sendPayoutNotification).not.toHaveBeenCalled();
    });

    it('rejects a second claim when the payout is already processing', async () => {
      payoutState.status = 'processing';

      await expect(payoutService.processStripeTransfer('p1')).rejects.toMatchObject({
        code: 'PAYOUT_NOT_PROCESSABLE',
      });
      expect(stripe.transfers.create).not.toHaveBeenCalled();
    });
  });

  describe('resumeStripeTransfer', () => {
    it('retrieves an existing transfer and settles it without creating a new one', async () => {
      const stripe = { transfers: { create: jest.fn(), retrieve: jest.fn() } };
      getStripe.mockReturnValue(stripe);
      payoutRepository.findById.mockResolvedValue({
        id: 'p1',
        hotel_id: 'h1',
        amount: '90.00',
        currency: 'USD',
        status: 'processing',
        provider_transfer_id: 'tr_1',
        connected_payment_account: { provider_account_id: 'acct_1' },
      });
      stripe.transfers.retrieve.mockResolvedValue({
        id: 'tr_1',
        amount: 9000,
        currency: 'usd',
        reversed: false,
      });

      await payoutService.resumeStripeTransfer('p1');

      expect(stripe.transfers.retrieve).toHaveBeenCalledWith('tr_1');
      expect(settleTransfer).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'p1' }),
        expect.objectContaining({ id: 'tr_1' })
      );
      expect(stripe.transfers.create).not.toHaveBeenCalled();
    });

    it('reuses the idempotency key when no transfer id was persisted', async () => {
      const stripe = { transfers: { create: jest.fn(), retrieve: jest.fn() } };
      getStripe.mockReturnValue(stripe);
      payoutRepository.findById.mockResolvedValue({
        id: 'p1',
        hotel_id: 'h1',
        amount: '90.00',
        currency: 'USD',
        status: 'processing',
        provider_transfer_id: null,
        connected_payment_account: { provider_account_id: 'acct_1' },
      });
      stripe.transfers.create.mockResolvedValue({ id: 'tr_1', amount: 9000, currency: 'usd' });

      await payoutService.resumeStripeTransfer('p1');

      expect(stripe.transfers.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ idempotencyKey: 'payout-p1' })
      );
    });
  });
});
