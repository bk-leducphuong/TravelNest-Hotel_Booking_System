const {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  PERMISSION_DESCRIPTIONS,
} = require('@constants/permissions');

describe('payout connected-account permissions', () => {
  const permission = PERMISSIONS.PAYMENT_MANAGE_CONNECTED_ACCOUNTS;

  it('defines the hotel-scoped connected-account permission', () => {
    expect(permission).toBe('payment.manage_connected_accounts');
    expect(PERMISSION_DESCRIPTIONS[permission]).toBeTruthy();
  });

  it('grants owners connected-account management without payment.process', () => {
    expect(ROLE_PERMISSIONS.owner).toContain(permission);
    expect(ROLE_PERMISSIONS.owner).not.toContain(PERMISSIONS.PAYMENT_PROCESS);
  });

  it('does not grant managers or staff connected-account management', () => {
    expect(ROLE_PERMISSIONS.manager).not.toContain(permission);
    expect(ROLE_PERMISSIONS.staff).not.toContain(permission);
  });

  it('keeps payment.process broad and separate from onboarding', () => {
    expect(ROLE_PERMISSIONS.owner).toContain(PERMISSIONS.PAYMENT_READ);
    expect(ROLE_PERMISSIONS.owner).toContain(PERMISSIONS.PAYMENT_REFUND);
    expect(permission).not.toBe(PERMISSIONS.PAYMENT_PROCESS);
  });

  it('grants admin every permission, including connected-account management', () => {
    Object.values(PERMISSIONS).forEach((name) => {
      expect(ROLE_PERMISSIONS.admin).toContain(name);
    });
  });
});
