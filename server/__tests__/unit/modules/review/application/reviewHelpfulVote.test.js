jest.mock('@modules/review/infrastructure/review-vote.repository', () => ({
  findVoteTarget: jest.fn(),
  applyHelpfulVote: jest.fn(),
  removeHelpfulVote: jest.fn(),
}));

const reviewVoteRepository = require('@modules/review/infrastructure/review-vote.repository');
const {
  castReviewVote,
  removeReviewVote,
} = require('@modules/review/application/reviewHelpfulVote');

describe('review/application/reviewHelpfulVote', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    reviewVoteRepository.findVoteTarget.mockResolvedValue({
      id: 'r1',
      user_id: 'author',
      status: 'published',
    });
    reviewVoteRepository.applyHelpfulVote.mockResolvedValue(4);
    reviewVoteRepository.removeHelpfulVote.mockResolvedValue(3);
  });

  it('casts a vote and returns the recomputed helpful count', async () => {
    const result = await castReviewVote('u1', 'r1', true);

    expect(reviewVoteRepository.applyHelpfulVote).toHaveBeenCalledWith({
      reviewId: 'r1',
      userId: 'u1',
      isHelpful: true,
    });
    expect(result).toEqual({ isHelpful: true, helpfulCount: 4 });
  });

  it('removes a vote and returns the recomputed helpful count', async () => {
    const result = await removeReviewVote('u1', 'r1');

    expect(reviewVoteRepository.removeHelpfulVote).toHaveBeenCalledWith({
      reviewId: 'r1',
      userId: 'u1',
    });
    expect(result).toEqual({ isHelpful: null, helpfulCount: 3 });
  });

  it('rejects a missing or unpublished review', async () => {
    reviewVoteRepository.findVoteTarget.mockResolvedValue(null);

    await expect(castReviewVote('u1', 'r1', true)).rejects.toMatchObject({
      statusCode: 404,
      code: 'REVIEW_NOT_FOUND',
    });
    expect(reviewVoteRepository.applyHelpfulVote).not.toHaveBeenCalled();
  });

  it('rejects voting on your own review', async () => {
    reviewVoteRepository.findVoteTarget.mockResolvedValue({
      id: 'r1',
      user_id: 'u1',
      status: 'published',
    });

    await expect(castReviewVote('u1', 'r1', true)).rejects.toMatchObject({
      statusCode: 400,
      code: 'CANNOT_VOTE_OWN_REVIEW',
    });
    expect(reviewVoteRepository.applyHelpfulVote).not.toHaveBeenCalled();
  });
});
