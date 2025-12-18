import { useAuth } from '@clerk/clerk-expo';
import { useState, useEffect, useMemo, useCallback, useRef, useLayoutEffect } from 'react';
import { useWindowDimensions, Pressable as RNPressable } from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import YoutubePlayer from 'react-native-youtube-iframe';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
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

  // Configure header with title and toggle button
  const headerTitle = transcript?.title || cachedVideo?.title || 'Video Details';

  useLayoutEffect(() => {
    navigation.setOptions({
      title: headerTitle,
      headerRight: () => (
        <RNPressable
          onPress={() => setShowVideo((prev) => !prev)}
          className="px-3 py-1.5"
        >
          <MaterialIcons
            name={showVideo ? 'visibility' : 'visibility-off'}
            size={24}
            color={Colors[colorScheme].text}
          />
        </RNPressable>
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

    const loadTranscript = async () => {
      try {
        const token = await getToken();
        if (!token) {
          setError('Not authenticated');
          return;
        }
        const data = await fetchTranscript(id, token);
        setTranscript(data);
        updateVideo({
          video_id: id,
          title: data.title,
          transcript: data,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load transcript');
      } finally {
        setIsLoading(false);
      }
    };

    loadTranscript();
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

  const playerHeight = (width - 32) * (9 / 16);

  if (isLoading) {
    return (
      <Box className="flex-1 justify-center items-center p-6 bg-background-0">
        <Spinner size="large" className="text-primary-500" />
        <Text className="mt-3 text-typography-500">Loading video...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box className="flex-1 justify-center items-center p-6 bg-background-0">
        <Text className="text-error-500 text-center">{error}</Text>
      </Box>
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
    <Box className="flex-1 bg-background-0">
      {/* YouTube Player - only show when showVideo is true */}
      {showVideo && (
        <Box className="px-4 pt-4">
          <YoutubePlayer
            height={playerHeight}
            videoId={id}
            webViewStyle={{ borderRadius: 12, overflow: 'hidden' }}
          />
        </Box>
      )}

      {/* Video Title */}
      <VStack className="px-4 py-3">
        <Text className="text-base font-semibold leading-snug" numberOfLines={2}>
          {transcript?.title || cachedVideo?.title || 'Untitled Video'}
        </Text>
        {transcript?.language && (
          <Text className="mt-1 text-xs text-typography-500">
            Language: {transcript.language}
          </Text>
        )}
      </VStack>

      {/* Tab Content */}
      <Box className="flex-1">{renderTabContent()}</Box>

      {/* Bottom Tab Bar */}
      <HStack className="border-t border-outline-200 pb-5">
        {(['summary', 'chat', 'transcript'] as TabType[]).map((tab) => (
          <Pressable
            key={tab}
            className="flex-1 items-center py-3"
            onPress={() => setActiveTab(tab)}
          >
            <Text
              className={`text-sm ${
                activeTab === tab
                  ? 'text-primary-500 font-semibold'
                  : 'text-typography-500'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
            {activeTab === tab && (
              <Box className="absolute bottom-0 h-0.5 w-[60%] bg-primary-500 rounded-sm" />
            )}
          </Pressable>
        ))}
      </HStack>
    </Box>
  );
}
