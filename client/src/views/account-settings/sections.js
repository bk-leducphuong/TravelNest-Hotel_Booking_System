export const accountSettingsSections = [
  {
    slug: 'personal-information',
    title: 'Personal details',
    summary: "Update your profile information and how it's displayed across your account.",
    cta: 'Manage profile',
    component: 'PersonalInformation',
    available: true,
  },
  {
    slug: 'general-settings',
    title: 'Customisation preferences',
    summary: 'Review language and currency preferences supported by the new settings shell.',
    cta: 'View preferences',
    component: 'GeneralSettings',
    available: false,
  },
  {
    slug: 'security-settings',
    title: 'Security settings',
    summary: 'Change your password and review other account security controls.',
    cta: 'Manage security',
    component: 'SecuritySettings',
    available: true,
  },
  {
    slug: 'privacy-settings',
    title: 'Privacy and data',
    summary: 'See privacy-related controls and data-management actions available on this account.',
    cta: 'Review privacy',
    component: 'PrivacySettings',
    available: false,
  },
  {
    slug: 'email-settings',
    title: 'Email preferences',
    summary: 'Check where account emails go and which notification controls are not yet available.',
    cta: 'Review email settings',
    component: 'EmailSettings',
    available: false,
  },
  {
    slug: 'payment-settings',
    title: 'Payment methods',
    summary: 'View the payment-method area while card-management support is still being integrated.',
    cta: 'Review payment methods',
    component: 'PaymentSettings',
    available: false,
  },
]

export const defaultAccountSettingsSection = accountSettingsSections[0]
