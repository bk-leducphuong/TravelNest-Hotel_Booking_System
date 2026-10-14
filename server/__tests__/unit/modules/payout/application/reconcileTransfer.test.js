jest.mock('@modules/payout/infrastructure/payout.repository', () => ({
  findById: jest.fn(),
  findByProviderTransferId: jest.fn(),
  update: jest.fn(),
}));

const payoutRepository = require('@modules/payout/infrastructure/payout.repository');
const { reconcileTransferFromStripe } = require('@modules/payout/application/reconcileTransfer');

describe('payout/application/reconcileTransfer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when the transfer matches no payout', async () => {
    payoutRepository.findByProviderTransferId.mockResolvedValue(null);

    await expect(
      reconcileTransferFromStripe({ transfer: { id: 'tr_1' }, eventType: 'transfer.updated' })
    ).resolves.toBeNull();
    expect(payoutRepository.update).not.toHaveBeenCalled();
  });

  it('returns null when there is no transfer id', async () => {
    await expect(
      reconcileTransferFromStripe({ transfer: {}, eventType: 'transfer.created' })
    ).resolves.toBeNull();
    expect(payoutRepository.findByProviderTransferId).not.toHaveBeenCalled();
  });

  it('prefers metadata.payout_id when present', async () => {
    payoutRepository.findById.mockResolvedValue({ id: 22, status: 'processing' });

    await reconcileTransferFromStripe({
      transfer: { id: 'tr_2', metadata: { payout_id: 22 } },
      eventType: 'transfer.created',
    });

    expect(payoutRepository.findById).toHaveBeenCalledWith(22);
    expect(payoutRepository.update).toHaveBeenCalledWith(
      22,
      expect.objectContaining({ status: 'paid', providerTransferId: 'tr_2' })
    );
  });

  it('marks a payout paid on transfer.created when it was not already paid', async () => {
    payoutRepository.findByProviderTransferId.mockResolvedValue({ id: 11, status: 'processing' });

    await reconcileTransferFromStripe({ transfer: { id: 'tr_1' }, eventType: 'transfer.created' });

    expect(payoutRepository.update).toHaveBeenCalledWith(
      11,
      expect.objectContaining({ status: 'paid', providerTransferId: 'tr_1' })
    );
  });

  it('backfills the transfer id without changing status on transfer.updated', async () => {
    payoutRepository.findByProviderTransferId.mockResolvedValue({ id: 12, status: 'paid' });

    await reconcileTransferFromStripe({ transfer: { id: 'tr_9' }, eventType: 'transfer.updated' });

    const update = payoutRepository.update.mock.calls[0][1];
    expect(update.status).toBeUndefined();
    expect(update.providerTransferId).toBe('tr_9');
  });

  it('marks a payout failed on transfer.reversed', async () => {
    payoutRepository.findByProviderTransferId.mockResolvedValue({ id: 33, status: 'paid' });

    await reconcileTransferFromStripe({ transfer: { id: 'tr_3' }, eventType: 'transfer.reversed' });

    expect(payoutRepository.update).toHaveBeenCalledWith(
      33,
      expect.objectContaining({ status: 'failed' })
    );
  });

  it('leaves a cancelled payout untouched except for the transfer id', async () => {
    payoutRepository.findByProviderTransferId.mockResolvedValue({ id: 44, status: 'cancelled' });

    await reconcileTransferFromStripe({ transfer: { id: 'tr_4' }, eventType: 'transfer.reversed' });

    const update = payoutRepository.update.mock.calls[0][1];
    expect(update.status).toBeUndefined();
  });
});
