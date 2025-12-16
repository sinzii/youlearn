import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import YoutubePlayer from 'react-native-youtube-iframe';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SummaryTab } from '@/components/video/summary-tab';
import { ChatTab } from '@/components/video/chat-tab';
import { TranscriptTab } from '@/components/video/transcript-tab';
import { fetchTranscript, TranscriptResponse } from '@/lib/api';
import { useVideoCache } from '@/lib/store';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { mergeSegmentsIntoSentences } from '@/utils/transcript';

type TabType = 'summary' | 'chat' | 'transcript';

export default function VideoDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const colorScheme = useColorScheme() ?? 'light';

  const { video: cachedVideo, updateVideo } = useVideoCache(id || '');

  const [transcript, setTranscript] = useState<TranscriptResponse | null>(
    cachedVideo?.transcript || null
  );
  const [summary, setSummary] = useState<string | null>(cachedVideo?.summary || null);
  const [isLoading, setIsLoading] = useState(!cachedVideo?.transcript);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('summary');

  useEffect(() => {
    if (!id) return;

    if (cachedVideo?.transcript) {
      setTranscript(cachedVideo.transcript);
      setSummary(cachedVideo.summary || null);
      setIsLoading(false);
      updateVideo({});
      return;
    }

    setIsLoading(true);
    setError(null);

    fetchTranscript(id)
      .then((data) => {
        setTranscript(data);
        updateVideo({
          video_id: id,
          title: data.title,
          transcript: data,
        });
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load transcript');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [id, cachedVideo?.transcript, cachedVideo?.summary, updateVideo]);

  const handleSummaryUpdate = useCallback(
    (newSummary: string) => {
      setSummary(newSummary);
      updateVideo({ summary: newSummary });
    },
    [updateVideo]
  );

  const mergedSegments = useMemo(() => {
    if (!transcript?.segments) return [];
    if (transcript.is_generated) {
      return transcript.segments;
    }
    return mergeSegmentsIntoSentences(transcript.segments);
  }, [transcript?.segments, transcript?.is_generated]);

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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'summary':
        return (
          <SummaryTab
            videoId={id || ''}
            summary={summary}
            onSummaryUpdate={handleSummaryUpdate}
          />
        );
      case 'chat':
        return <ChatTab videoId={id || ''} />;
      case 'transcript':
        return <TranscriptTab segments={mergedSegments} />;
    }
  };

  return (
    <ThemedView style={styles.container}>
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
        <ThemedText type="subtitle" style={styles.title} numberOfLines={2}>
          {transcript?.title || cachedVideo?.title || 'Untitled Video'}
        </ThemedText>
        {transcript?.language && (
          <ThemedText style={styles.language}>
            Language: {transcript.language}
          </ThemedText>
        )}
      </ThemedView>

      {/* Tab Content */}
      <ThemedView style={styles.tabContent}>{renderTabContent()}</ThemedView>

      {/* Bottom Tab Bar */}
      <ThemedView
        style={[styles.tabBar, { borderTopColor: Colors[colorScheme].icon + '30' }]}
      >
        {(['summary', 'chat', 'transcript'] as TabType[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={styles.tabButton}
            onPress={() => setActiveTab(tab)}
          >
            <ThemedText
              style={[
                styles.tabText,
                activeTab === tab && {
                  color: Colors[colorScheme].tint,
                  fontWeight: '600',
                },
              ]}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </ThemedText>
            {activeTab === tab && (
              <ThemedView
                style={[
                  styles.tabIndicator,
                  { backgroundColor: Colors[colorScheme].tint },
                ]}
              />
            )}
          </TouchableOpacity>
        ))}
      </ThemedView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 16,
    lineHeight: 22,
  },
  language: {
    marginTop: 4,
    fontSize: 12,
    opacity: 0.6,
  },
  tabContent: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingBottom: 20,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  tabText: {
    fontSize: 14,
    opacity: 0.7,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 2,
    width: '60%',
    borderRadius: 1,
  },
});
