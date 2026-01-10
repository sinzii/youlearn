import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import en from './locales/en.json';
import vi from './locales/vi.json';
import { RTL_LANGUAGES, DisplayLanguageCode } from './types';

// Re-export types
export * from './types';

const resources = {
  en: { translation: en },
  vi: { translation: vi },
};

// Supported language codes (excluding 'auto')
const SUPPORTED_LANGUAGES = Object.keys(resources);

/**
 * Get device language - returns first supported language or 'en'
 */
export function getDeviceLanguage(): string {
  const locales = Localization.getLocales();
  if (locales && locales.length > 0) {
    const deviceLang = locales[0].languageCode;
    // Check if we support this language
    if (deviceLang && SUPPORTED_LANGUAGES.includes(deviceLang)) {
      return deviceLang;
    }
  }
  return 'en';
}

/**
 * Check if language is RTL
 */
export function isRTL(languageCode: string): boolean {
  return RTL_LANGUAGES.includes(languageCode);
}

/**
 * Resolve 'auto' to actual device language
 */
export function resolveDisplayLanguage(code: DisplayLanguageCode): string {
  if (code === 'auto') {
    return getDeviceLanguage();
  }
  return code;
}

/**
 * Initialize i18n - call this before rendering app
 */
export function initI18n(savedLanguage?: DisplayLanguageCode) {
  const language = savedLanguage
    ? resolveDisplayLanguage(savedLanguage)
    : getDeviceLanguage();

  if (!i18n.isInitialized) {
    i18n.use(initReactI18next).init({
      resources,
      lng: language,
      fallbackLng: 'en',
      compatibilityJSON: 'v4', // Required for React Native
      interpolation: {
        escapeValue: false, // React already escapes values
      },
      react: {
        useSuspense: false, // Disable suspense for React Native
      },
    });
  }

  return i18n;
}

/**
 * Change language dynamically
 */
export function changeLanguage(code: DisplayLanguageCode) {
  const language = resolveDisplayLanguage(code);
  i18n.changeLanguage(language);
}

export default i18n;
