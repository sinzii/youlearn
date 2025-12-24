import { streamSummary, streamChat, ChatMessage } from './api';
import { AppDispatch } from './store';
import { updateStreaming } from './store/slices/streamingSlice';
import { updateVideo } from './store/slices/videosSlice';

// Store active XHR references to prevent garbage collection
const activeStreams: Record<string, () => void> = {};

export function startSummaryStream(
  videoId: string,
  transcript: string,
  token: string,
  dispatch: AppDispatch
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

  const cancel = streamSummary(videoId, transcript, token, {
    onChunk: (chunk) => {
      fullText += chunk;
      dispatch(
        updateStreaming({
          videoId,
          update: { streamingSummary: fullText },
        })
      );
    },
    onDone: () => {
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
      dispatch(
        updateStreaming({
          videoId,
          update: { isLoadingSummary: false, streamingSummary: '' },
        })
      );
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
  dispatch: AppDispatch
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

  const cancel = streamChat(videoId, messages, transcript, token, {
    onChunk: (chunk) => {
      fullResponse += chunk;
      dispatch(
        updateStreaming({
          videoId,
          update: { streamingChat: fullResponse },
        })
      );
    },
    onDone: () => {
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
  });

  activeStreams[`chat-${videoId}`] = cancel;
  return cancel;
}
