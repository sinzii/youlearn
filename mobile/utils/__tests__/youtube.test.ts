import { extractVideoId } from '../youtube';

describe('extractVideoId', () => {
  describe('valid direct video IDs', () => {
    it('should return video ID for valid 11-character ID', () => {
      expect(extractVideoId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('should return video ID with underscores', () => {
      expect(extractVideoId('abc_def_123')).toBe('abc_def_123');
    });

    it('should return video ID with hyphens', () => {
      expect(extractVideoId('abc-def-123')).toBe('abc-def-123');
    });

    it('should trim whitespace and return valid ID', () => {
      expect(extractVideoId('  dQw4w9WgXcQ  ')).toBe('dQw4w9WgXcQ');
    });
  });

  describe('youtube.com/watch URLs', () => {
    it('should extract ID from standard watch URL', () => {
      expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('should extract ID from watch URL without www', () => {
      expect(extractVideoId('https://youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('should extract ID from watch URL without https', () => {
      expect(extractVideoId('http://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('should extract ID from watch URL without protocol', () => {
      expect(extractVideoId('www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('should extract ID from watch URL with additional params after v', () => {
      expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=120')).toBe('dQw4w9WgXcQ');
    });

    it('should extract ID from watch URL with params before v', () => {
      expect(extractVideoId('https://www.youtube.com/watch?list=PLtest&v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('should extract ID from watch URL with multiple params', () => {
      expect(extractVideoId('https://www.youtube.com/watch?list=PLtest&v=dQw4w9WgXcQ&t=60&index=5')).toBe('dQw4w9WgXcQ');
    });
  });

  describe('youtu.be short URLs', () => {
    it('should extract ID from short URL', () => {
      expect(extractVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('should extract ID from short URL without https', () => {
      expect(extractVideoId('http://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('should extract ID from short URL without protocol', () => {
      expect(extractVideoId('youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('should extract ID from short URL with timestamp', () => {
      expect(extractVideoId('https://youtu.be/dQw4w9WgXcQ?t=120')).toBe('dQw4w9WgXcQ');
    });
  });

  describe('youtube.com/embed URLs', () => {
    it('should extract ID from embed URL', () => {
      expect(extractVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('should extract ID from embed URL without www', () => {
      expect(extractVideoId('https://youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('should extract ID from embed URL without protocol', () => {
      expect(extractVideoId('youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });
  });

  describe('youtube.com/shorts URLs', () => {
    it('should extract ID from shorts URL', () => {
      expect(extractVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('should extract ID from shorts URL without www', () => {
      expect(extractVideoId('https://youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('should extract ID from shorts URL without protocol', () => {
      expect(extractVideoId('youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });
  });

  describe('youtube.com/live URLs', () => {
    it('should extract ID from live URL', () => {
      expect(extractVideoId('https://www.youtube.com/live/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('should extract ID from live URL without www', () => {
      expect(extractVideoId('https://youtube.com/live/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('should extract ID from live URL without protocol', () => {
      expect(extractVideoId('youtube.com/live/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });
  });

  describe('invalid inputs', () => {
    it('should return null for empty string', () => {
      expect(extractVideoId('')).toBeNull();
    });

    it('should return null for whitespace only', () => {
      expect(extractVideoId('   ')).toBeNull();
    });

    it('should return null for random text', () => {
      expect(extractVideoId('hello world')).toBeNull();
    });

    it('should return null for non-YouTube URL', () => {
      expect(extractVideoId('https://vimeo.com/123456789')).toBeNull();
    });

    it('should return null for Google URL', () => {
      expect(extractVideoId('https://google.com')).toBeNull();
    });

    it('should return null for ID that is too short', () => {
      expect(extractVideoId('abc123')).toBeNull();
    });

    it('should return null for ID that is too long', () => {
      expect(extractVideoId('dQw4w9WgXcQ123')).toBeNull();
    });

    it('should return null for ID with invalid characters', () => {
      expect(extractVideoId('dQw4w9WgXc!')).toBeNull();
    });

    it('should return null for malformed YouTube URL', () => {
      expect(extractVideoId('youtube.com/invalid/dQw4w9WgXcQ')).toBeNull();
    });

    it('should return null for YouTube URL without video ID', () => {
      expect(extractVideoId('https://www.youtube.com/')).toBeNull();
    });

    it('should return null for YouTube channel URL', () => {
      expect(extractVideoId('https://www.youtube.com/@channelname')).toBeNull();
    });

    it('should return null for YouTube playlist URL without video', () => {
      expect(extractVideoId('https://www.youtube.com/playlist?list=PLtest123')).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle video ID with all numbers', () => {
      expect(extractVideoId('12345678901')).toBe('12345678901');
    });

    it('should handle video ID with all letters', () => {
      expect(extractVideoId('abcdefghijk')).toBe('abcdefghijk');
    });

    it('should handle video ID starting with hyphen', () => {
      expect(extractVideoId('-Qw4w9WgXcQ')).toBe('-Qw4w9WgXcQ');
    });

    it('should handle video ID starting with underscore', () => {
      expect(extractVideoId('_Qw4w9WgXcQ')).toBe('_Qw4w9WgXcQ');
    });

    it('should handle mobile YouTube URL', () => {
      expect(extractVideoId('https://m.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });
  });
});
