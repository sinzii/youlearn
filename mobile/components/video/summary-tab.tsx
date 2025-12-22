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
import { useSetAtom } from 'jotai';

import { segmentsToText } from '@/utils/transcript';
import { useVideoCache, useVideoStreaming, videosAtom, streamingStateAtom } from '@/lib/store';
import { useMarkdownStyles } from '@/hooks/useMarkdownStyles';
import { startSummaryStream } from '@/lib/streaming';

interface SummaryTabProps {
  videoId: string;
}

export function SummaryTab({ videoId }: SummaryTabProps) {
  const { video } = useVideoCache(videoId);
  const { streaming } = useVideoStreaming(videoId);
  const setStreamingState = useSetAtom(streamingStateAtom);
  const setVideos = useSetAtom(videosAtom);
  const transcript = video?.transcript ? segmentsToText(video.transcript.segments) : '';
  const { theme } = useTheme();
  const { getToken } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const hasAutoTriggeredRef = useRef(false);
  const markdownStyles = useMarkdownStyles();

  const isLoading = streaming.isLoadingSummary;
  const streamingText = streaming.streamingSummary;

  const handleSummarize = useCallback(async () => {
    setError(null);

    const token = await getToken();
    if (!token) {
      setError('Not authenticated');
      return;
    }

    startSummaryStream(videoId, transcript, token, setStreamingState, setVideos);
  }, [videoId, getToken, transcript, setStreamingState, setVideos]);

  const summary = video?.summary || null;

  // Auto-trigger summarization when transcript is available
  useEffect(() => {
    if (transcript && !summary && !isLoading && !streamingText && !hasAutoTriggeredRef.current) {
      hasAutoTriggeredRef.current = true;
      handleSummarize();
    }
  }, [transcript, summary, isLoading, streamingText, handleSummarize]);

  const displayText = isLoading ? streamingText : summary;

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
