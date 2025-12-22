import { useAuth } from '@clerk/clerk-expo';
import { useState, useCallback, useRef, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  View,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { Text, Button, useTheme } from '@rneui/themed';

import { streamSummary } from '@/lib/api';
import { segmentsToText } from '@/utils/transcript';
import { useVideoCache } from '@/lib/store';
import { useMarkdownStyles } from '@/hooks/useMarkdownStyles';

interface SummaryTabProps {
  videoId: string;
  summary: string | null;
  onSummaryUpdate: (summary: string) => void;
}

export function SummaryTab({ videoId, summary, onSummaryUpdate }: SummaryTabProps) {
  const { video } = useVideoCache(videoId);
  const transcript = video?.transcript ? segmentsToText(video.transcript.segments) : '';
  const { theme } = useTheme();
  const { getToken } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fullTextRef = useRef('');
  const hasAutoTriggeredRef = useRef(false);
  const markdownStyles = useMarkdownStyles();

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

  // Auto-trigger summarization when transcript is available
  useEffect(() => {
    if (transcript && !summary && !isLoading && !hasAutoTriggeredRef.current) {
      hasAutoTriggeredRef.current = true;
      handleSummarize();
    }
  }, [transcript, summary, isLoading, handleSummarize]);

  const displayText = summary || streamingText;

  if (!displayText && !isLoading) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: theme.colors.grey4 }]}>
          Generate a summary of this video&#39;s content
        </Text>
        <Button
          title="Summarize"
          onPress={handleSummarize}
          size="sm"
        />
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {isLoading && !streamingText && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.grey4 }]}>Generating summary...</Text>
        </View>
      )}
      {displayText && (
        <Markdown style={markdownStyles}>
          {displayText}
        </Markdown>
      )}
      {isLoading && streamingText && (
        <View style={styles.streamingIndicator}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      )}
      {displayText && !isLoading && (
        <Button
          title="Resummarize"
          type="clear"
          onPress={handleSummarize}
          titleStyle={[styles.resummarizeText, { color: theme.colors.grey4 }]}
          containerStyle={styles.resummarizeButton}
        />
      )}
      {error && <Text style={styles.errorText}>{error}</Text>}
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
    textAlign: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  loadingText: {},
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
  },
  resummarizeText: {
    fontSize: 14,
  },
});
