export const accountSettingsSections = [
  {
    slug: 'personal-information',
    titleKey: 'account.sections.personalInformation.title',
    summaryKey: 'account.sections.personalInformation.summary',
    ctaKey: 'account.sections.personalInformation.cta',
    component: 'PersonalInformation',
    available: true,
  },
  {
    slug: 'general-settings',
    titleKey: 'account.sections.generalSettings.title',
    summaryKey: 'account.sections.generalSettings.summary',
    ctaKey: 'account.sections.generalSettings.cta',
    component: 'GeneralSettings',
    available: true,
  },
  {
    slug: 'security-settings',
    titleKey: 'account.sections.securitySettings.title',
    summaryKey: 'account.sections.securitySettings.summary',
    ctaKey: 'account.sections.securitySettings.cta',
    component: 'SecuritySettings',
    available: true,
  },
  {
    slug: 'privacy-settings',
    titleKey: 'account.sections.privacySettings.title',
    summaryKey: 'account.sections.privacySettings.summary',
    ctaKey: 'account.sections.privacySettings.cta',
    component: 'PrivacySettings',
    available: false,
  },
  {
    slug: 'email-settings',
    titleKey: 'account.sections.emailSettings.title',
    summaryKey: 'account.sections.emailSettings.summary',
    ctaKey: 'account.sections.emailSettings.cta',
    component: 'EmailSettings',
    available: false,
  },
  {
    slug: 'payment-settings',
    titleKey: 'account.sections.paymentSettings.title',
    summaryKey: 'account.sections.paymentSettings.summary',
    ctaKey: 'account.sections.paymentSettings.cta',
    component: 'PaymentSettings',
    available: true,
  },
];

export const defaultAccountSettingsSection = accountSettingsSections[0];
