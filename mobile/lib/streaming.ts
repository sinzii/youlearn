import { streamSummary, streamChat, ChatMessage } from './api';
import { StreamingState, VideosState } from './store';

type SetStreamingState = (update: (prev: StreamingState) => StreamingState) => void;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SetVideosState = (update: (prev: any) => VideosState) => void;

// Store active XHR references to prevent garbage collection
const activeStreams: Record<string, () => void> = {};

export function startSummaryStream(
  videoId: string,
  transcript: string,
  token: string,
  setStreamingState: SetStreamingState,
  setVideos: SetVideosState
) {
  // Cancel any existing stream for this video
  if (activeStreams[`summary-${videoId}`]) {
    activeStreams[`summary-${videoId}`]();
  }

  // Initialize streaming state
  setStreamingState((prev) => ({
    ...prev,
    [videoId]: {
      ...(prev[videoId] || {
        streamingSummary: '',
        streamingChat: '',
        isLoadingSummary: false,
        isLoadingChat: false,
        pendingChatMessages: null,
      }),
      isLoadingSummary: true,
      streamingSummary: '',
    },
  }));

  let fullText = '';

  const cancel = streamSummary(videoId, transcript, token, {
    onChunk: (chunk) => {
      fullText += chunk;
      setStreamingState((prev) => ({
        ...prev,
        [videoId]: {
          ...prev[videoId],
          streamingSummary: fullText,
        },
      }));
    },
    onDone: () => {
      // Save final summary to persisted store
      setVideos((prev) => {
        const existing = prev[videoId];
        if (!existing) return prev;
        return {
          ...prev,
          [videoId]: {
            ...existing,
            summary: fullText,
            lastAccessed: Date.now(),
          },
        };
      });

      // Clear streaming state
      setStreamingState((prev) => ({
        ...prev,
        [videoId]: {
          ...prev[videoId],
          isLoadingSummary: false,
          streamingSummary: '',
        },
      }));

      delete activeStreams[`summary-${videoId}`];
    },
    onError: (err) => {
      console.error('Summary stream error:', err);
      setStreamingState((prev) => ({
        ...prev,
        [videoId]: {
          ...prev[videoId],
          isLoadingSummary: false,
          streamingSummary: '',
        },
      }));
      delete activeStreams[`summary-${videoId}`];
    },
  });

  activeStreams[`summary-${videoId}`] = cancel;
  return cancel;
}

export function startChatStream(
  videoId: string,
  messages: ChatMessage[],
  transcript: string,
  token: string,
  setStreamingState: SetStreamingState,
  setVideos: SetVideosState
) {
  // Cancel any existing chat stream for this video
  if (activeStreams[`chat-${videoId}`]) {
    activeStreams[`chat-${videoId}`]();
  }

  // Initialize streaming state
  setStreamingState((prev) => ({
    ...prev,
    [videoId]: {
      ...(prev[videoId] || {
        streamingSummary: '',
        streamingChat: '',
        isLoadingSummary: false,
        isLoadingChat: false,
        pendingChatMessages: null,
      }),
      isLoadingChat: true,
      streamingChat: '',
      pendingChatMessages: messages,
    },
  }));

  let fullResponse = '';

  const cancel = streamChat(videoId, messages, transcript, token, {
    onChunk: (chunk) => {
      fullResponse += chunk;
      setStreamingState((prev) => ({
        ...prev,
        [videoId]: {
          ...prev[videoId],
          streamingChat: fullResponse,
        },
      }));
    },
    onDone: () => {
      // Save messages with assistant response to persisted store
      const assistantMessage: ChatMessage = { role: 'assistant', content: fullResponse };
      const newMessages = [...messages, assistantMessage];

      setVideos((prev) => {
        const existing = prev[videoId];
        if (!existing) return prev;
        return {
          ...prev,
          [videoId]: {
            ...existing,
            chatMessages: newMessages,
            lastAccessed: Date.now(),
          },
        };
      });

      // Clear streaming state
      setStreamingState((prev) => ({
        ...prev,
        [videoId]: {
          ...prev[videoId],
          isLoadingChat: false,
          streamingChat: '',
          pendingChatMessages: null,
        },
      }));

      delete activeStreams[`chat-${videoId}`];
    },
    onError: (err) => {
      console.error('Chat stream error:', err);
      // Save error message
      const errorMessage: ChatMessage = { role: 'assistant', content: `Error: ${err.message}` };
      const newMessages = [...messages, errorMessage];

      setVideos((prev) => {
        const existing = prev[videoId];
        if (!existing) return prev;
        return {
          ...prev,
          [videoId]: {
            ...existing,
            chatMessages: newMessages,
            lastAccessed: Date.now(),
          },
        };
      });

      setStreamingState((prev) => ({
        ...prev,
        [videoId]: {
          ...prev[videoId],
          isLoadingChat: false,
          streamingChat: '',
          pendingChatMessages: null,
        },
      }));

      delete activeStreams[`chat-${videoId}`];
    },
  });

  activeStreams[`chat-${videoId}`] = cancel;
  return cancel;
}
