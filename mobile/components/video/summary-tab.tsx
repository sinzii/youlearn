import { useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';

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
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fullTextRef = useRef('');

  const handleSummarize = useCallback(() => {
    setIsLoading(true);
    setError(null);
    setStreamingText('');
    fullTextRef.current = '';

    streamSummary(videoId, {
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
  }, [videoId, onSummaryUpdate]);

  const displayText = summary || streamingText;

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
        <ThemedText style={styles.summaryText}>{displayText}</ThemedText>
      )}
      {isLoading && streamingText && (
        <ThemedView style={styles.streamingIndicator}>
          <ActivityIndicator size="small" color={Colors[colorScheme].tint} />
        </ThemedView>
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
  summaryText: {
    fontSize: 14,
    lineHeight: 22,
  },
  streamingIndicator: {
    marginTop: 8,
  },
  errorText: {
    color: '#ef4444',
    marginTop: 12,
  },
});
