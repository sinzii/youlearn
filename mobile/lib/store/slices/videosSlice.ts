import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit';
import { TranscriptResponse, ChatMessage, Chapter } from '@/lib/api';

export interface VideoCache {
  video_id: string;
  title: string;
  author: string;
  thumbnail_url: string;
  length: number; // in seconds
  transcript: TranscriptResponse | null;
  summary: string | null;
  chatMessages: ChatMessage[] | null;
  suggestedQuestions: string[] | null;
  chapters: Chapter[] | null;
  lastAccessed: number;
}

export type VideosState = Record<string, VideoCache>;

const initialState: VideosState = {};

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

const videosSlice = createSlice({
  name: 'videos',
  initialState,
  reducers: {
    updateVideo: (
      state,
      action: PayloadAction<{ videoId: string; update: Partial<VideoCache> }>
    ) => {
      const { videoId, update } = action.payload;
      const existing = state[videoId];

      // If no existing entry and update doesn't have required fields, warn and return
      if (!existing && !update.video_id) {
        console.warn(`Cannot update video ${videoId}: not found in state`);
        return;
      }

      state[videoId] = {
        ...existing,
        ...update,
        lastAccessed: Date.now(),
      } as VideoCache;
    },
    removeVideo: (state, action: PayloadAction<string>) => {
      delete state[action.payload];
    },
    clearVideos: () => {
      return {};
    },
  },
});

// Memoized selector for sorted videos list
export const selectVideosList = createSelector(
  [(state: { videos: VideosState }) => state.videos],
  (videos) =>
    Object.values(videos)
      .filter(isValidVideoCache)
      .sort((a, b) => b.lastAccessed - a.lastAccessed)
);

export const { updateVideo, removeVideo, clearVideos } = videosSlice.actions;
export default videosSlice.reducer;
