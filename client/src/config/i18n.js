import { createI18n } from 'vue-i18n';
import en from '@/locales/en.json';
import vi from '@/locales/vi.json';

const DEFAULT_LOCALE = 'en';
const SUPPORTED_LOCALES = ['en', 'vi'];

/**
 * Resolve the initial locale from the user's previous choice (LanguageSwitch
 * persists it under `language`). Falls back to English.
 */
function resolveInitialLocale() {
  if (typeof localStorage === 'undefined') {
    return DEFAULT_LOCALE;
  }

  const stored = localStorage.getItem('language');
  return SUPPORTED_LOCALES.includes(stored) ? stored : DEFAULT_LOCALE;
}

const i18n = createI18n({
  locale: resolveInitialLocale(),
  fallbackLocale: DEFAULT_LOCALE,
  messages: {
    en,
    vi,
  },
});

export { SUPPORTED_LOCALES, DEFAULT_LOCALE };
export default i18n;
