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
import { Text, useTheme } from '@rneui/themed';

import { SummaryTab } from '@/components/video/summary-tab';
import { ChatTab } from '@/components/video/chat-tab';
import { TranscriptTab } from '@/components/video/transcript-tab';
import { fetchVideoInfo, fetchTranscript, TranscriptResponse } from '@/lib/api';
import { useVideoCache } from '@/lib/store';
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
  const { theme } = useTheme();
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
            color={theme.colors.black}
          />
        </TouchableOpacity>
      ),
    });
  }, [navigation, showVideo, theme, headerTitle]);

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
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.grey4 }]}>Loading video...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
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
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
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
      <View style={styles.titleContainer}>
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
          <Text style={[styles.title, { color: theme.colors.black }]} numberOfLines={2}>
            {cachedVideo?.title || 'Untitled Video'}
          </Text>
          <View style={styles.metaRow}>
            {cachedVideo?.author && (
              <Text style={[styles.author, { color: theme.colors.grey4 }]} numberOfLines={1}>
                {cachedVideo.author}
              </Text>
            )}
            {cachedVideo?.author && cachedVideo?.length > 0 && (
              <Text style={[styles.metaSeparator, { color: theme.colors.grey4 }]}>•</Text>
            )}
            {cachedVideo?.length > 0 && (
              <Text style={[styles.duration, { color: theme.colors.grey4 }]}>
                {formatDuration(cachedVideo.length)}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Tab Bar */}
      <View
        style={[styles.tabBar, { borderBottomColor: theme.colors.greyOutline }]}
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
                color={activeTab === key ? theme.colors.primary : theme.colors.grey4}
              />
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === key ? theme.colors.primary : theme.colors.grey4 },
                  activeTab === key && { fontWeight: '600' },
                ]}
              >
                {label}
              </Text>
            </View>
            {activeTab === key && (
              <View
                style={[
                  styles.tabIndicator,
                  { backgroundColor: theme.colors.primary },
                ]}
              />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      <View style={styles.tabContent}>{renderTabContent()}</View>
    </View>
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
    width: 120,
    height: 68,
    borderRadius: 8,
    overflow: 'hidden',
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
    fontWeight: 'bold',
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
    flexShrink: 1,
  },
  metaSeparator: {
    fontSize: 13,
  },
  duration: {
    fontSize: 13,
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
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 2,
    width: '60%',
    borderRadius: 1,
  },
});
