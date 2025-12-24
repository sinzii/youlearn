import streamingReducer, {
  updateStreaming,
  resetStreaming,
  getDefaultStreamingState,
  VideoStreamingState,
  StreamingState,
} from '../streamingSlice';

describe('streamingSlice', () => {
  describe('initial state', () => {
    it('should be an empty object', () => {
      const state = streamingReducer(undefined, { type: 'unknown' });
      expect(state).toEqual({});
    });
  });

  describe('getDefaultStreamingState', () => {
    it('should return correct default values', () => {
      const defaultState = getDefaultStreamingState();

      expect(defaultState).toEqual({
        streamingSummary: '',
        streamingChat: '',
        isLoadingSummary: false,
        isLoadingChat: false,
        pendingChatMessages: null,
      });
    });

    it('should return the same default values consistently', () => {
      const state1 = getDefaultStreamingState();
      const state2 = getDefaultStreamingState();

      expect(state1).toEqual(state2);
    });
  });

  describe('updateStreaming action', () => {
    it('should create new streaming state for new video', () => {
      const state = streamingReducer(
        undefined,
        updateStreaming({
          videoId: 'video-1',
          update: { isLoadingSummary: true },
        })
      );

      expect(state['video-1']).toBeDefined();
      expect(state['video-1'].isLoadingSummary).toBe(true);
      // Other fields should have defaults
      expect(state['video-1'].streamingSummary).toBe('');
      expect(state['video-1'].isLoadingChat).toBe(false);
    });

    it('should merge with existing streaming state', () => {
      const initialState: StreamingState = {
        'video-1': {
          streamingSummary: 'Existing summary',
          streamingChat: '',
          isLoadingSummary: true,
          isLoadingChat: false,
          pendingChatMessages: null,
        },
      };

      const state = streamingReducer(
        initialState,
        updateStreaming({
          videoId: 'video-1',
          update: { streamingSummary: 'Updated summary', isLoadingSummary: false },
        })
      );

      expect(state['video-1'].streamingSummary).toBe('Updated summary');
      expect(state['video-1'].isLoadingSummary).toBe(false);
      // Unchanged fields should be preserved
      expect(state['video-1'].streamingChat).toBe('');
      expect(state['video-1'].isLoadingChat).toBe(false);
    });

    it('should not affect other videos when updating one', () => {
      const initialState: StreamingState = {
        'video-1': {
          streamingSummary: '',
          streamingChat: '',
          isLoadingSummary: false,
          isLoadingChat: false,
          pendingChatMessages: null,
        },
        'video-2': {
          streamingSummary: 'Video 2 summary',
          streamingChat: '',
          isLoadingSummary: true,
          isLoadingChat: false,
          pendingChatMessages: null,
        },
      };

      const state = streamingReducer(
        initialState,
        updateStreaming({
          videoId: 'video-1',
          update: { isLoadingSummary: true },
        })
      );

      expect(state['video-1'].isLoadingSummary).toBe(true);
      expect(state['video-2'].streamingSummary).toBe('Video 2 summary');
      expect(state['video-2'].isLoadingSummary).toBe(true);
    });

    it('should handle updating pendingChatMessages', () => {
      const messages = [
        { role: 'user' as const, content: 'Hello' },
        { role: 'assistant' as const, content: 'Hi!' },
      ];

      const state = streamingReducer(
        undefined,
        updateStreaming({
          videoId: 'video-1',
          update: { pendingChatMessages: messages, isLoadingChat: true },
        })
      );

      expect(state['video-1'].pendingChatMessages).toEqual(messages);
      expect(state['video-1'].isLoadingChat).toBe(true);
    });
  });

  describe('resetStreaming action', () => {
    it('should reset streaming state to defaults', () => {
      const initialState: StreamingState = {
        'video-1': {
          streamingSummary: 'Some summary',
          streamingChat: 'Some chat',
          isLoadingSummary: true,
          isLoadingChat: true,
          pendingChatMessages: [{ role: 'user', content: 'Hi' }],
        },
      };

      const state = streamingReducer(initialState, resetStreaming('video-1'));

      expect(state['video-1']).toEqual(getDefaultStreamingState());
    });

    it('should not affect other videos when resetting one', () => {
      const initialState: StreamingState = {
        'video-1': {
          streamingSummary: 'Summary 1',
          streamingChat: '',
          isLoadingSummary: true,
          isLoadingChat: false,
          pendingChatMessages: null,
        },
        'video-2': {
          streamingSummary: 'Summary 2',
          streamingChat: 'Chat 2',
          isLoadingSummary: false,
          isLoadingChat: true,
          pendingChatMessages: null,
        },
      };

      const state = streamingReducer(initialState, resetStreaming('video-1'));

      expect(state['video-1']).toEqual(getDefaultStreamingState());
      expect(state['video-2'].streamingSummary).toBe('Summary 2');
      expect(state['video-2'].isLoadingChat).toBe(true);
    });

    it('should create default state for non-existent video', () => {
      const state = streamingReducer({}, resetStreaming('new-video'));

      expect(state['new-video']).toEqual(getDefaultStreamingState());
    });
  });
});
