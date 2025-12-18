import { useAuth } from '@clerk/clerk-expo';
import { useState, useCallback, useRef } from 'react';
import { ScrollView, KeyboardAvoidingView, Platform } from 'react-native';

import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { Textarea, TextareaInput } from '@/components/ui/textarea';
import { VStack } from '@/components/ui/vstack';
import { streamChat, ChatMessage } from '@/lib/api';
import { segmentsToText } from '@/utils/transcript';
import { useVideoCache } from '@/lib/store';

interface ChatTabProps {
  videoId: string;
}

export function ChatTab({ videoId }: ChatTabProps) {
  const { video } = useVideoCache(videoId);
  const transcript = video?.transcript ? segmentsToText(video.transcript.segments) : '';
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

    streamChat(videoId, newMessages, transcript, token, {
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
  }, [input, messages, videoId, isLoading, scrollToBottom, getToken, transcript]);

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={200}
    >
      <ScrollView
        ref={scrollViewRef}
        className="flex-1"
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
      >
        {messages.length === 0 && (
          <VStack className="flex-1 justify-center items-center">
            <Text className="text-typography-500 text-center">
              Ask questions about the video content
            </Text>
          </VStack>
        )}
        {messages.map((message, index) => (
          <Box
            key={index}
            className={`max-w-[80%] p-3 rounded-2xl mb-2 ${
              message.role === 'user'
                ? 'self-end bg-primary-500 rounded-br-sm'
                : 'self-start bg-background-100 rounded-bl-sm'
            }`}
          >
            <Text
              className={`text-sm leading-5 ${
                message.role === 'user' ? 'text-white' : 'text-typography-900'
              }`}
            >
              {message.content}
            </Text>
          </Box>
        ))}
        {streamingResponse && (
          <Box className="max-w-[80%] p-3 rounded-2xl mb-2 self-start bg-background-100 rounded-bl-sm">
            <Text className="text-sm leading-5 text-typography-900">{streamingResponse}</Text>
            <Spinner size="small" className="mt-1 text-primary-500" />
          </Box>
        )}
      </ScrollView>

      <HStack className="p-3 gap-2 border-t border-outline-200">
        <Textarea
          className="flex-1 rounded-2xl"
          isDisabled={isLoading}
        >
          <TextareaInput
            placeholder="Type a message..."
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleSend}
            className="text-sm max-h-[100px]"
          />
        </Textarea>
        <Button
          action="primary"
          className="rounded-2xl px-4"
          onPress={handleSend}
          isDisabled={isLoading || !input.trim()}
        >
          <ButtonText className="font-semibold">
            {isLoading ? '...' : 'Send'}
          </ButtonText>
        </Button>
      </HStack>
    </KeyboardAvoidingView>
  );
}
