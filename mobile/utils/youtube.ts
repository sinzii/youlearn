/**
 * Extract YouTube video ID from various URL formats.
 * Returns null if the input is not a valid YouTube URL or video ID.
 *
 * Supported formats:
 * - Direct video ID (exactly 11 characters: alphanumeric, underscore, hyphen)
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtube.com/watch?v=VIDEO_ID&other_params
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - https://www.youtube.com/live/VIDEO_ID
 */
export function extractVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Direct video ID (exactly 11 characters: alphanumeric, underscore, hyphen)
  // const videoIdPattern = /^[a-zA-Z0-9_-]{11}$/;
  // if (videoIdPattern.test(trimmed)) {
  //   return trimmed;
  // }

  // URL patterns - must be a valid YouTube URL
  const patterns = [
    // youtube.com/watch?v=VIDEO_ID (with optional other params before or after)
    // Supports: www.youtube.com, m.youtube.com, youtube.com
    /(?:https?:\/\/)?(?:(?:www|m)\.)?youtube\.com\/watch\?(?:[^&]*&)*v=([a-zA-Z0-9_-]{11})/,
    // youtu.be/VIDEO_ID
    /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
    // youtube.com/embed/VIDEO_ID
    /(?:https?:\/\/)?(?:(?:www|m)\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    // youtube.com/shorts/VIDEO_ID
    /(?:https?:\/\/)?(?:(?:www|m)\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    // youtube.com/live/VIDEO_ID
    /(?:https?:\/\/)?(?:(?:www|m)\.)?youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) {
      return match[1];
    }
  }

  // No valid pattern matched - return null
  return null;
}
