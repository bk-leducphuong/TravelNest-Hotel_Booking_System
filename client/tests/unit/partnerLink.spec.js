import { describe, it, expect, vi, afterEach } from 'vitest';
import { openPartnerUrl } from '@/utils/partnerLink';

describe('openPartnerUrl', () => {
  afterEach(() => vi.restoreAllMocks());

  it('opens the partner in a new tab and severs the opener', () => {
    const opened = { opener: {} };
    const open = vi.spyOn(window, 'open').mockReturnValue(opened);

    expect(openPartnerUrl('https://partner.example/search')).toBe(true);
    expect(open).toHaveBeenCalledWith('https://partner.example/search', '_blank');
    expect(opened.opener).toBeNull();
  });

  it('reports a blocked popup', () => {
    vi.spyOn(window, 'open').mockReturnValue(null);

    expect(openPartnerUrl('https://partner.example/search')).toBe(false);
  });

  it('does nothing without a url', () => {
    const open = vi.spyOn(window, 'open');

    expect(openPartnerUrl('')).toBe(false);
    expect(open).not.toHaveBeenCalled();
  });
});
