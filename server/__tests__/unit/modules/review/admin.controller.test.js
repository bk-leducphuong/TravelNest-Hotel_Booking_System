jest.mock('@modules/review/application/admin/listReviews', () => ({ listReviews: jest.fn() }));
jest.mock('@modules/review/application/admin/getReview', () => ({ getReview: jest.fn() }));
jest.mock('@modules/review/application/admin/setReviewStatus', () => ({ setReviewStatus: jest.fn() }));
jest.mock('@modules/review/application/admin/replyToReview', () => ({
  replyToReview: jest.fn(),
  updateReply: jest.fn(),
  deleteReply: jest.fn(),
}));
jest.mock('@modules/review/application/admin/getReviewSummary', () => ({
  getReviewSummary: jest.fn(),
}));

const { getReview } = require('@modules/review/application/admin/getReview');
const { setReviewStatus } = require('@modules/review/application/admin/setReviewStatus');
const controller = require('@modules/review/api/admin.controller');

describe('review admin controller ownership guard', () => {
  it('404s a review from another hotel', async () => {
    getReview.mockResolvedValue({ id: 'rv1', hotel_id: 'h2' });
    const next = global.testUtils.mockNext();

    await controller.getReviewHandler(
      global.testUtils.mockRequest({
        params: { reviewId: 'rv1' },
        hotelContext: { hotelId: 'h1', isPlatformAdmin: false },
      }),
      global.testUtils.mockResponse(),
      next
    );

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
  });

  it('blocks moderating a cross-hotel review', async () => {
    getReview.mockResolvedValue({ id: 'rv1', hotel_id: 'h2' });
    const next = global.testUtils.mockNext();

    await controller.setReviewStatusHandler(
      global.testUtils.mockRequest({
        params: { reviewId: 'rv1' },
        body: { status: 'published' },
        hotelContext: { hotelId: 'h1', isPlatformAdmin: false },
      }),
      global.testUtils.mockResponse(),
      next
    );

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
    expect(setReviewStatus).not.toHaveBeenCalled();
  });
});
