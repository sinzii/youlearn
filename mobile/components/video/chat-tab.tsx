import { useAuth } from '@clerk/clerk-expo';
import { useHeaderHeight } from '@react-navigation/elements';
import { useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Markdown from 'react-native-markdown-display';
import { Text, Input, Button, useTheme } from '@rneui/themed';

import { streamChat, ChatMessage } from '@/lib/api';
import { segmentsToText } from '@/utils/transcript';
import { useVideoCache } from '@/lib/store';
import { useMarkdownStyles } from '@/hooks/useMarkdownStyles';

interface ChatTabProps {
  videoId: string;
}

export function ChatTab({ videoId }: ChatTabProps) {
  const headerHeight = useHeaderHeight();
  const { video, updateVideo } = useVideoCache(videoId);
  const transcript = video?.transcript ? segmentsToText(video.transcript.segments) : '';
  const { theme } = useTheme();
  const { getToken } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>(video?.chatMessages || []);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingResponse, setStreamingResponse] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const userHasScrolledRef = useRef(false);
  const questionPositionRef = useRef(0);
  const markdownStyles = useMarkdownStyles('compact');

  // Persist messages to store whenever they change
  const updateMessages = useCallback((newMessages: ChatMessage[]) => {
    setMessages(newMessages);
    updateVideo({ chatMessages: newMessages });
  }, [updateVideo]);

  const scrollToQuestion = useCallback(() => {
    if (userHasScrolledRef.current) return;
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: questionPositionRef.current, animated: true });
    }, 100);
  }, []);

  const handleSend = useCallback(async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    // Reset scroll flag on new question
    userHasScrolledRef.current = false;

    const userMessage: ChatMessage = { role: 'user', content: trimmedInput };
    const newMessages = [...messages, userMessage];
    updateMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setStreamingResponse('');
    scrollToQuestion();

    const token = await getToken();
    if (!token) {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Error: Not authenticated',
      };
      updateMessages([...newMessages, errorMessage]);
      setIsLoading(false);
      return;
    }

    let fullResponse = '';

    streamChat(videoId, newMessages, transcript, token, {
      onChunk: (chunk) => {
        fullResponse += chunk;
        setStreamingResponse(fullResponse);
        scrollToQuestion();
      },
      onDone: () => {
        const assistantMessage: ChatMessage = { role: 'assistant', content: fullResponse };
        updateMessages([...newMessages, assistantMessage]);
        setStreamingResponse('');
        setIsLoading(false);
      },
      onError: (err) => {
        const errorMessage: ChatMessage = {
          role: 'assistant',
          content: `Error: ${err.message}`,
        };
        updateMessages([...newMessages, errorMessage]);
        setIsLoading(false);
      },
    });
  }, [input, messages, videoId, isLoading, scrollToQuestion, getToken, transcript, updateMessages]);

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
                      questionPositionRef.current = e.nativeEvent.layout.y;
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
        {streamingResponse && (
          <View style={[styles.messageBubble, styles.assistantBubble, { backgroundColor: theme.colors.grey1 }]}>
            <Markdown style={markdownStyles}>{streamingResponse}</Markdown>
            <ActivityIndicator
              size="small"
              color={theme.colors.primary}
              style={styles.streamingIndicator}
            />
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
  streamingIndicator: {
    marginTop: 4,
    alignSelf: 'flex-start',
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
