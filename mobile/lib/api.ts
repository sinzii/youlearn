const API_ENDPOINT =
  process.env.EXPO_PUBLIC_API_ENDPOINT || 'http://localhost:8000';

export interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

export interface TranscriptResponse {
  video_id: string;
  title: string;
  language: string;
  language_code: string;
  is_generated: boolean;
  segments: TranscriptSegment[];
}

export async function fetchTranscript(
  videoId: string
): Promise<TranscriptResponse> {
  const response = await fetch(
    `${API_ENDPOINT}/youtube/transcript?video_id=${encodeURIComponent(videoId)}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch transcript');
  }

  return response.json();
}
