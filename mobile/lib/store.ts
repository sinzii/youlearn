import { atom, useAtomValue, useSetAtom } from 'jotai';
import { atomWithStorage, createJSONStorage } from 'jotai/utils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useMemo } from 'react';
import { TranscriptResponse } from './api';

// Types
export interface VideoCache {
  video_id: string;
  title: string;
  transcript: TranscriptResponse | null;
  summary: string | null;
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

// Helper to safely get videos object (handles async loading state)
function getVideosSync(videos: VideosState | Promise<VideosState>): VideosState {
  // If it's a promise (still loading), return empty object
  if (videos instanceof Promise) {
    return {};
  }
  return videos || {};
}

// Derived atom for sorted videos list (most recent first)
export const videosListAtom = atom((get) => {
  const videos = getVideosSync(get(videosAtom));
  return Object.values(videos)
    .filter((v): v is VideoCache => v != null && typeof v.lastAccessed === 'number')
    .sort((a, b) => b.lastAccessed - a.lastAccessed);
});

// Hook to get a specific video's cache
export function useVideoCache(videoId: string) {
  const videos = useAtomValue(videosAtom);
  const setVideos = useSetAtom(videosAtom);

  const video = useMemo(() => {
    const syncVideos = getVideosSync(videos);
    return syncVideos[videoId] || null;
  }, [videos, videoId]);

  const updateVideo = useCallback(
    (update: Partial<VideoCache>) => {
      setVideos((prev) => {
        const syncPrev = getVideosSync(prev);
        const existing = syncPrev[videoId];
        const newVideo: VideoCache = {
          video_id: existing?.video_id ?? videoId,
          title: update.title ?? existing?.title ?? '',
          transcript: update.transcript ?? existing?.transcript ?? null,
          summary: update.summary ?? existing?.summary ?? null,
          lastAccessed: Date.now(),
        };
        return {
          ...syncPrev,
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
        const syncPrev = getVideosSync(prev);
        const { [videoId]: _, ...rest } = syncPrev;
        return rest;
      });
    },
    [setVideos]
  );
}
