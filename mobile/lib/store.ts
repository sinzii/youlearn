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
} from './store/hooks';

// Re-export types
export type {
  ThemePreference,
  VideoCache,
  VideosState,
  VideoStreamingState,
  StreamingState,
} from './store/hooks';

// Re-export actions for direct dispatch usage
export { updateVideo, removeVideo, clearVideos } from './store/slices/videosSlice';
export { updateStreaming, resetStreaming } from './store/slices/streamingSlice';
export { setThemePreference } from './store/slices/themeSlice';
