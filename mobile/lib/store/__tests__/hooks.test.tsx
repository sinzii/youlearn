import { act } from '@testing-library/react-native';

import {
  useThemePreference,
  useSetThemePreference,
  useVideoCache,
  useRecentVideos,
  useClearVideos,
  useRemoveVideo,
  useVideoStreaming,
  useAppDispatch,
  useAppSelector,
} from '../hooks';
import { renderHookWithRedux, createMockVideoCache, createTestStore } from '../test-utils';
import { setThemePreference } from '../slices/themeSlice';
import { VideoCache } from '../slices/videosSlice';

describe('Redux Hooks', () => {
  describe('useAppDispatch', () => {
    it('should return a dispatch function', () => {
      const { result } = renderHookWithRedux(() => useAppDispatch());
      expect(typeof result.current).toBe('function');
    });
  });

  describe('useAppSelector', () => {
    it('should select state correctly', () => {
      const { result } = renderHookWithRedux(
        () => useAppSelector((state) => state.theme.preference),
        { preloadedState: { theme: { preference: 'dark' } } }
      );

      expect(result.current).toBe('dark');
    });
  });

  describe('Theme Hooks', () => {
    describe('useThemePreference', () => {
      it('should return default system preference', () => {
        const { result } = renderHookWithRedux(() => useThemePreference());
        expect(result.current).toBe('system');
      });

      it('should return current theme preference from store', () => {
        const { result } = renderHookWithRedux(() => useThemePreference(), {
          preloadedState: { theme: { preference: 'dark' } },
        });

        expect(result.current).toBe('dark');
      });
    });

    describe('useSetThemePreference', () => {
      it('should return a callback function', () => {
        const { result } = renderHookWithRedux(() => useSetThemePreference());
        expect(typeof result.current).toBe('function');
      });

      it('should dispatch setThemePreference action when called', () => {
        const { result, store } = renderHookWithRedux(() => useSetThemePreference());

        act(() => {
          result.current('dark');
        });

        expect(store.getState().theme.preference).toBe('dark');
      });

      it('should update theme in store through multiple calls', () => {
        const { result, store } = renderHookWithRedux(() => useSetThemePreference());

        act(() => {
          result.current('light');
        });
        expect(store.getState().theme.preference).toBe('light');

        act(() => {
          result.current('dark');
        });
        expect(store.getState().theme.preference).toBe('dark');

        act(() => {
          result.current('system');
        });
        expect(store.getState().theme.preference).toBe('system');
      });
    });
  });

  describe('Video Hooks', () => {
    const mockVideo: VideoCache = createMockVideoCache({
      video_id: 'video-1',
      title: 'Test Video',
      lastAccessed: 1000,
    });

    describe('useVideoCache', () => {
      it('should return null for missing video', () => {
        const { result } = renderHookWithRedux(() => useVideoCache('non-existent'));

        expect(result.current.video).toBeNull();
        expect(typeof result.current.updateVideo).toBe('function');
      });

      it('should return video when it exists', () => {
        const { result } = renderHookWithRedux(() => useVideoCache('video-1'), {
          preloadedState: {
            videos: { 'video-1': mockVideo },
          },
        });

        expect(result.current.video).not.toBeNull();
        expect(result.current.video?.video_id).toBe('video-1');
        expect(result.current.video?.title).toBe('Test Video');
      });

      it('should dispatch updateVideo action when updateVideo is called', () => {
        const { result, store } = renderHookWithRedux(() => useVideoCache('video-1'), {
          preloadedState: {
            videos: { 'video-1': mockVideo },
          },
        });

        act(() => {
          result.current.updateVideo({ summary: 'New summary' });
        });

        expect(store.getState().videos['video-1'].summary).toBe('New summary');
      });
    });

    describe('useRecentVideos', () => {
      it('should return empty array when no videos', () => {
        const { result } = renderHookWithRedux(() => useRecentVideos());
        expect(result.current).toEqual([]);
      });

      it('should return videos sorted by lastAccessed', () => {
        const { result } = renderHookWithRedux(() => useRecentVideos(), {
          preloadedState: {
            videos: {
              'video-1': createMockVideoCache({ video_id: 'video-1', lastAccessed: 1000 }),
              'video-2': createMockVideoCache({ video_id: 'video-2', lastAccessed: 3000 }),
              'video-3': createMockVideoCache({ video_id: 'video-3', lastAccessed: 2000 }),
            },
          },
        });

        expect(result.current).toHaveLength(3);
        expect(result.current[0].video_id).toBe('video-2');
        expect(result.current[1].video_id).toBe('video-3');
        expect(result.current[2].video_id).toBe('video-1');
      });
    });

    describe('useClearVideos', () => {
      it('should return a callback function', () => {
        const { result } = renderHookWithRedux(() => useClearVideos());
        expect(typeof result.current).toBe('function');
      });

      it('should clear all videos when called', () => {
        const { result, store } = renderHookWithRedux(() => useClearVideos(), {
          preloadedState: {
            videos: {
              'video-1': mockVideo,
              'video-2': createMockVideoCache({ video_id: 'video-2' }),
            },
          },
        });

        expect(Object.keys(store.getState().videos)).toHaveLength(2);

        act(() => {
          result.current();
        });

        expect(Object.keys(store.getState().videos)).toHaveLength(0);
      });
    });

    describe('useRemoveVideo', () => {
      it('should return a callback function', () => {
        const { result } = renderHookWithRedux(() => useRemoveVideo());
        expect(typeof result.current).toBe('function');
      });

      it('should remove specific video when called', () => {
        const { result, store } = renderHookWithRedux(() => useRemoveVideo(), {
          preloadedState: {
            videos: {
              'video-1': mockVideo,
              'video-2': createMockVideoCache({ video_id: 'video-2' }),
            },
          },
        });

        act(() => {
          result.current('video-1');
        });

        expect(store.getState().videos['video-1']).toBeUndefined();
        expect(store.getState().videos['video-2']).toBeDefined();
      });
    });
  });

  describe('Streaming Hooks', () => {
    describe('useVideoStreaming', () => {
      it('should return default state for missing video', () => {
        const { result } = renderHookWithRedux(() => useVideoStreaming('non-existent'));

        expect(result.current.streaming).toEqual({
          streamingSummary: '',
          streamingChat: '',
          isLoadingSummary: false,
          isLoadingChat: false,
          pendingChatMessages: null,
        });
        expect(typeof result.current.updateStreaming).toBe('function');
      });

      it('should return streaming state when it exists', () => {
        const { result } = renderHookWithRedux(() => useVideoStreaming('video-1'), {
          preloadedState: {
            streaming: {
              'video-1': {
                streamingSummary: 'Summary text',
                streamingChat: '',
                isLoadingSummary: true,
                isLoadingChat: false,
                pendingChatMessages: null,
              },
            },
          },
        });

        expect(result.current.streaming.streamingSummary).toBe('Summary text');
        expect(result.current.streaming.isLoadingSummary).toBe(true);
      });

      it('should dispatch updateStreaming action when updateStreaming is called', () => {
        const { result, store } = renderHookWithRedux(() => useVideoStreaming('video-1'));

        act(() => {
          result.current.updateStreaming({ isLoadingSummary: true, streamingSummary: 'Loading...' });
        });

        expect(store.getState().streaming['video-1'].isLoadingSummary).toBe(true);
        expect(store.getState().streaming['video-1'].streamingSummary).toBe('Loading...');
      });

      it('should merge updates with existing state', () => {
        const { result, store } = renderHookWithRedux(() => useVideoStreaming('video-1'), {
          preloadedState: {
            streaming: {
              'video-1': {
                streamingSummary: 'Initial',
                streamingChat: 'Chat',
                isLoadingSummary: true,
                isLoadingChat: false,
                pendingChatMessages: null,
              },
            },
          },
        });

        act(() => {
          result.current.updateStreaming({ isLoadingSummary: false });
        });

        const state = store.getState().streaming['video-1'];
        expect(state.isLoadingSummary).toBe(false);
        expect(state.streamingSummary).toBe('Initial');
        expect(state.streamingChat).toBe('Chat');
      });
    });
  });
});
