const {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  PERMISSION_DESCRIPTIONS,
} = require('@constants/permissions');

describe('platform permissions', () => {
  const platformPermissions = Object.entries(PERMISSIONS)
    .filter(([key]) => key.startsWith('PLATFORM_'))
    .map(([, value]) => value);

  it('defines the expected platform permissions', () => {
    expect(platformPermissions).toEqual(
      expect.arrayContaining([
        'platform.overview.read',
        'platform.hotel.read',
        'platform.user.read',
        'platform.user.pii_read',
        'platform.finance.read',
        'platform.audit.read',
      ])
    );
  });

  it('has a description for every platform permission', () => {
    platformPermissions.forEach((name) => {
      expect(PERMISSION_DESCRIPTIONS[name]).toBeTruthy();
    });
  });

  it('grants support_agent the read-only platform permissions', () => {
    expect(ROLE_PERMISSIONS.support_agent).toEqual(
      expect.arrayContaining([
        PERMISSIONS.PLATFORM_OVERVIEW_READ,
        PERMISSIONS.PLATFORM_HOTEL_READ,
        PERMISSIONS.PLATFORM_USER_READ,
        PERMISSIONS.PLATFORM_FINANCE_READ,
        PERMISSIONS.PLATFORM_AUDIT_READ,
      ])
    );
  });

  it('does NOT grant support_agent unmasked PII access', () => {
    expect(ROLE_PERMISSIONS.support_agent).not.toContain(PERMISSIONS.PLATFORM_USER_PII_READ);
  });

  it('grants admin every platform permission (admin = all permissions)', () => {
    platformPermissions.forEach((name) => {
      expect(ROLE_PERMISSIONS.admin).toContain(name);
    });
  });
});
