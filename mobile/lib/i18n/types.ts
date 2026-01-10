import type en from './locales/en.json';

// Supported display languages
export type DisplayLanguageCode = 'auto' | 'en' | 'vi';

export interface DisplayLanguageOption {
  code: DisplayLanguageCode;
  name: string;
  nativeName: string;
}

export const DISPLAY_LANGUAGE_OPTIONS: DisplayLanguageOption[] = [
  { code: 'auto', name: 'Auto (System)', nativeName: 'Auto' },
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
];

// RTL language codes for future support
export const RTL_LANGUAGES: string[] = ['ar', 'he', 'fa', 'ur'];

// Type-safe translation resources
export type TranslationResources = typeof en;

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: {
      translation: TranslationResources;
    };
  }
}
