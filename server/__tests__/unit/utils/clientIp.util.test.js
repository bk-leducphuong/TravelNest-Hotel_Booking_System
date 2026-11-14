const { clientIp, createIpAllowlist, parseIp } = require('@utils/clientIp.util');

describe('clientIp.util', () => {
  describe('parseIp', () => {
    it('parses plain IPv4 and IPv6 addresses', () => {
      expect(parseIp('203.0.113.7')).toEqual({ address: '203.0.113.7', family: 'ipv4' });
      expect(parseIp('2001:db8::1')).toEqual({ address: '2001:db8::1', family: 'ipv6' });
    });

    it('unwraps IPv4-mapped IPv6 addresses', () => {
      expect(parseIp('::ffff:203.0.113.7')).toEqual({ address: '203.0.113.7', family: 'ipv4' });
    });

    it('strips ports from both address families', () => {
      expect(parseIp('203.0.113.7:51234')).toEqual({ address: '203.0.113.7', family: 'ipv4' });
      expect(parseIp('[2001:db8::1]:443')).toEqual({ address: '2001:db8::1', family: 'ipv6' });
    });

    it('rejects anything that is not an address', () => {
      for (const value of ['', '  ', 'not-an-ip', '999.1.1.1', null, undefined, 42]) {
        expect(parseIp(value)).toBeNull();
      }
    });
  });

  describe('clientIp', () => {
    it('prefers CF-Connecting-IP over the proxy hop in req.ip', () => {
      const req = {
        headers: { 'cf-connecting-ip': '203.0.113.7' },
        ip: '10.42.0.9',
        socket: { remoteAddress: '10.42.0.9' },
      };

      expect(clientIp(req)).toBe('203.0.113.7');
    });

    it('falls back to req.ip when Cloudflare did not set the header', () => {
      const req = {
        headers: {},
        ip: '::ffff:198.51.100.4',
        socket: { remoteAddress: '10.42.0.9' },
      };

      expect(clientIp(req)).toBe('198.51.100.4');
    });

    it('uses the socket address when req.ip is unavailable', () => {
      const req = { headers: {}, socket: { remoteAddress: '10.42.0.9' } };

      expect(clientIp(req)).toBe('10.42.0.9');
    });

    it('ignores a malformed CF-Connecting-IP header instead of trusting it', () => {
      const req = { headers: { 'cf-connecting-ip': 'evil' }, ip: '198.51.100.4' };

      expect(clientIp(req)).toBe('198.51.100.4');
    });

    it('returns null when no address can be resolved', () => {
      expect(clientIp({ headers: {} })).toBeNull();
    });
  });

  describe('createIpAllowlist', () => {
    it('is disabled when unset or empty', () => {
      expect(createIpAllowlist(undefined).enabled).toBe(false);
      expect(createIpAllowlist('  ,  ').enabled).toBe(false);
    });

    it('matches exact addresses and CIDR subnets', () => {
      const allowed = createIpAllowlist('203.0.113.7, 198.51.100.0/24, 2001:db8::/32');

      expect(allowed.enabled).toBe(true);
      expect(allowed.has('203.0.113.7')).toBe(true);
      expect(allowed.has('198.51.100.55')).toBe(true);
      expect(allowed.has('2001:db8:1234::5')).toBe(true);
      expect(allowed.has('203.0.113.8')).toBe(false);
      expect(allowed.has('192.0.2.1')).toBe(false);
    });

    it('matches IPv4-mapped addresses against an IPv4 entry', () => {
      expect(createIpAllowlist('203.0.113.7').has('::ffff:203.0.113.7')).toBe(true);
    });

    it('ignores malformed entries without disabling the rest', () => {
      const allowed = createIpAllowlist('not-an-ip, 203.0.113.7, 198.51.100.0/99, 2001:db8::/32');

      expect(allowed.entries).toEqual(['203.0.113.7', '2001:db8::/32']);
      expect(allowed.rejected).toEqual(['not-an-ip', '198.51.100.0/99']);
      expect(allowed.has('203.0.113.7')).toBe(true);
      expect(allowed.has('not-an-ip')).toBe(false);
    });
  });
});
