const { Op } = require('sequelize');

jest.mock('@models/index.js', () => ({
  reviews: { findOne: jest.fn(), update: jest.fn() },
  review_helpful_votes: {
    findAll: jest.fn(),
    upsert: jest.fn(),
    count: jest.fn(),
    destroy: jest.fn(),
  },
}));
jest.mock('@config/database.config', () => ({
  transaction: jest.fn((callback) => callback('tx')),
}));

const reviewVoteRepository = require('@modules/review/infrastructure/review-vote.repository');
const { reviews: Reviews, review_helpful_votes: Votes } = require('@models/index.js');

describe('reviewVoteRepository', () => {
  const sequelize = require('@config/database.config');

  beforeEach(() => {
    jest.clearAllMocks();
    sequelize.transaction.mockImplementation((callback) => callback('tx'));
    Votes.count.mockResolvedValue(3);
    Reviews.update.mockResolvedValue([1]);
  });

  it('findVoteTarget selects only the fields needed to authorise a vote', async () => {
    Reviews.findOne.mockResolvedValue({ id: 'r1' });

    const review = await reviewVoteRepository.findVoteTarget('r1');

    expect(review).toEqual({ id: 'r1' });
    expect(Reviews.findOne).toHaveBeenCalledWith({
      where: { id: 'r1' },
      attributes: ['id', 'user_id', 'status'],
    });
  });

  it('findVotesByReviewIds returns nothing without ids or a user', async () => {
    expect(await reviewVoteRepository.findVotesByReviewIds([], 'u1')).toEqual([]);
    expect(await reviewVoteRepository.findVotesByReviewIds(['r1'], undefined)).toEqual([]);
    expect(Votes.findAll).not.toHaveBeenCalled();
  });

  it('findVotesByReviewIds scopes to the given reviews and user', async () => {
    Votes.findAll.mockResolvedValue([{ review_id: 'r1', is_helpful: true }]);

    const rows = await reviewVoteRepository.findVotesByReviewIds(['r1', 'r2'], 'u1');

    expect(Votes.findAll).toHaveBeenCalledWith({
      where: { review_id: { [Op.in]: ['r1', 'r2'] }, user_id: 'u1' },
      attributes: ['review_id', 'is_helpful'],
      raw: true,
    });
    expect(rows).toHaveLength(1);
  });

  it('applyHelpfulVote upserts, recounts and writes the count back in one transaction', async () => {
    Votes.upsert.mockResolvedValue([{}, true]);

    const count = await reviewVoteRepository.applyHelpfulVote({
      reviewId: 'r1',
      userId: 'u1',
      isHelpful: false,
    });

    expect(Votes.upsert).toHaveBeenCalledWith(
      { review_id: 'r1', user_id: 'u1', is_helpful: false },
      { transaction: 'tx' }
    );
    expect(Votes.count).toHaveBeenCalledWith({
      where: { review_id: 'r1', is_helpful: true },
      transaction: 'tx',
    });
    expect(Reviews.update).toHaveBeenCalledWith(
      { helpful_count: 3 },
      { where: { id: 'r1' }, transaction: 'tx' }
    );
    expect(count).toBe(3);
  });

  it('removeHelpfulVote deletes the vote and recomputes the count', async () => {
    Votes.destroy.mockResolvedValue(1);

    const count = await reviewVoteRepository.removeHelpfulVote({ reviewId: 'r1', userId: 'u1' });

    expect(Votes.destroy).toHaveBeenCalledWith({
      where: { review_id: 'r1', user_id: 'u1' },
      transaction: 'tx',
    });
    expect(Reviews.update).toHaveBeenCalledWith(
      { helpful_count: 3 },
      { where: { id: 'r1' }, transaction: 'tx' }
    );
    expect(count).toBe(3);
  });
});
