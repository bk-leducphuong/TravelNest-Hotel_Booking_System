const { maskEmail, maskPhone, maskText, maskUser } = require('@modules/superadmin/application/pii');

describe('PII masking', () => {
  describe('maskEmail', () => {
    it('keeps a short prefix and the domain', () => {
      expect(maskEmail('jane.doe@example.com')).toBe('ja•••@example.com');
    });

    it('handles a single-character local part', () => {
      expect(maskEmail('a@b.com')).toBe('a•••@b.com');
    });

    it('masks malformed values', () => {
      expect(maskEmail('not-an-email')).toBe('•••');
    });

    it('passes through null and empty values', () => {
      expect(maskEmail(null)).toBeNull();
      expect(maskEmail('')).toBe('');
    });
  });

  describe('maskPhone', () => {
    it('keeps only the last two digits', () => {
      expect(maskPhone('+12025550123')).toBe('•••23');
    });

    it('masks values with fewer than two digits', () => {
      expect(maskPhone('5')).toBe('•••5');
    });

    it('passes through null', () => {
      expect(maskPhone(null)).toBeNull();
    });
  });

  describe('maskText', () => {
    it('masks present values', () => {
      expect(maskText('123 Main St')).toBe('•••');
    });

    it('keeps empty values as-is', () => {
      expect(maskText('')).toBe('');
      expect(maskText(null)).toBeNull();
    });
  });

  describe('maskUser', () => {
    it('masks PII fields on a plain object but leaves non-PII intact', () => {
      const masked = maskUser({
        email: 'jane.doe@example.com',
        phone_number: '+12025550123',
        address: '123 Main St',
        date_of_birth: '1990-01-01',
        first_name: 'Jane',
      });

      expect(masked.email).toBe('ja•••@example.com');
      expect(masked.phone_number).toBe('•••23');
      expect(masked.address).toBe('•••');
      expect(masked.date_of_birth).toBe('•••');
      expect(masked.first_name).toBe('Jane');
    });

    it('uses toJSON when available (Sequelize instance)', () => {
      const instance = {
        toJSON: () => ({ email: 'jane.doe@example.com', phone_number: '+12025550123' }),
      };

      const masked = maskUser(instance);

      expect(masked.email).toBe('ja•••@example.com');
      expect(masked.phone_number).toBe('•••23');
    });

    it('returns raw values when unmask is true', () => {
      const masked = maskUser({ email: 'jane.doe@example.com' }, { unmask: true });
      expect(masked.email).toBe('jane.doe@example.com');
    });

    it('does not mutate the input object', () => {
      const user = { email: 'jane.doe@example.com' };
      maskUser(user);
      expect(user.email).toBe('jane.doe@example.com');
    });

    it('returns null for a missing user', () => {
      expect(maskUser(null)).toBeNull();
    });
  });
});
