import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import { setThemePreference as setThemePreferenceAction, ThemePreference } from './slices/themeSlice';
import themeReducer from './slices/themeSlice';
import videosReducer from './slices/videosSlice';
import streamingReducer from './slices/streamingSlice';
import languageReducer from './slices/languageSlice';
import {
  setPreferredLanguage as setPreferredLanguageAction,
  setDetailLevel as setDetailLevelAction,
  LanguageCode,
  DetailLevel,
  LANGUAGE_OPTIONS,
  DETAIL_LEVEL_OPTIONS,
} from './slices/languageSlice';
import {
  updateVideo as updateVideoAction,
  removeVideo as removeVideoAction,
  clearVideos as clearVideosAction,
  selectVideosList,
  VideoCache,
} from './slices/videosSlice';
import {
  updateStreaming as updateStreamingAction,
  getDefaultStreamingState,
  VideoStreamingState,
} from './slices/streamingSlice';

// Define types locally to avoid circular dependency with index.ts
type RootState = {
  theme: ReturnType<typeof themeReducer>;
  videos: ReturnType<typeof videosReducer>;
  streaming: ReturnType<typeof streamingReducer>;
  language: ReturnType<typeof languageReducer>;
};
type AppDispatch = ReturnType<typeof useDispatch>;

// Typed hooks
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// ============ Theme Hooks ============

export function useThemePreference(): ThemePreference {
  return useAppSelector((state) => state.theme.preference);
}

export function useSetThemePreference() {
  const dispatch = useAppDispatch();
  return useCallback(
    (preference: ThemePreference) => {
      dispatch(setThemePreferenceAction(preference));
    },
    [dispatch]
  );
}

// ============ Video Hooks ============

export function useVideoCache(videoId: string) {
  const video = useAppSelector((state) => state.videos[videoId] || null);
  const dispatch = useAppDispatch();

  const updateVideo = useCallback(
    (update: Partial<VideoCache>) => {
      dispatch(updateVideoAction({ videoId, update }));
    },
    [videoId, dispatch]
  );

  return { video, updateVideo };
}

export function useRecentVideos(): VideoCache[] {
  return useAppSelector(selectVideosList);
}

export function useClearVideos() {
  const dispatch = useAppDispatch();
  return useCallback(() => {
    dispatch(clearVideosAction());
  }, [dispatch]);
}

export function useRemoveVideo() {
  const dispatch = useAppDispatch();
  return useCallback(
    (videoId: string) => {
      dispatch(removeVideoAction(videoId));
    },
    [dispatch]
  );
}

// ============ Streaming Hooks ============

export function useVideoStreaming(videoId: string) {
  const streamingState = useAppSelector((state) => state.streaming[videoId]);
  const dispatch = useAppDispatch();

  const streaming = useMemo(() => {
    return streamingState || getDefaultStreamingState();
  }, [streamingState]);

  const updateStreaming = useCallback(
    (update: Partial<VideoStreamingState>) => {
      dispatch(updateStreamingAction({ videoId, update }));
    },
    [videoId, dispatch]
  );

  return { streaming, updateStreaming };
}

// Granular hooks for better performance - prevents unnecessary re-renders

export function useChatStreaming(videoId: string) {
  const isLoading = useAppSelector(
    (state) => state.streaming[videoId]?.isLoadingChat ?? false
  );
  const streamingContent = useAppSelector(
    (state) => state.streaming[videoId]?.streamingChat ?? ''
  );
  const pendingMessages = useAppSelector(
    (state) => state.streaming[videoId]?.pendingChatMessages ?? null
  );

  return { isLoading, streamingContent, pendingMessages };
}

export function useSummaryStreaming(videoId: string) {
  const isLoading = useAppSelector(
    (state) => state.streaming[videoId]?.isLoadingSummary ?? false
  );
  const streamingContent = useAppSelector(
    (state) => state.streaming[videoId]?.streamingSummary ?? ''
  );

  return { isLoading, streamingContent };
}

// ============ Language Hooks ============

export function usePreferredLanguage(): LanguageCode {
  return useAppSelector((state) => state.language.preferredLanguage);
}

export function useSetPreferredLanguage() {
  const dispatch = useAppDispatch();
  return useCallback(
    (language: LanguageCode) => {
      dispatch(setPreferredLanguageAction(language));
    },
    [dispatch]
  );
}

export function useLanguageOptions() {
  return LANGUAGE_OPTIONS;
}

// ============ Detail Level Hooks ============

export function useDetailLevel(): DetailLevel {
  return useAppSelector((state) => state.language.detailLevel);
}

export function useSetDetailLevel() {
  const dispatch = useAppDispatch();
  return useCallback(
    (level: DetailLevel) => {
      dispatch(setDetailLevelAction(level));
    },
    [dispatch]
  );
}

export function useDetailLevelOptions() {
  return DETAIL_LEVEL_OPTIONS;
}

// Re-export types for convenience
export type { ThemePreference } from './slices/themeSlice';
export type { VideoCache, VideosState } from './slices/videosSlice';
export type { VideoStreamingState, StreamingState } from './slices/streamingSlice';
export type { LanguageCode, LanguageOption, DetailLevel, DetailLevelOption } from './slices/languageSlice';
export { LANGUAGE_OPTIONS, DETAIL_LEVEL_OPTIONS } from './slices/languageSlice';
