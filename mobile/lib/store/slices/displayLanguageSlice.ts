import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DisplayLanguageCode, DISPLAY_LANGUAGE_OPTIONS } from '@/lib/i18n';

interface DisplayLanguageState {
  displayLanguage: DisplayLanguageCode;
}

const initialState: DisplayLanguageState = {
  displayLanguage: 'auto', // Default to auto-detect device language
};

const displayLanguageSlice = createSlice({
  name: 'displayLanguage',
  initialState,
  reducers: {
    setDisplayLanguage: (state, action: PayloadAction<DisplayLanguageCode>) => {
      state.displayLanguage = action.payload;
    },
  },
});

export const { setDisplayLanguage } = displayLanguageSlice.actions;
export default displayLanguageSlice.reducer;

// Re-export for convenience
export { DISPLAY_LANGUAGE_OPTIONS };
export type { DisplayLanguageCode };
