import themeReducer, { setThemePreference, ThemePreference } from '../themeSlice';

describe('themeSlice', () => {
  describe('initial state', () => {
    it('should have system as default preference', () => {
      const state = themeReducer(undefined, { type: 'unknown' });
      expect(state.preference).toBe('system');
    });
  });

  describe('setThemePreference action', () => {
    it('should create correct action for light theme', () => {
      const action = setThemePreference('light');
      expect(action.type).toBe('theme/setThemePreference');
      expect(action.payload).toBe('light');
    });

    it('should create correct action for dark theme', () => {
      const action = setThemePreference('dark');
      expect(action.type).toBe('theme/setThemePreference');
      expect(action.payload).toBe('dark');
    });

    it('should create correct action for system theme', () => {
      const action = setThemePreference('system');
      expect(action.type).toBe('theme/setThemePreference');
      expect(action.payload).toBe('system');
    });
  });

  describe('reducer', () => {
    it('should set preference to light', () => {
      const state = themeReducer(undefined, setThemePreference('light'));
      expect(state.preference).toBe('light');
    });

    it('should set preference to dark', () => {
      const state = themeReducer(undefined, setThemePreference('dark'));
      expect(state.preference).toBe('dark');
    });

    it('should set preference to system', () => {
      const initialState = { preference: 'dark' as ThemePreference };
      const state = themeReducer(initialState, setThemePreference('system'));
      expect(state.preference).toBe('system');
    });

    it('should handle theme transitions correctly', () => {
      let state = themeReducer(undefined, { type: 'unknown' });
      expect(state.preference).toBe('system');

      state = themeReducer(state, setThemePreference('light'));
      expect(state.preference).toBe('light');

      state = themeReducer(state, setThemePreference('dark'));
      expect(state.preference).toBe('dark');

      state = themeReducer(state, setThemePreference('system'));
      expect(state.preference).toBe('system');
    });
  });
});
