import { useAuth } from '@clerk/clerk-expo';
import { useHeaderHeight } from '@react-navigation/elements';
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  View,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
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
import { useTranslation } from 'react-i18next';

import { ChatMessage } from '@/lib/api';
import { segmentsToText } from '@/utils/transcript';
import { updateStreaming } from '@/lib/store';
import { useMarkdownStyles } from '@/hooks/useMarkdownStyles';
import { startChatStream } from '@/lib/streaming';
import {
  useChatStreaming,
  useVideoCache,
  useAppDispatch,
  usePreferredLanguage,
} from "@/lib/store/hooks";

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

// Types for list items
type MessageItem = ChatMessage & { itemType: 'message'; messageIndex: number };
type TypingItem = { itemType: 'typing' };
type StreamingItem = { itemType: 'streaming'; content: string };
type ListItem = MessageItem | TypingItem | StreamingItem;

interface PendingAction {
  action: 'explain' | 'ask';
  text: string;
}

interface SuggestedQuestionsProps {
  questions: string[];
  onQuestionPress: (question: string) => void;
  disabled: boolean;
  theme: ReturnType<typeof useTheme>['theme'];
  t: ReturnType<typeof useTranslation>['t'];
}

function SuggestedQuestions({
  questions,
  onQuestionPress,
  disabled,
  theme,
  t,
}: SuggestedQuestionsProps) {
  return (
    <View style={suggestedStyles.container}>
      <Text style={[suggestedStyles.title, { color: theme.colors.grey4 }]}>
        {t('chat.quickQuestions')}
      </Text>
      <View style={suggestedStyles.questionsContainer}>
        {questions.map((question, index) => (
          <TouchableOpacity
            key={index}
            style={[
              suggestedStyles.questionChip,
              {
                backgroundColor: theme.colors.grey0,
                borderColor: theme.colors.grey2,
              },
              disabled && { opacity: 0.5 },
            ]}
            onPress={() => onQuestionPress(question)}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="chat-bubble-outline"
              size={14}
              color={theme.colors.primary}
              style={suggestedStyles.questionIcon}
            />
            <Text
              style={[suggestedStyles.questionText, { color: theme.colors.black }]}
              numberOfLines={2}
            >
              {question}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

interface ChatTabProps {
  videoId: string;
  pendingAction?: PendingAction | null;
  onActionHandled?: () => void;
}

export function ChatTab({ videoId, pendingAction, onActionHandled }: ChatTabProps) {
  const headerHeight = useHeaderHeight();
  const {video, updateVideo} = useVideoCache(videoId);
  const {isLoading, streamingContent: streamingResponse, pendingMessages} = useChatStreaming(videoId);
  const dispatch = useAppDispatch();
  const preferredLanguage = usePreferredLanguage();
  const transcript = video?.transcript ? segmentsToText(video.transcript.segments) : '';
  const {theme} = useTheme();
  const { t } = useTranslation();
  const {getToken} = useAuth();
  const [input, setInput] = useState('');
  const [contextText, setContextText] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);
  const flatListRef = useRef<FlatList<ListItem>>(null);
  const userHasScrolledRef = useRef(false);
  const [shouldScroll, setShouldScroll] = useState(false);
  const markdownStyles = useMarkdownStyles('compact');

  // Get messages from store, considering pending messages during streaming
  const messages = useMemo(() => {
    return pendingMessages || video?.chatMessages || [];
  }, [pendingMessages, video?.chatMessages]);
  const initialMessagesRef = useRef(messages.length);

  // Build list data with proper typing
  const listData = useMemo((): ListItem[] => {
    const data: ListItem[] = messages.map((msg, index) => ({
      ...msg,
      itemType: 'message' as const,
      messageIndex: index,
    }));

    if (isLoading && !streamingResponse) {
      data.push({ itemType: 'typing' });
    }
    if (streamingResponse) {
      data.push({ itemType: 'streaming', content: streamingResponse });
    }

    return data;
  }, [messages, isLoading, streamingResponse]);

  // Scroll to end on mount if there are existing messages
  useEffect(() => {
    if (initialMessagesRef.current > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 20);
    }
  }, []);

  // Auto-scroll to show user's question when new message is sent
  useEffect(() => {
    if (shouldScroll && !userHasScrolledRef.current && listData.length > 0) {
      setShouldScroll(false);

      // Longer delay to ensure layout is complete
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({animated: true});
      }, 150);
    }
  }, [shouldScroll, listData.length]);

  // Track the last handled pending action to prevent duplicate sends
  const lastHandledActionRef = useRef<string | null>(null);

  // Helper function to send a message programmatically
  const sendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    // Reset scroll flag on new question
    userHasScrolledRef.current = false;

    const userMessage: ChatMessage = {role: 'user', content: messageText};
    const currentMessages = video?.chatMessages || [];
    const newMessages = [...currentMessages, userMessage];

    // Trigger auto-scroll to show user's question
    setShouldScroll(true);

    // Save user message to store immediately
    updateVideo({chatMessages: newMessages});

    // Show loading indicator immediately
    dispatch(updateStreaming({
      videoId,
      update: {
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
      dispatch(updateStreaming({
        videoId,
        update: {
          isLoadingChat: false,
          pendingChatMessages: null,
        },
      }));
      return;
    }

    startChatStream(videoId, newMessages, transcript, token, dispatch, preferredLanguage);
  }, [video?.chatMessages, videoId, isLoading, getToken, transcript, updateVideo, dispatch, preferredLanguage]);

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
      // Set context and focus input
      setContextText(pendingAction.text);
      setTimeout(() => inputRef.current?.focus(), 100);
    }

    // Clear the pending action
    onActionHandled?.();
  }, [pendingAction, sendMessage, onActionHandled]);

  const handleSend = useCallback(async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    // Format message with context if present
    let messageText = trimmedInput;
    if (contextText) {
      messageText = `${trimmedInput}\n\n"${contextText}"`;
      setContextText(null);
    }

    setInput('');
    await sendMessage(messageText);
  }, [input, contextText, sendMessage]);

  // Render individual list item
  const renderItem = useCallback(({ item }: { item: ListItem }) => {
    if (item.itemType === 'typing') {
      return (
        <View style={[styles.messageBubble, styles.assistantBubble, { backgroundColor: theme.colors.grey1 }]}>
          <TypingIndicator color={theme.colors.grey3} />
        </View>
      );
    }

    if (item.itemType === 'streaming') {
      return (
        <View style={[styles.messageBubble, styles.assistantBubble, { backgroundColor: theme.colors.grey1 }]}>
          <Markdown style={markdownStyles}>{item.content}</Markdown>
        </View>
      );
    }

    // Regular message
    const message = item as MessageItem;
    return (
      <View
        style={[
          styles.messageBubble,
          message.role === 'user' ? styles.userBubble : styles.assistantBubble,
          message.role === 'user'
            ? { backgroundColor: theme.colors.primary }
            : { backgroundColor: theme.colors.grey1 },
        ]}
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
  }, [theme.colors, markdownStyles]);

  // Key extractor
  const keyExtractor = useCallback((item: ListItem, index: number) => {
    if (item.itemType === 'typing') return 'typing';
    if (item.itemType === 'streaming') return 'streaming';
    return `message-${index}`;
  }, []);

  // Get suggested questions
  const suggestedQuestions = useMemo(
    () => video?.suggestedQuestions || [],
    [video?.suggestedQuestions]
  );

  // Handle suggested question press
  const handleSuggestedQuestionPress = useCallback(
    (question: string) => {
      sendMessage(question);
    },
    [sendMessage]
  );

  // Empty list component - show suggested questions if available
  const ListEmptyComponent = useCallback(() => {
    if (suggestedQuestions.length > 0) {
      return (
        <SuggestedQuestions
          questions={suggestedQuestions}
          onQuestionPress={handleSuggestedQuestionPress}
          disabled={isLoading}
          theme={theme}
          t={t}
        />
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: theme.colors.grey4 }]}>
          {t('chat.emptyState')}
        </Text>
      </View>
    );
  }, [suggestedQuestions, handleSuggestedQuestionPress, isLoading, theme, t]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={headerHeight + 110}
    >
      <FlatList
        ref={flatListRef}
        data={listData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        style={styles.messagesContainer}
        contentContainerStyle={[
          styles.messagesContent,
          listData.length === 0 && styles.emptyContent,
        ]}
        ListEmptyComponent={ListEmptyComponent}
        onScrollBeginDrag={() => {
          userHasScrolledRef.current = true;
        }}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={10}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
      />

      <SafeAreaView edges={['bottom']}>
        {contextText && (
          <View style={[styles.contextContainer, { backgroundColor: theme.colors.grey0, borderTopColor: theme.colors.grey1 }]}>
            <Text style={[styles.contextLabel, { color: theme.colors.grey4 }]}>{t('chat.context')}</Text>
            <Text style={[styles.contextText, { color: theme.colors.black }]} numberOfLines={1}>
              &quot;{contextText}&quot;
            </Text>
            <TouchableOpacity onPress={() => setContextText(null)}>
              <MaterialIcons name="close" size={18} color={theme.colors.grey4} />
            </TouchableOpacity>
          </View>
        )}
        <View style={[styles.inputContainer, { borderTopColor: theme.colors.grey1 }]}>
          <Input
            ref={inputRef}
            placeholder={t('chat.placeholder')}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleSend}
            disabled={isLoading}
            multiline
            containerStyle={styles.inputWrapper}
            inputContainerStyle={[
              styles.inputField,
              {
                backgroundColor: theme.colors.grey0,
                borderColor: theme.colors.greyOutline,
              },
            ]}
            renderErrorMessage={false}
          />
          <Button
            title={isLoading ? '...' : t('chat.send')}
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
    paddingBottom: 100,
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyContainer: {
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
  contextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderTopWidth: 1,
  },
  contextLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  contextText: {
    flex: 1,
    fontSize: 12,
    fontStyle: 'italic',
  },
});

const suggestedStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  title: {
    fontSize: 14,
    marginBottom: 16,
  },
  questionsContainer: {
    width: '100%',
    gap: 10,
  },
  questionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  questionIcon: {
    marginRight: 10,
  },
  questionText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});
