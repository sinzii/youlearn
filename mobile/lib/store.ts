// Re-export everything from the new Redux store structure
export { store, persistor } from './store/index';
export type { RootState, AppDispatch } from './store/index';

// Re-export hooks (preserving the existing API)
export {
  useThemePreference,
  useSetThemePreference,
  useVideoCache,
  useRecentVideos,
  useClearVideos,
  useRemoveVideo,
  useVideoStreaming,
  useAppDispatch,
  useAppSelector,
  usePreferredLanguage,
  useSetPreferredLanguage,
  useLanguageOptions,
} from './store/hooks';

// Re-export types
export type {
  ThemePreference,
  VideoCache,
  VideosState,
  VideoStreamingState,
  StreamingState,
  LanguageCode,
  LanguageOption,
} from './store/hooks';

// Re-export constants
export { LANGUAGE_OPTIONS } from './store/hooks';

// Re-export actions for direct dispatch usage
export { updateVideo, removeVideo, clearVideos } from './store/slices/videosSlice';
export { updateStreaming, resetStreaming } from './store/slices/streamingSlice';
export { setThemePreference } from './store/slices/themeSlice';
export { setPreferredLanguage } from './store/slices/languageSlice';
