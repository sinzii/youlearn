import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from './index';
import { setThemePreference as setThemePreferenceAction, ThemePreference } from './slices/themeSlice';
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

// Re-export types for convenience
export type { ThemePreference } from './slices/themeSlice';
export type { VideoCache, VideosState } from './slices/videosSlice';
export type { VideoStreamingState, StreamingState } from './slices/streamingSlice';
