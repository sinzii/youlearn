import videosReducer, {
  updateVideo,
  removeVideo,
  clearVideos,
  selectVideosList,
  VideoCache,
  VideosState,
} from '../videosSlice';

// Helper to create a mock video cache
function createMockVideo(overrides: Partial<VideoCache> = {}): VideoCache {
  return {
    video_id: 'test-id',
    title: 'Test Video',
    author: 'Test Author',
    thumbnail_url: 'https://example.com/thumb.jpg',
    length: 300,
    transcript: null,
    summary: null,
    chatMessages: null,
    suggestedQuestions: null,
    lastAccessed: 1000,
    ...overrides,
  };
}

describe('videosSlice', () => {
  describe('initial state', () => {
    it('should be an empty object', () => {
      const state = videosReducer(undefined, { type: 'unknown' });
      expect(state).toEqual({});
    });
  });

  describe('updateVideo action', () => {
    it('should create a new video entry with video_id in update', () => {
      const state = videosReducer(
        undefined,
        updateVideo({
          videoId: 'video-1',
          update: createMockVideo({ video_id: 'video-1' }),
        })
      );

      expect(state['video-1']).toBeDefined();
      expect(state['video-1'].video_id).toBe('video-1');
      expect(state['video-1'].title).toBe('Test Video');
    });

    it('should update existing video and set lastAccessed', () => {
      const initialState: VideosState = {
        'video-1': createMockVideo({ video_id: 'video-1', lastAccessed: 1000 }),
      };

      const beforeUpdate = Date.now();
      const state = videosReducer(
        initialState,
        updateVideo({
          videoId: 'video-1',
          update: { summary: 'Updated summary' },
        })
      );

      expect(state['video-1'].summary).toBe('Updated summary');
      expect(state['video-1'].lastAccessed).toBeGreaterThanOrEqual(beforeUpdate);
    });

    it('should preserve other fields when updating', () => {
      const initialState: VideosState = {
        'video-1': createMockVideo({
          video_id: 'video-1',
          title: 'Original Title',
          author: 'Original Author',
        }),
      };

      const state = videosReducer(
        initialState,
        updateVideo({
          videoId: 'video-1',
          update: { summary: 'New summary' },
        })
      );

      expect(state['video-1'].title).toBe('Original Title');
      expect(state['video-1'].author).toBe('Original Author');
      expect(state['video-1'].summary).toBe('New summary');
    });

    it('should warn and not create entry for missing video without video_id', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const state = videosReducer(
        undefined,
        updateVideo({
          videoId: 'non-existent',
          update: { summary: 'Some summary' },
        })
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        'Cannot update video non-existent: not found in state'
      );
      expect(state['non-existent']).toBeUndefined();

      consoleSpy.mockRestore();
    });

    it('should not affect other videos when updating one', () => {
      const initialState: VideosState = {
        'video-1': createMockVideo({ video_id: 'video-1', title: 'Video 1' }),
        'video-2': createMockVideo({ video_id: 'video-2', title: 'Video 2' }),
      };

      const state = videosReducer(
        initialState,
        updateVideo({
          videoId: 'video-1',
          update: { summary: 'Updated' },
        })
      );

      expect(state['video-1'].summary).toBe('Updated');
      expect(state['video-2'].title).toBe('Video 2');
      expect(state['video-2'].summary).toBeNull();
    });
  });

  describe('removeVideo action', () => {
    it('should remove a specific video', () => {
      const initialState: VideosState = {
        'video-1': createMockVideo({ video_id: 'video-1' }),
        'video-2': createMockVideo({ video_id: 'video-2' }),
      };

      const state = videosReducer(initialState, removeVideo('video-1'));

      expect(state['video-1']).toBeUndefined();
      expect(state['video-2']).toBeDefined();
    });

    it('should handle removing non-existent video gracefully', () => {
      const initialState: VideosState = {
        'video-1': createMockVideo({ video_id: 'video-1' }),
      };

      const state = videosReducer(initialState, removeVideo('non-existent'));

      expect(state['video-1']).toBeDefined();
      expect(Object.keys(state)).toHaveLength(1);
    });
  });

  describe('clearVideos action', () => {
    it('should remove all videos', () => {
      const initialState: VideosState = {
        'video-1': createMockVideo({ video_id: 'video-1' }),
        'video-2': createMockVideo({ video_id: 'video-2' }),
        'video-3': createMockVideo({ video_id: 'video-3' }),
      };

      const state = videosReducer(initialState, clearVideos());

      expect(state).toEqual({});
      expect(Object.keys(state)).toHaveLength(0);
    });

    it('should handle clearing empty state', () => {
      const state = videosReducer({}, clearVideos());
      expect(state).toEqual({});
    });
  });

  describe('selectVideosList selector', () => {
    it('should return empty array for empty state', () => {
      const state = { videos: {} };
      const result = selectVideosList(state);
      expect(result).toEqual([]);
    });

    it('should return videos sorted by lastAccessed descending', () => {
      const state = {
        videos: {
          'video-1': createMockVideo({ video_id: 'video-1', lastAccessed: 1000 }),
          'video-2': createMockVideo({ video_id: 'video-2', lastAccessed: 3000 }),
          'video-3': createMockVideo({ video_id: 'video-3', lastAccessed: 2000 }),
        },
      };

      const result = selectVideosList(state);

      expect(result).toHaveLength(3);
      expect(result[0].video_id).toBe('video-2'); // Most recent
      expect(result[1].video_id).toBe('video-3');
      expect(result[2].video_id).toBe('video-1'); // Oldest
    });

    it('should filter out invalid video entries', () => {
      const state = {
        videos: {
          'video-1': createMockVideo({ video_id: 'video-1', lastAccessed: 1000 }),
          'invalid-1': { title: 'No video_id' } as unknown as VideoCache,
          'invalid-2': { video_id: 'id', title: 'No lastAccessed' } as unknown as VideoCache,
        },
      };

      const result = selectVideosList(state);

      expect(result).toHaveLength(1);
      expect(result[0].video_id).toBe('video-1');
    });

    it('should be memoized and return same reference for same state', () => {
      const state = {
        videos: {
          'video-1': createMockVideo({ video_id: 'video-1' }),
        },
      };

      const result1 = selectVideosList(state);
      const result2 = selectVideosList(state);

      expect(result1).toBe(result2);
    });
  });
});
