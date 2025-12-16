import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import YoutubePlayer from 'react-native-youtube-iframe';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { fetchTranscript, TranscriptResponse } from '@/lib/api';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function VideoDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const colorScheme = useColorScheme() ?? 'light';

  const [transcript, setTranscript] = useState<TranscriptResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    setIsLoading(true);
    setError(null);

    fetchTranscript(id)
      .then((data) => {
        setTranscript(data);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load transcript');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [id]);

  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Calculate player height maintaining 16:9 aspect ratio
  const playerHeight = (width - 32) * (9 / 16);

  if (isLoading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color={Colors[colorScheme].tint} />
        <ThemedText style={styles.loadingText}>Loading video...</ThemedText>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText style={styles.errorText}>{error}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView>
        {/* YouTube Player */}
        <ThemedView style={styles.playerContainer}>
          <YoutubePlayer
            height={playerHeight}
            videoId={id}
            webViewStyle={styles.player}
          />
        </ThemedView>

        {/* Video Title */}
        <ThemedView style={styles.titleContainer}>
          <ThemedText type="subtitle" style={styles.title}>
            {transcript?.title || 'Untitled Video'}
          </ThemedText>
          {transcript?.language && (
            <ThemedText style={styles.language}>
              Language: {transcript.language}
              {transcript.is_generated && ' (auto-generated)'}
            </ThemedText>
          )}
        </ThemedView>

        {/* Transcript */}
        <ThemedView style={styles.transcriptContainer}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Transcript
          </ThemedText>
          {transcript?.segments.map((segment, index) => (
            <ThemedView key={index} style={styles.segment}>
              <ThemedText style={styles.timestamp}>
                {formatTime(segment.start)}
              </ThemedText>
              <ThemedText style={styles.segmentText}>{segment.text}</ThemedText>
            </ThemedView>
          ))}
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    opacity: 0.7,
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
  },
  playerContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  player: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  titleContainer: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
  },
  language: {
    marginTop: 4,
    fontSize: 12,
    opacity: 0.6,
  },
  transcriptContainer: {
    padding: 16,
    paddingTop: 0,
  },
  sectionTitle: {
    marginBottom: 12,
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.7,
  },
  segment: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 12,
  },
  timestamp: {
    fontSize: 12,
    fontFamily: 'monospace',
    opacity: 0.5,
    minWidth: 45,
  },
  segmentText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});
