import { streamSummary, streamChat, ChatMessage } from './api';
import { AppDispatch } from './store';
import { updateStreaming } from './store/slices/streamingSlice';
import { updateVideo } from './store/slices/videosSlice';
import type { DetailLevel } from './store/slices/languageSlice';

// Store active XHR references to prevent garbage collection
const activeStreams: Record<string, () => void> = {};

export function startSummaryStream(
  videoId: string,
  transcript: string,
  token: string,
  dispatch: AppDispatch,
  language?: string,
  detailLevel?: DetailLevel
) {
  // Cancel any existing stream for this video
  if (activeStreams[`summary-${videoId}`]) {
    activeStreams[`summary-${videoId}`]();
  }

  // Initialize streaming state
  dispatch(
    updateStreaming({
      videoId,
      update: { isLoadingSummary: true, streamingSummary: '' },
    })
  );

  let fullText = '';
  let pendingDispatch: ReturnType<typeof setTimeout> | null = null;

  // Throttle Redux updates to reduce re-renders (100ms interval)
  const flushUpdate = () => {
    dispatch(
      updateStreaming({
        videoId,
        update: { streamingSummary: fullText },
      })
    );
    pendingDispatch = null;
  };

  const cancel = streamSummary(videoId, transcript, token, {
    onChunk: (chunk) => {
      fullText += chunk;
      // Only schedule a dispatch if none is pending
      if (!pendingDispatch) {
        pendingDispatch = setTimeout(flushUpdate, 100);
      }
    },
    onDone: () => {
      // Flush any pending update immediately
      if (pendingDispatch) {
        clearTimeout(pendingDispatch);
        pendingDispatch = null;
      }
      flushUpdate();

      // Save final summary to persisted store
      dispatch(
        updateVideo({
          videoId,
          update: { summary: fullText },
        })
      );

      // Clear streaming state
      dispatch(
        updateStreaming({
          videoId,
          update: { isLoadingSummary: false, streamingSummary: '' },
        })
      );

      delete activeStreams[`summary-${videoId}`];
    },
    onError: (err) => {
      console.error('Summary stream error:', err);
      // Clear any pending dispatch
      if (pendingDispatch) {
        clearTimeout(pendingDispatch);
        pendingDispatch = null;
      }
      dispatch(
        updateStreaming({
          videoId,
          update: { isLoadingSummary: false, streamingSummary: '' },
        })
      );
      delete activeStreams[`summary-${videoId}`];
    },
  }, language, detailLevel);

  activeStreams[`summary-${videoId}`] = cancel;
  return cancel;
}

export function startChatStream(
  videoId: string,
  messages: ChatMessage[],
  transcript: string,
  token: string,
  dispatch: AppDispatch,
  language?: string
) {
  // Cancel any existing chat stream for this video
  if (activeStreams[`chat-${videoId}`]) {
    activeStreams[`chat-${videoId}`]();
  }

  // Initialize streaming state
  dispatch(
    updateStreaming({
      videoId,
      update: {
        isLoadingChat: true,
        streamingChat: '',
        pendingChatMessages: messages,
      },
    })
  );

  let fullResponse = '';
  let pendingDispatch: ReturnType<typeof setTimeout> | null = null;

  // Throttle Redux updates to reduce re-renders (100ms interval)
  const flushUpdate = () => {
    dispatch(
      updateStreaming({
        videoId,
        update: { streamingChat: fullResponse },
      })
    );
    pendingDispatch = null;
  };

  const cancel = streamChat(videoId, messages, transcript, token, {
    onChunk: (chunk) => {
      fullResponse += chunk;
      // Only schedule a dispatch if none is pending
      if (!pendingDispatch) {
        pendingDispatch = setTimeout(flushUpdate, 100);
      }
    },
    onDone: () => {
      // Flush any pending update immediately
      if (pendingDispatch) {
        clearTimeout(pendingDispatch);
        pendingDispatch = null;
      }
      flushUpdate();

      // Save messages with assistant response to persisted store
      const assistantMessage: ChatMessage = { role: 'assistant', content: fullResponse };
      const newMessages = [...messages, assistantMessage];

      dispatch(
        updateVideo({
          videoId,
          update: { chatMessages: newMessages },
        })
      );

      // Clear streaming state
      dispatch(
        updateStreaming({
          videoId,
          update: {
            isLoadingChat: false,
            streamingChat: '',
            pendingChatMessages: null,
          },
        })
      );

      delete activeStreams[`chat-${videoId}`];
    },
    onError: (err) => {
      console.error('Chat stream error:', err);
      // Clear any pending dispatch
      if (pendingDispatch) {
        clearTimeout(pendingDispatch);
        pendingDispatch = null;
      }
      // Save error message
      const errorMessage: ChatMessage = { role: 'assistant', content: `Error: ${err.message}` };
      const newMessages = [...messages, errorMessage];

      dispatch(
        updateVideo({
          videoId,
          update: { chatMessages: newMessages },
        })
      );

      dispatch(
        updateStreaming({
          videoId,
          update: {
            isLoadingChat: false,
            streamingChat: '',
            pendingChatMessages: null,
          },
        })
      );

      delete activeStreams[`chat-${videoId}`];
    },
  }, language);

  activeStreams[`chat-${videoId}`] = cancel;
  return cancel;
}
