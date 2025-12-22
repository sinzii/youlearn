import { useAuth } from '@clerk/clerk-expo';
import { useHeaderHeight } from '@react-navigation/elements';
import { useState, useCallback, useRef, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Markdown from 'react-native-markdown-display';
import { Text, Input, Button, useTheme } from '@rneui/themed';
import { useSetAtom } from 'jotai';

import { ChatMessage } from '@/lib/api';
import { segmentsToText } from '@/utils/transcript';
import { useVideoCache, useVideoStreaming, videosAtom, streamingStateAtom } from '@/lib/store';
import { useMarkdownStyles } from '@/hooks/useMarkdownStyles';
import { startChatStream } from '@/lib/streaming';

function TypingDot({ delay, color }: { delay: number; color: string }) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 400 }),
          withTiming(0.3, { duration: 400 })
        ),
        -1,
        false
      )
    );
  }, [delay, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        { width: 8, height: 8, borderRadius: 4, backgroundColor: color, marginHorizontal: 2 },
        animatedStyle,
      ]}
    />
  );
}

function TypingIndicator({ color }: { color: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4 }}>
      <TypingDot delay={0} color={color} />
      <TypingDot delay={150} color={color} />
      <TypingDot delay={300} color={color} />
    </View>
  );
}

interface PendingAction {
  action: 'explain' | 'ask';
  text: string;
}

interface ChatTabProps {
  videoId: string;
  pendingAction?: PendingAction | null;
  onActionHandled?: () => void;
}

