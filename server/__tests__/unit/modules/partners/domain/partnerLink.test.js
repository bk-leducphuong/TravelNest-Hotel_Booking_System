const { buildPartnerUrl, PartnerTemplateError } = require('@modules/partners/domain/partnerLink');

describe('buildPartnerUrl', () => {
  it('fills placeholders and adds affiliate tracking', () => {
    const url = buildPartnerUrl({
      template: 'https://partner.example/search/{origin}/{destination}?depart={departDate}',
      params: { origin: 'HAN', destination: 'SGN', departDate: '2026-12-01' },
      campaign: 'flights',
    });

    const parsed = new URL(url);
    expect(parsed.pathname).toBe('/search/HAN/SGN');
    expect(parsed.searchParams.get('depart')).toBe('2026-12-01');
    expect(parsed.searchParams.get('utm_source')).toBe('travelnest');
    expect(parsed.searchParams.get('utm_medium')).toBe('affiliate');
    expect(parsed.searchParams.get('utm_campaign')).toBe('flights');
  });

  it('drops blank optional placeholders without leaving empty segments', () => {
    const url = buildPartnerUrl({
      template: 'https://partner.example/{origin}/{returnDate}?from={origin}&back={returnDate}',
      params: { origin: 'HAN', returnDate: '' },
    });

    const parsed = new URL(url);
    expect(parsed.pathname).toBe('/HAN/');
    expect(parsed.searchParams.has('back')).toBe(false);
    expect(parsed.searchParams.get('from')).toBe('HAN');
  });

  it('url-encodes guest values', () => {
    const url = buildPartnerUrl({
      template: 'https://partner.example/search?to={destination}',
      params: { destination: 'Ho Chi Minh City & District 1' },
    });

    expect(new URL(url).searchParams.get('to')).toBe('Ho Chi Minh City & District 1');
  });

  it('rejects a non-http template', () => {
    expect(() =>
      buildPartnerUrl({ template: 'javascript:alert(1)//{origin}', params: { origin: 'HAN' } })
    ).toThrow(PartnerTemplateError);
  });

  it('rejects an invalid template', () => {
    expect(() => buildPartnerUrl({ template: 'not a url/{origin}', params: {} })).toThrow(
      PartnerTemplateError
    );
  });
});
