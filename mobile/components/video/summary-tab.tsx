import { useAuth } from '@clerk/clerk-expo';
import { useState, useCallback, useRef, useMemo } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Markdown from 'react-native-markdown-display';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { streamSummary } from '@/lib/api';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface SummaryTabProps {
  videoId: string;
  summary: string | null;
  onSummaryUpdate: (summary: string) => void;
}

export function SummaryTab({ videoId, summary, onSummaryUpdate }: SummaryTabProps) {
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

    streamSummary(videoId, token, {
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
  }, [videoId, onSummaryUpdate, getToken]);

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
      <ThemedView style={styles.emptyContainer}>
        <ThemedText style={styles.emptyText}>
          Generate a summary of this video&#39;s content
        </ThemedText>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: Colors[colorScheme].tint }]}
          onPress={handleSummarize}
        >
          <ThemedText style={styles.buttonText}>Summarize</ThemedText>
        </TouchableOpacity>
        {error && <ThemedText style={styles.errorText}>{error}</ThemedText>}
      </ThemedView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {isLoading && !streamingText && (
        <ThemedView style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={Colors[colorScheme].tint} />
          <ThemedText style={styles.loadingText}>Generating summary...</ThemedText>
        </ThemedView>
      )}
      {displayText && (
        <Markdown style={markdownStyles}>
          {displayText}
        </Markdown>
      )}
      {isLoading && streamingText && (
        <ThemedView style={styles.streamingIndicator}>
          <ActivityIndicator size="small" color={Colors[colorScheme].tint} />
        </ThemedView>
      )}
      {displayText && !isLoading && (
        <TouchableOpacity
          style={styles.resummarizeButton}
          onPress={handleSummarize}
        >
          <ThemedText style={styles.resummarizeText}>Resummarize</ThemedText>
        </TouchableOpacity>
      )}
      {error && <ThemedText style={styles.errorText}>{error}</ThemedText>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  emptyText: {
    opacity: 0.6,
    textAlign: 'center',
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  loadingText: {
    opacity: 0.6,
  },
  streamingIndicator: {
    marginTop: 8,
  },
  errorText: {
    color: '#ef4444',
    marginTop: 12,
  },
  resummarizeButton: {
    marginTop: 16,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  resummarizeText: {
    opacity: 0.6,
    fontSize: 14,
  },
});
