jest.mock('@modules/payout/infrastructure/connected-account.repository', () => ({
  findByProviderAccountId: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
}));

const connectedAccountRepository = require('@modules/payout/infrastructure/connected-account.repository');
const {
  applyAccountUpdatedFromStripe,
  mapStripeAccountToUpdate,
} = require('@modules/payout/application/connectedAccountSync');

describe('payout/application/connectedAccountSync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null (and writes nothing) when no local account matches', async () => {
    connectedAccountRepository.findByProviderAccountId.mockResolvedValue(null);

    await expect(applyAccountUpdatedFromStripe({ id: 'acct_1' })).resolves.toBeNull();
    expect(connectedAccountRepository.update).not.toHaveBeenCalled();
  });

  it('returns null for a payload without an id', async () => {
    await expect(applyAccountUpdatedFromStripe({})).resolves.toBeNull();
    expect(connectedAccountRepository.findByProviderAccountId).not.toHaveBeenCalled();
  });

  it('maps and persists an account.updated payload', async () => {
    connectedAccountRepository.findByProviderAccountId.mockResolvedValue({ id: 7 });
    connectedAccountRepository.findById.mockResolvedValue({
      id: 7,
      onboarding_status: 'completed',
      payouts_enabled: true,
    });

    const result = await applyAccountUpdatedFromStripe({
      id: 'acct_1',
      charges_enabled: true,
      payouts_enabled: true,
      details_submitted: true,
      requirements: { currently_due: [], eventually_due: [] },
      capabilities: { transfers: 'active' },
    });

    expect(connectedAccountRepository.update).toHaveBeenCalledWith(
      7,
      expect.objectContaining({
        chargesEnabled: true,
        payoutsEnabled: true,
        detailsSubmitted: true,
        onboardingStatus: 'completed',
      })
    );
    expect(result).toMatchObject({ id: 7, onboarding_status: 'completed' });
  });

  it('derives onboarding status from the Stripe payload', () => {
    expect(
      mapStripeAccountToUpdate({ payouts_enabled: true, details_submitted: true }).onboardingStatus
    ).toBe('completed');
    expect(mapStripeAccountToUpdate({ details_submitted: true }).onboardingStatus).toBe('pending');
    expect(
      mapStripeAccountToUpdate({ disabled_reason: 'requirements.past_due' }).onboardingStatus
    ).toBe('restricted');
    expect(mapStripeAccountToUpdate({}).onboardingStatus).toBe('not_started');
  });
});
