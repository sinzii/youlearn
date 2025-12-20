import { useAuth } from '@clerk/clerk-expo';
import { useState, useEffect, useMemo, useCallback, useRef, useLayoutEffect } from 'react';
import {
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
  TouchableOpacity,
  Pressable,
  View,
  Image,
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
import { formatDuration } from '@/lib/datetime';

type TabType = 'summary' | 'ask' | 'transcript';

const TAB_CONFIG: { key: TabType; label: string; icon: 'article' | 'question-answer' | 'subtitles' }[] = [
  { key: 'summary', label: 'Summary', icon: 'article' },
  { key: 'ask', label: 'Ask', icon: 'question-answer' },
  { key: 'transcript', label: 'Transcript', icon: 'subtitles' },
];

export default function VideoDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const colorScheme = useColorScheme() ?? 'light';
  const { getToken } = useAuth();
  const navigation = useNavigation();

  const { video: cachedVideo, updateVideo } = useVideoCache(id || '');
  const hasFetchedRef = useRef(false);
  const shouldAutoplay = useRef(false);

  const [transcript, setTranscript] = useState<TranscriptResponse | null>(
    cachedVideo?.transcript || null
  );
  const [summary, setSummary] = useState<string | null>(cachedVideo?.summary || null);
  const [isLoading, setIsLoading] = useState(!cachedVideo?.transcript);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [showVideo, setShowVideo] = useState(false);
  const [playing, setPlaying] = useState(false);

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
          onPress={() => {
            setPlaying(false);
            setShowVideo((prev) => !prev);
          }}
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

  const handlePlayPress = () => {
    shouldAutoplay.current = true;
    setShowVideo(true);
  };

  const handlePlayerReady = () => {
    if (shouldAutoplay.current) {
      setPlaying(true);
      shouldAutoplay.current = false;
    }
  };

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
      case 'ask':
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
              play={playing}
              onReady={handlePlayerReady}
              webViewStyle={styles.player}
            />
          </View>
        </Animated.View>
      )}

      {/* Video Title */}
      <ThemedView style={styles.titleContainer}>
        {!showVideo && cachedVideo?.thumbnail_url && (
          <Pressable onPress={handlePlayPress} style={styles.thumbnailContainer}>
            <Image
              source={{ uri: cachedVideo.thumbnail_url }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
            <View style={styles.playOverlay}>
              <View style={styles.playButton}>
                <MaterialIcons name="play-arrow" size={20} color="#fff" />
              </View>
            </View>
          </Pressable>
        )}
        <View style={styles.titleInfo}>
          <ThemedText type="subtitle" style={styles.title} numberOfLines={2}>
            {cachedVideo?.title || 'Untitled Video'}
          </ThemedText>
          <View style={styles.metaRow}>
            {cachedVideo?.author && (
              <ThemedText style={styles.author} numberOfLines={1}>
                {cachedVideo.author}
              </ThemedText>
            )}
            {cachedVideo?.author && cachedVideo?.length > 0 && (
              <ThemedText style={styles.metaSeparator}>•</ThemedText>
            )}
            {cachedVideo?.length > 0 && (
              <ThemedText style={styles.duration}>
                {formatDuration(cachedVideo.length)}
              </ThemedText>
            )}
          </View>
        </View>
      </ThemedView>

      {/* Tab Bar */}
      <ThemedView
        style={[styles.tabBar, { borderBottomColor: Colors[colorScheme].icon + '30' }]}
      >
        {TAB_CONFIG.map(({ key, label, icon }) => (
          <TouchableOpacity
            key={key}
            style={styles.tabButton}
            onPress={() => setActiveTab(key)}
          >
            <View style={styles.tabButtonContent}>
              <MaterialIcons
                name={icon}
                size={18}
                color={activeTab === key ? Colors[colorScheme].tint : Colors[colorScheme].icon}
              />
              <ThemedText
                style={[
                  styles.tabText,
                  activeTab === key && {
                    color: Colors[colorScheme].tint,
                    fontWeight: '600',
                  },
                ]}
              >
                {label}
              </ThemedText>
            </View>
            {activeTab === key && (
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
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  thumbnailContainer: {
    position: 'relative',
  },
  thumbnail: {
    width: 120,
    height: 68,
    borderRadius: 8,
    backgroundColor: '#333',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF0000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  author: {
    fontSize: 13,
    opacity: 0.7,
    flexShrink: 1,
  },
  metaSeparator: {
    fontSize: 13,
    opacity: 0.5,
  },
  duration: {
    fontSize: 13,
    opacity: 0.5,
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
  tabButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
