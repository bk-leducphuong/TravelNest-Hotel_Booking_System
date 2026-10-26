import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import ReviewDetails from '@/views/ReviewDetails.vue';
import { ReviewService } from '@/services/review.service';
import { ElMessageBox } from 'element-plus';

vi.mock('@/services/review.service', () => ({
  ReviewService: { validateReview: vi.fn(), checkReview: vi.fn(), createReview: vi.fn() },
}));
vi.mock('element-plus', async (importOriginal) => ({
  ...(await importOriginal()),
  ElMessageBox: { alert: vi.fn() },
}));
const wrappers = [];
function render() {
  const push = vi.fn();
  const wrapper = mount(ReviewDetails, {
    global: {
      mocks: {
        $t: (key) => key,
        $route: { query: { bc: 'BOOK123', hid: '1', hn: 'Hotel' } },
        $router: { push },
      },
      stubs: { TheHeader: true, TheFooter: true, RouterLink: true },
    },
  });
  wrappers.push(wrapper);
  return { wrapper, push };
}
afterEach(() => {
  wrappers.splice(0).forEach((w) => w.unmount());
  vi.resetAllMocks();
});

describe('Review feedback', () => {
  it('keeps validation failures on the page and recovers through retry', async () => {
    ReviewService.validateReview
      .mockRejectedValueOnce(new Error('Internal error'))
      .mockResolvedValueOnce({ data: { isValid: true } });
    ReviewService.checkReview.mockResolvedValue({ data: { exists: false } });
    const { wrapper, push } = render();
    await flushPromises();
    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    expect(wrapper.find('form').exists()).toBe(false);
    expect(push).not.toHaveBeenCalled();
    await wrapper.find('[role="alert"] button').trigger('click');
    await flushPromises();
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect(wrapper.find('form').exists()).toBe(true);
  });

  it('waits for the success popup to be acknowledged before navigating', async () => {
    ReviewService.validateReview.mockResolvedValue({ data: { isValid: true } });
    ReviewService.checkReview.mockResolvedValue({ data: { exists: false } });
    ReviewService.createReview.mockResolvedValue({ data: {} });
    let acknowledge;
    ElMessageBox.alert.mockImplementation(
      () =>
        new Promise((resolve) => {
          acknowledge = resolve;
        })
    );
    const { wrapper, push } = render();
    await flushPromises();
    await wrapper.setData({ overallRating: 5, comment: 'A lovely stay' });
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(ReviewService.createReview).toHaveBeenCalledOnce();
    expect(ElMessageBox.alert).toHaveBeenCalledWith(
      'reviewsPage.postSuccess',
      'feedback.successTitle',
      expect.objectContaining({ type: 'success' })
    );
    expect(push).not.toHaveBeenCalled();
    acknowledge();
    await flushPromises();
    expect(push).toHaveBeenCalledWith('/reviews');
  });
});