export function ChatTab({ videoId, pendingAction, onActionHandled }: ChatTabProps) {
  const headerHeight = useHeaderHeight();
  const { video, updateVideo } = useVideoCache(videoId);
  const { streaming } = useVideoStreaming(videoId);
  const setStreamingState = useSetAtom(streamingStateAtom);
  const setVideos = useSetAtom(videosAtom);
  const transcript = video?.transcript ? segmentsToText(video.transcript.segments) : '';
  const { theme } = useTheme();
  const { getToken } = useAuth();
  const [input, setInput] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const userHasScrolledRef = useRef(false);
  const questionPositionRef = useRef(0);
  const shouldScrollToQuestionRef = useRef(false);
  const markdownStyles = useMarkdownStyles('compact');

  // Get messages from store, considering pending messages during streaming
  const messages = streaming.pendingChatMessages || video?.chatMessages || [];
  const isLoading = streaming.isLoadingChat;
  const streamingResponse = streaming.streamingChat;
  const initialMessagesRef = useRef(messages.length);

  // Scroll to bottom on mount if there are existing messages
  useEffect(() => {
    if (initialMessagesRef.current > 0) {
      scrollViewRef.current?.scrollToEnd({ animated: false });
    }
  }, []);

  // Auto-scroll to question when streaming response updates
  useEffect(() => {
    if (streamingResponse && !userHasScrolledRef.current && questionPositionRef.current > 0) {
      scrollViewRef.current?.scrollTo({ y: questionPositionRef.current, animated: false });
    }
  }, [streamingResponse]);

  // Track the last handled pending action to prevent duplicate sends
  const lastHandledActionRef = useRef<string | null>(null);

  // Helper function to send a message programmatically
  const sendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    // Reset scroll flags on new question
    userHasScrolledRef.current = false;
    shouldScrollToQuestionRef.current = true;

    const userMessage: ChatMessage = { role: 'user', content: messageText };
    const currentMessages = video?.chatMessages || [];
    const newMessages = [...currentMessages, userMessage];

    // Save user message to store immediately
    updateVideo({ chatMessages: newMessages });

    // Show loading indicator immediately
    setStreamingState((prev) => ({
      ...prev,
      [videoId]: {
        ...(prev[videoId] || { streamingSummary: '', streamingChat: '', isLoadingSummary: false, isLoadingChat: false, pendingChatMessages: null }),
        isLoadingChat: true,
        pendingChatMessages: newMessages,
      },
    }));

    const token = await getToken();
    if (!token) {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Error: Not authenticated',
      };
      updateVideo({ chatMessages: [...newMessages, errorMessage] });
      setStreamingState((prev) => ({
        ...prev,
        [videoId]: {
          ...(prev[videoId] || { streamingSummary: '', streamingChat: '', isLoadingSummary: false, isLoadingChat: false, pendingChatMessages: null }),
          isLoadingChat: false,
          pendingChatMessages: null,
        },
      }));
      return;
    }

    startChatStream(videoId, newMessages, transcript, token, setStreamingState, setVideos);
  }, [video?.chatMessages, videoId, isLoading, getToken, transcript, updateVideo, setStreamingState, setVideos]);

  // Handle pending action from Summary tab text selection
  useEffect(() => {
    if (!pendingAction) return;

    // Create a unique key for this action to prevent duplicate handling
    const actionKey = `${pendingAction.action}:${pendingAction.text}`;
    if (lastHandledActionRef.current === actionKey) return;

    lastHandledActionRef.current = actionKey;

    if (pendingAction.action === 'explain') {
      // Auto-send explanation request
      const explainPrompt = `Explain this: "${pendingAction.text}"`;
      sendMessage(explainPrompt);
    } else if (pendingAction.action === 'ask') {
      // Pre-fill input for user to review
      setInput(pendingAction.text);
    }

    // Clear the pending action
    onActionHandled?.();
  }, [pendingAction, sendMessage, onActionHandled]);

  const handleSend = useCallback(async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput) return;
    setInput('');
    await sendMessage(trimmedInput);
  }, [input, sendMessage]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={headerHeight + 110}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onScrollBeginDrag={() => {
          userHasScrolledRef.current = true;
        }}
      >
        {messages.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.colors.grey4 }]}>
              Ask questions about the video content
            </Text>
          </View>
        )}
        {messages.map((message, index) => {
          // Find the index of the last user message for scroll tracking
          const lastUserIndex = messages.findLastIndex((m) => m.role === 'user');
          const isLastUserMessage = message.role === 'user' && index === lastUserIndex;

          return (
            <View
              key={index}
              style={[
                styles.messageBubble,
                message.role === 'user' ? styles.userBubble : styles.assistantBubble,
                message.role === 'user'
                  ? { backgroundColor: theme.colors.primary }
                  : { backgroundColor: theme.colors.grey1 },
              ]}
              onLayout={
                isLastUserMessage
                  ? (e) => {
                      questionPositionRef.current = e.nativeEvent.layout.y - 5;
                      if (shouldScrollToQuestionRef.current && !userHasScrolledRef.current) {
                        shouldScrollToQuestionRef.current = false;
                        scrollViewRef.current?.scrollTo({ y: questionPositionRef.current, animated: true });
                      }
                    }
                  : undefined
              }
            >
              {message.role === 'user' ? (
                <Text style={[styles.messageText, styles.userText]}>
                  {message.content}
                </Text>
              ) : (
                <Markdown style={markdownStyles}>{message.content}</Markdown>
              )}
            </View>
          );
        })}
        {isLoading && !streamingResponse && (
          <View style={[styles.messageBubble, styles.assistantBubble, { backgroundColor: theme.colors.grey1 }]}>
            <TypingIndicator color={theme.colors.grey3} />
          </View>
        )}
        {streamingResponse && (
          <View style={[styles.messageBubble, styles.assistantBubble, { backgroundColor: theme.colors.grey1 }]}>
            <Markdown style={markdownStyles}>{streamingResponse}</Markdown>
          </View>
        )}
      </ScrollView>

      <SafeAreaView edges={['bottom']}>
        <View style={[styles.inputContainer, { borderTopColor: theme.colors.grey1 }]}>
          <Input
            placeholder="Type a message..."
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleSend}
            disabled={isLoading}
            multiline
            containerStyle={styles.inputWrapper}
            inputContainerStyle={[
              styles.inputField,
              { borderColor: theme.colors.grey3 },
            ]}
            renderErrorMessage={false}
          />
          <Button
            title={isLoading ? '...' : 'Send'}
            onPress={handleSend}
            disabled={isLoading || !input.trim()}
            size="sm"
            buttonStyle={styles.sendButton}
          />
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    flexGrow: 1,
    paddingBottom: 100
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  userBubble: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userText: {
    color: '#fff',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
  },
  inputWrapper: {
    flex: 1,
    paddingHorizontal: 0,
    marginBottom: 0,
  },
  inputField: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    maxHeight: 100,
  },
  sendButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
});
