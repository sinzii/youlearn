import { useAuth } from '@clerk/clerk-expo';
import { useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { streamChat, ChatMessage } from '@/lib/api';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface ChatTabProps {
  videoId: string;
}

export function ChatTab({ videoId }: ChatTabProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const { getToken } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingResponse, setStreamingResponse] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  const handleSend = useCallback(async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: trimmedInput };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setStreamingResponse('');
    scrollToBottom();

    const token = await getToken();
    if (!token) {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Error: Not authenticated',
      };
      setMessages([...newMessages, errorMessage]);
      setIsLoading(false);
      return;
    }

    let fullResponse = '';

    streamChat(videoId, newMessages, token, {
      onChunk: (chunk) => {
        fullResponse += chunk;
        setStreamingResponse(fullResponse);
        scrollToBottom();
      },
      onDone: () => {
        const assistantMessage: ChatMessage = { role: 'assistant', content: fullResponse };
        setMessages([...newMessages, assistantMessage]);
        setStreamingResponse('');
        setIsLoading(false);
      },
      onError: (err) => {
        const errorMessage: ChatMessage = {
          role: 'assistant',
          content: `Error: ${err.message}`,
        };
        setMessages([...newMessages, errorMessage]);
        setIsLoading(false);
      },
    });
  }, [input, messages, videoId, isLoading, scrollToBottom, getToken]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={200}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
      >
        {messages.length === 0 && (
          <ThemedView style={styles.emptyContainer}>
            <ThemedText style={styles.emptyText}>
              Ask questions about the video content
            </ThemedText>
          </ThemedView>
        )}
        {messages.map((message, index) => (
          <ThemedView
            key={index}
            style={[
              styles.messageBubble,
              message.role === 'user' ? styles.userBubble : styles.assistantBubble,
              message.role === 'user' && { backgroundColor: Colors[colorScheme].tint },
            ]}
          >
            <ThemedText
              style={[
                styles.messageText,
                message.role === 'user' && styles.userText,
              ]}
            >
              {message.content}
            </ThemedText>
          </ThemedView>
        ))}
        {streamingResponse && (
          <ThemedView style={[styles.messageBubble, styles.assistantBubble]}>
            <ThemedText style={styles.messageText}>{streamingResponse}</ThemedText>
            <ActivityIndicator
              size="small"
              color={Colors[colorScheme].tint}
              style={styles.streamingIndicator}
            />
          </ThemedView>
        )}
      </ScrollView>

      <ThemedView style={styles.inputContainer}>
        <TextInput
          style={[
            styles.input,
            {
              color: Colors[colorScheme].text,
              borderColor: Colors[colorScheme].icon,
            },
          ]}
          placeholder="Type a message..."
          placeholderTextColor={Colors[colorScheme].icon}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={handleSend}
          editable={!isLoading}
          multiline
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            { backgroundColor: Colors[colorScheme].tint },
            (isLoading || !input.trim()) && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={isLoading || !input.trim()}
        >
          <ThemedText style={styles.sendButtonText}>
            {isLoading ? '...' : 'Send'}
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>
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
    opacity: 0.6,
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
    backgroundColor: '#e5e5e5',
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
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 14,
  },
  sendButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
