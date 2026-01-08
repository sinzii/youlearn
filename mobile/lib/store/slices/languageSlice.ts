import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type LanguageCode =
  | 'en'
  | 'vi'
  | 'es'
  | 'fr'
  | 'de'
  | 'ja'
  | 'ko'
  | 'zh'
  | 'pt'
  | 'ru'
  | 'ar'
  | 'hi'
  | 'th'
  | 'id';

export interface LanguageOption {
  code: LanguageCode;
  name: string;
  nativeName: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
];

// Summary detail level types
export type DetailLevel = 'tldr' | 'summary';

export interface DetailLevelOption {
  code: DetailLevel;
  label: string;
}

export const DETAIL_LEVEL_OPTIONS: DetailLevelOption[] = [
  { code: 'tldr', label: 'Key Insights' },
  { code: 'summary', label: 'Summary' },
];

interface LanguageState {
  preferredLanguage: LanguageCode;
  detailLevel: DetailLevel;
}

const initialState: LanguageState = {
  preferredLanguage: 'en',
  detailLevel: 'summary',
};

const languageSlice = createSlice({
  name: 'language',
  initialState,
  reducers: {
    setPreferredLanguage: (state, action: PayloadAction<LanguageCode>) => {
      state.preferredLanguage = action.payload;
    },
    setDetailLevel: (state, action: PayloadAction<DetailLevel>) => {
      state.detailLevel = action.payload;
    },
  },
});

export const { setPreferredLanguage, setDetailLevel } = languageSlice.actions;
export default languageSlice.reducer;
