import { atom, useAtomValue, useSetAtom } from 'jotai';
import { atomWithStorage, createJSONStorage } from 'jotai/utils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useMemo } from 'react';
import { TranscriptResponse, ChatMessage } from './api';

// Theme Types
export type ThemePreference = 'light' | 'dark' | 'system';

const themeStorage = createJSONStorage<ThemePreference>(() => AsyncStorage);

export const themePreferenceAtom = atomWithStorage<ThemePreference>(
  'videoinsight-theme',
  'system',
  themeStorage,
  { getOnInit: true }
);

export function useThemePreference(): ThemePreference {
  return useAtomValue(themePreferenceAtom);
}

export function useSetThemePreference() {
  return useSetAtom(themePreferenceAtom);
}

// Video Types
export interface VideoCache {
  video_id: string;
  title: string;
  author: string;
  thumbnail_url: string;
  length: number; // in seconds
  transcript: TranscriptResponse | null;
  summary: string | null;
  chatMessages: ChatMessage[] | null;
  lastAccessed: number;
}

export type VideosState = Record<string, VideoCache>;

// AsyncStorage configuration
const storage = createJSONStorage<VideosState>(() => AsyncStorage);

// Main persisted atom for all videos
export const videosAtom = atomWithStorage<VideosState>(
  'videoinsight-videos',
  {},
  storage,
  { getOnInit: true }
);

// Type guard to validate VideoCache structure
function isValidVideoCache(v: unknown): v is VideoCache {
  return (
    v != null &&
    typeof v === 'object' &&
    'video_id' in v &&
    typeof (v as VideoCache).video_id === 'string' &&
    'lastAccessed' in v &&
    typeof (v as VideoCache).lastAccessed === 'number'
  );
}

// Derived atom for sorted videos list (most recent first)
export const videosListAtom = atom(async (get) => {
  const videos = await get(videosAtom);
  return Object.values(videos)
    .filter(isValidVideoCache)
    .sort((a, b) => b.lastAccessed - a.lastAccessed);
});

// Hook to get a specific video's cache
export function useVideoCache(videoId: string) {
  const videos = useAtomValue(videosAtom) as VideosState;
  const setVideos = useSetAtom(videosAtom);

  const video = useMemo(() => {
    return videos[videoId] || null;
  }, [videos, videoId]);

  const updateVideo = useCallback(
    (update: Partial<VideoCache>) => {
      setVideos((prev) => {
        const state = prev as VideosState;
        const existing = state[videoId];
        const newVideo: VideoCache = {
          video_id: existing?.video_id ?? videoId,
          title: update.title ?? existing?.title ?? '',
          author: update.author ?? existing?.author ?? '',
          thumbnail_url: update.thumbnail_url ?? existing?.thumbnail_url ?? '',
          length: update.length ?? existing?.length ?? 0,
          transcript: update.transcript ?? existing?.transcript ?? null,
          summary: update.summary ?? existing?.summary ?? null,
          chatMessages: update.chatMessages ?? existing?.chatMessages ?? null,
          lastAccessed: Date.now(),
        };
        return {
          ...state,
          [videoId]: newVideo,
        };
      });
    },
    [videoId, setVideos]
  );

  return { video, updateVideo };
}

// Hook to get the list of recent videos
export function useRecentVideos(): VideoCache[] {
  return useAtomValue(videosListAtom);
}

// Hook to clear all cached videos
export function useClearVideos() {
  const setVideos = useSetAtom(videosAtom);
  return useCallback(() => {
    setVideos({});
  }, [setVideos]);
}

// Hook to remove a specific video from cache
export function useRemoveVideo() {
  const setVideos = useSetAtom(videosAtom);
  return useCallback(
    (videoId: string) => {
      setVideos((prev) => {
        const state = prev as VideosState;
        const { [videoId]: _, ...rest } = state;
        return rest;
      });
    },
    [setVideos]
  );
}

// Streaming State (not persisted - ephemeral)
export interface VideoStreamingState {
  streamingSummary: string;
  streamingChat: string;
  isLoadingSummary: boolean;
  isLoadingChat: boolean;
  pendingChatMessages: ChatMessage[] | null; // Messages waiting for response
}

export type StreamingState = Record<string, VideoStreamingState>;

const defaultStreamingState: VideoStreamingState = {
  streamingSummary: '',
  streamingChat: '',
  isLoadingSummary: false,
  isLoadingChat: false,
  pendingChatMessages: null,
};

// Non-persisted atom for streaming state
export const streamingStateAtom = atom<StreamingState>({});

// Hook to get and update streaming state for a video
export function useVideoStreaming(videoId: string) {
  const streamingState = useAtomValue(streamingStateAtom);
  const setStreamingState = useSetAtom(streamingStateAtom);

  const streaming = useMemo(() => {
    return streamingState[videoId] || defaultStreamingState;
  }, [streamingState, videoId]);

  const updateStreaming = useCallback(
    (update: Partial<VideoStreamingState>) => {
      setStreamingState((prev) => {
        const existing = prev[videoId] || defaultStreamingState;
        return {
          ...prev,
          [videoId]: { ...existing, ...update },
        };
      });
    },
    [videoId, setStreamingState]
  );

  return { streaming, updateStreaming };
}
