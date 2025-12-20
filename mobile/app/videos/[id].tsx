import { useAuth } from '@clerk/clerk-expo';
import { useState, useEffect, useMemo, useCallback, useRef, useLayoutEffect } from 'react';
import {
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
  TouchableOpacity,
  View
} from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import YoutubePlayer from 'react-native-youtube-iframe';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Animated, {
  useAnimatedKeyboard,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SummaryTab } from '@/components/video/summary-tab';
import { ChatTab } from '@/components/video/chat-tab';
import { TranscriptTab } from '@/components/video/transcript-tab';
import { fetchVideoInfo, fetchTranscript, TranscriptResponse } from '@/lib/api';
import { useVideoCache } from '@/lib/store';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { mergeSegmentsIntoSentences } from '@/utils/transcript';

type TabType = 'summary' | 'chat' | 'transcript';

export default function VideoDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const colorScheme = useColorScheme() ?? 'light';
  const { getToken } = useAuth();
  const navigation = useNavigation();

  const { video: cachedVideo, updateVideo } = useVideoCache(id || '');
  const hasFetchedRef = useRef(false);

  const [transcript, setTranscript] = useState<TranscriptResponse | null>(
    cachedVideo?.transcript || null
  );
  const [summary, setSummary] = useState<string | null>(cachedVideo?.summary || null);
  const [isLoading, setIsLoading] = useState(!cachedVideo?.transcript);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [showVideo, setShowVideo] = useState(true);

  const playerHeight = (width - 32) * (9 / 16);
  const keyboard = useAnimatedKeyboard();
  const playerAnimatedStyle = useAnimatedStyle(() => {
    const targetHeight = interpolate(
      keyboard.height.value,
      [0, 300],
      [playerHeight + 16, 0], // +16 accounts for paddingTop
      Extrapolation.CLAMP
    );
    return {
      height: withTiming(targetHeight, { duration: 250 }),
    };
  });

  // Configure header with title and toggle button
  const headerTitle = cachedVideo?.title || 'Video Details';

  useLayoutEffect(() => {
    navigation.setOptions({
      title: headerTitle,
      headerRight: () => (
        <TouchableOpacity
          onPress={() => setShowVideo((prev) => !prev)}
          style={styles.headerButton}
        >
          <MaterialIcons
            name={showVideo ? 'visibility' : 'visibility-off'}
            size={24}
            color={Colors[colorScheme].text}
          />
        </TouchableOpacity>
      ),
    });
  }, [navigation, showVideo, colorScheme, headerTitle]);

  useEffect(() => {
    if (!id) return;

    // If we already have transcript in state, don't fetch again
    if (transcript) return;

    // If cached, use it
    if (cachedVideo?.transcript) {
      setTranscript(cachedVideo.transcript);
      setSummary(cachedVideo.summary || null);
      setIsLoading(false);
      return;
    }

    // Prevent duplicate fetches
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    setIsLoading(true);
    setError(null);

    const loadVideoData = async () => {
      try {
        const token = await getToken();
        if (!token) {
          setError('Not authenticated');
          return;
        }

        // Fetch video info and transcript in parallel
        const [videoInfo, transcriptData] = await Promise.all([
          fetchVideoInfo(id, token),
          fetchTranscript(id, token),
        ]);

        setTranscript(transcriptData);
        updateVideo({
          video_id: id,
          title: videoInfo.title,
          author: videoInfo.author,
          thumbnail_url: videoInfo.thumbnail_url,
          length: videoInfo.length,
          transcript: transcriptData,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load video');
      } finally {
        setIsLoading(false);
      }
    };

    loadVideoData();
  }, [id]);

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
      {/* YouTube Player - animates to half height when keyboard shows */}
      {showVideo && (
        <Animated.View style={[styles.playerContainer, playerAnimatedStyle]}>
          <View style={{ paddingTop: 16}}>
            <YoutubePlayer
              height={playerHeight}
              videoId={id}
              webViewStyle={styles.player}
            />
          </View>
        </Animated.View>
      )}

      {/* Video Title */}
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="subtitle" style={styles.title} numberOfLines={2}>
          {cachedVideo?.title || 'Untitled Video'}
        </ThemedText>
        {transcript?.language && (
          <ThemedText style={styles.language}>
            Language: {transcript.language}
          </ThemedText>
        )}
      </ThemedView>

      {/* Tab Bar */}
      <ThemedView
        style={[styles.tabBar, { borderBottomColor: Colors[colorScheme].icon + '30' }]}
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

      {/* Tab Content */}
      <ThemedView style={styles.tabContent}>{renderTabContent()}</ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
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
    overflow: 'hidden',
  },
  player: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  titleContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
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
    borderBottomWidth: 1,
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
