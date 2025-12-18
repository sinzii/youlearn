import { useAuth } from '@clerk/clerk-expo';
import { useState, useCallback, useRef, useMemo } from 'react';
import { ScrollView } from 'react-native';
import Markdown from 'react-native-markdown-display';

import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { streamSummary } from '@/lib/api';
import { segmentsToText } from '@/utils/transcript';
import { useVideoCache } from '@/lib/store';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface SummaryTabProps {
  videoId: string;
  summary: string | null;
  onSummaryUpdate: (summary: string) => void;
}

export function SummaryTab({ videoId, summary, onSummaryUpdate }: SummaryTabProps) {
  const { video } = useVideoCache(videoId);
  const transcript = video?.transcript ? segmentsToText(video.transcript.segments) : '';
  const colorScheme = useColorScheme() ?? 'light';
  const { getToken } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fullTextRef = useRef('');

  const textColor = Colors[colorScheme].text;
  const tintColor = Colors[colorScheme].tint;
  const codeBgColor = colorScheme === 'dark' ? '#333' : '#f0f0f0';

  const handleSummarize = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    onSummaryUpdate('');
    setStreamingText('');
    fullTextRef.current = '';

    const token = await getToken();
    if (!token) {
      setIsLoading(false);
      setError('Not authenticated');
      return;
    }

    streamSummary(videoId, transcript, token, {
      onChunk: (chunk) => {
        fullTextRef.current += chunk;
        setStreamingText(fullTextRef.current);
      },
      onDone: () => {
        setIsLoading(false);
        onSummaryUpdate(fullTextRef.current);
      },
      onError: (err) => {
        setIsLoading(false);
        setError(err.message);
      },
    });
  }, [videoId, onSummaryUpdate, getToken, transcript]);

  const displayText = summary || streamingText;

  const markdownStyles = useMemo(
    () => ({
      body: {
        color: textColor,
        fontSize: 14,
        lineHeight: 22,
      },
      heading1: {
        fontSize: 24,
        fontWeight: '700' as const,
        marginTop: 16,
        marginBottom: 8,
        color: textColor,
      },
      heading2: {
        fontSize: 20,
        fontWeight: '600' as const,
        marginTop: 14,
        marginBottom: 6,
        color: textColor,
      },
      heading3: {
        fontSize: 16,
        fontWeight: '600' as const,
        marginTop: 12,
        marginBottom: 4,
        color: textColor,
      },
      paragraph: {
        marginBottom: 8,
      },
      list_item: {
        marginBottom: 4,
      },
      strong: {
        fontWeight: '700' as const,
      },
      em: {
        fontStyle: 'italic' as const,
      },
      link: {
        color: tintColor,
        textDecorationLine: 'underline' as const,
      },
      code_inline: {
        fontFamily: 'monospace',
        fontSize: 13,
        backgroundColor: codeBgColor,
        color: textColor,
      },
      code_block: {
        fontFamily: 'monospace',
        fontSize: 13,
        backgroundColor: codeBgColor,
        color: textColor,
        padding: 8,
        borderRadius: 4,
      },
      fence: {
        fontFamily: 'monospace',
        fontSize: 13,
        backgroundColor: codeBgColor,
        color: textColor,
        padding: 8,
        borderRadius: 4,
      },
    }),
    [textColor, tintColor, codeBgColor]
  );

  if (!displayText && !isLoading) {
    return (
      <VStack className="flex-1 justify-center items-center p-6 gap-4">
        <Text className="text-typography-500 text-center">
          Generate a summary of this video&#39;s content
        </Text>
        <Button
          action="primary"
          className="rounded-lg px-6"
          onPress={handleSummarize}
        >
          <ButtonText className="font-semibold">Summarize</ButtonText>
        </Button>
        {error && <Text className="text-error-500 mt-3">{error}</Text>}
      </VStack>
    );
  }

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
      {isLoading && !streamingText && (
        <HStack className="items-center gap-2 mb-4">
          <Spinner size="small" className="text-primary-500" />
          <Text className="text-typography-500">Generating summary...</Text>
        </HStack>
      )}
      {displayText && (
        <Markdown style={markdownStyles}>
          {displayText}
        </Markdown>
      )}
      {isLoading && streamingText && (
        <Box className="mt-2">
          <Spinner size="small" className="text-primary-500" />
        </Box>
      )}
      {displayText && !isLoading && (
        <Pressable
          className="mt-4 self-center px-4 py-2"
          onPress={handleSummarize}
        >
          <Text className="text-typography-500 text-sm">Resummarize</Text>
        </Pressable>
      )}
      {error && <Text className="text-error-500 mt-3">{error}</Text>}
    </ScrollView>
  );
}
