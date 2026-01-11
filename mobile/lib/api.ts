const API_ENDPOINT =
  process.env.EXPO_PUBLIC_API_ENDPOINT || 'http://localhost:8000';

// Custom error class for subscription required errors
export class SubscriptionRequiredError extends Error {
  subscriptionStatus: string | null;
  expiredAt: string | null;

  constructor(message: string, subscriptionStatus: string | null, expiredAt: string | null) {
    super(message);
    this.name = 'SubscriptionRequiredError';
    this.subscriptionStatus = subscriptionStatus;
    this.expiredAt = expiredAt;
  }
}

// Helper function to check for subscription required error
async function handleResponse<T>(response: Response, defaultErrorMessage: string): Promise<T> {
  if (!response.ok) {
    const error = await response.json();

    // Check for subscription required error (403)
    if (response.status === 403 && error.error === 'subscription_required') {
      throw new SubscriptionRequiredError(
        error.message || 'Active subscription required',
        error.subscription_status || null,
        error.expired_at || null
      );
    }

    throw new Error(error.detail || defaultErrorMessage);
  }

  return response.json();
}

export interface VideoInfo {
  video_id: string;
  title: string;
  author: string;
  thumbnail_url: string;
  length: number; // in seconds
}

export interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

export interface TranscriptResponse {
  video_id: string;
  language: string;
  language_code: string;
  is_generated: boolean;
  segments: TranscriptSegment[];
}

export interface SuggestQuestionsResponse {
  video_id: string;
  questions: string[];
}

export interface Chapter {
  title: string;
  start: number; // seconds
}

export interface GenerateChaptersResponse {
  video_id: string;
  chapters: Chapter[];
}

export async function fetchVideoInfo(
  videoId: string,
  token: string
): Promise<VideoInfo> {
  const response = await fetch(
    `${API_ENDPOINT}/youtube/info?video_id=${encodeURIComponent(videoId)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return handleResponse<VideoInfo>(response, 'Failed to fetch video info');
}

export async function fetchTranscript(
  videoId: string,
  token: string,
  language?: string
): Promise<TranscriptResponse> {
  // Build URL with optional language priority
  let url = `${API_ENDPOINT}/youtube/transcript?video_id=${encodeURIComponent(videoId)}`;
  if (language) {
    // Send preferred language with English fallback
    url += `&lang=${encodeURIComponent(language)},en`;
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse<TranscriptResponse>(response, 'Failed to fetch transcript');
}

export async function fetchSuggestedQuestions(
  videoId: string,
  transcript: string,
  token: string,
  language?: string
): Promise<SuggestQuestionsResponse> {
  const response = await fetch(`${API_ENDPOINT}/youtube/suggest-questions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      video_id: videoId,
      transcript,
      model: 'gpt-5.1',
      language,
    }),
  });

  return handleResponse<SuggestQuestionsResponse>(response, 'Failed to fetch suggested questions');
}

export async function fetchChapters(
  videoId: string,
  segments: TranscriptSegment[],
  token: string,
  language?: string
): Promise<GenerateChaptersResponse> {
  const response = await fetch(`${API_ENDPOINT}/youtube/generate-chapters`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      video_id: videoId,
      segments,
      model: 'gpt-5.1',
      language,
    }),
  });

  return handleResponse<GenerateChaptersResponse>(response, 'Failed to generate chapters');
}

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type StreamCallbacks = {
  onChunk: (chunk: string) => void;
  onDone: () => void;
  onError: (error: Error) => void;
};

export function streamSummary(
  videoId: string,
  transcript: string,
  token: string,
  callbacks: StreamCallbacks,
  language?: string,
  detailLevel?: string
): () => void {
  const { onChunk, onDone, onError } = callbacks;

  // Use XMLHttpRequest for React Native streaming support
  const xhr = new XMLHttpRequest();
  let lastIndex = 0;

  xhr.open('POST', `${API_ENDPOINT}/summarize`, true);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.setRequestHeader('Authorization', `Bearer ${token}`);

  xhr.onprogress = () => {
    const newData = xhr.responseText.slice(lastIndex);
    lastIndex = xhr.responseText.length;

    const lines = newData.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') {
          onDone();
          return;
        }
        if (data) {
          // Decode escaped newlines back to actual newlines
          onChunk(data.replace(/\\n/g, '\n'));
        }
      }
    }
  };

  xhr.onload = () => {
    if (xhr.status >= 200 && xhr.status < 300) {
      onDone();
    } else {
      try {
        const error = JSON.parse(xhr.responseText);
        // Check for subscription required error (403)
        if (xhr.status === 403 && error.error === 'subscription_required') {
          onError(new SubscriptionRequiredError(
            error.message || 'Active subscription required',
            error.subscription_status || null,
            error.expired_at || null
          ));
          return;
        }
        onError(new Error(error.detail || 'Failed to generate summary'));
      } catch {
        onError(new Error('Failed to generate summary'));
      }
    }
  };

  xhr.onerror = () => {
    onError(new Error('Network error'));
  };

  xhr.send(JSON.stringify({
    video_id: videoId,
    transcript,
    model: 'gpt-5.1',
    language,
    detail_level: detailLevel,
  }));

  return () => xhr.abort();
}

export function streamChat(
  videoId: string,
  messages: ChatMessage[],
  transcript: string,
  token: string,
  callbacks: StreamCallbacks,
  language?: string
): () => void {
  const { onChunk, onDone, onError } = callbacks;

  const xhr = new XMLHttpRequest();
  let lastIndex = 0;

  xhr.open('POST', `${API_ENDPOINT}/chat`, true);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.setRequestHeader('Authorization', `Bearer ${token}`);

  xhr.onprogress = () => {
    const newData = xhr.responseText.slice(lastIndex);
    lastIndex = xhr.responseText.length;

    const lines = newData.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') {
          onDone();
          return;
        }
        if (data) {
          // Decode escaped newlines back to actual newlines
          onChunk(data.replace(/\\n/g, '\n'));
        }
      }
    }
  };

  xhr.onload = () => {
    if (xhr.status >= 200 && xhr.status < 300) {
      onDone();
    } else {
      try {
        const error = JSON.parse(xhr.responseText);
        // Check for subscription required error (403)
        if (xhr.status === 403 && error.error === 'subscription_required') {
          onError(new SubscriptionRequiredError(
            error.message || 'Active subscription required',
            error.subscription_status || null,
            error.expired_at || null
          ));
          return;
        }
        onError(new Error(error.detail || 'Failed to send message'));
      } catch {
        onError(new Error('Failed to send message'));
      }
    }
  };

  xhr.onerror = () => {
    onError(new Error('Network error'));
  };

  xhr.send(JSON.stringify({ video_id: videoId, messages, transcript, model: 'gpt-5.1', language }));

  return () => xhr.abort();
}
