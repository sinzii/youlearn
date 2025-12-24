import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ChatMessage } from '@/lib/api';

export interface VideoStreamingState {
  streamingSummary: string;
  streamingChat: string;
  isLoadingSummary: boolean;
  isLoadingChat: boolean;
  pendingChatMessages: ChatMessage[] | null;
}

export type StreamingState = Record<string, VideoStreamingState>;

const defaultStreamingState: VideoStreamingState = {
  streamingSummary: '',
  streamingChat: '',
  isLoadingSummary: false,
  isLoadingChat: false,
  pendingChatMessages: null,
};

const initialState: StreamingState = {};

const streamingSlice = createSlice({
  name: 'streaming',
  initialState,
  reducers: {
    updateStreaming: (
      state,
      action: PayloadAction<{ videoId: string; update: Partial<VideoStreamingState> }>
    ) => {
      const { videoId, update } = action.payload;
      const existing = state[videoId] || defaultStreamingState;
      state[videoId] = { ...existing, ...update };
    },
    resetStreaming: (state, action: PayloadAction<string>) => {
      state[action.payload] = defaultStreamingState;
    },
  },
});

export const getDefaultStreamingState = () => defaultStreamingState;
export const { updateStreaming, resetStreaming } = streamingSlice.actions;
export default streamingSlice.reducer;
