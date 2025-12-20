import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRecentVideos, VideoCache } from '@/lib/store';

const EXAMPLE_VIDEOS = [
  { id: 'XA9Q5p9ODac', title: 'Quantum Consciousness and the Origin of Life' },
  { id: 'BHEhxPuMmQI', title: 'Physicist Brian Cox explains quantum physics in 22 minutes' },
  { id: 'kO41iURud9c', title: 'Brian Cox: The quantum roots of reality' },
];

export default function HomeScreen() {
  const [videoUrl, setVideoUrl] = useState('');
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const recentVideos = useRecentVideos();

  const handleStartLearning = () => {
    const trimmedUrl = videoUrl.trim();
    if (!trimmedUrl) return;

    const videoId = extractVideoId(trimmedUrl);
    if (videoId) {
      setVideoUrl('');
      router.push({ pathname: '/videos/[id]', params: { id: videoId } });
    }
  };

  const handleVideoPress = (video: VideoCache) => {
    router.push({ pathname: '/videos/[id]', params: { id: video.video_id } });
  };

  const handlePaste = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) {
      setVideoUrl(text);
    }
  };

  const backgroundColor = colorScheme === 'dark' ? '#151718' : '#fff';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]} edges={['top']}>
      <ThemedView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.content}
          >
          {/* Title Section */}
          <ThemedView style={styles.header}>
            <ThemedText type="title" style={styles.title}>
              VideoInsight
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              Summarize, ask and learn from Youtube videos with AI
            </ThemedText>
          </ThemedView>

          <ThemedView style={styles.form}>
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: colorScheme === 'dark' ? '#1e1e1e' : '#f5f5f5',
                  borderColor: colorScheme === 'dark' ? '#333' : '#ddd',
                },
              ]}
            >
              <TextInput
                style={[styles.input, { color: Colors[colorScheme].text }]}
                placeholder="Paste YouTube URL or video ID..."
                placeholderTextColor={colorScheme === 'dark' ? '#666' : '#999'}
                value={videoUrl}
                onChangeText={setVideoUrl}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="go"
                onSubmitEditing={handleStartLearning}
              />
              <Pressable
                style={({ pressed }) => [
                  styles.pasteButton,
                  { opacity: pressed ? 0.5 : 0.6 },
                ]}
                onPress={handlePaste}
              >
                <MaterialIcons
                  name="content-paste"
                  size={20}
                  color={Colors[colorScheme].text}
                />
              </Pressable>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.button,
                {
                  backgroundColor: Colors[colorScheme].tint,
                  opacity: pressed ? 0.8 : videoUrl.trim() ? 1 : 0.5,
                },
              ]}
              onPress={handleStartLearning}
              disabled={!videoUrl.trim()}
            >
              <ThemedText style={styles.buttonText} lightColor="#fff" darkColor="#000">
                Start Learning
              </ThemedText>
            </Pressable>
          </ThemedView>

          {/* Example Videos - shown when no recent videos */}
          {recentVideos.length === 0 && (
            <ThemedView style={styles.recentSection}>
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                Try an example
              </ThemedText>
              {EXAMPLE_VIDEOS.map((video) => (
                <Pressable
                  key={video.id}
                  style={({ pressed }) => [
                    styles.videoItem,
                    {
                      backgroundColor: colorScheme === 'dark' ? '#1e1e1e' : '#f5f5f5',
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                  onPress={() => router.push({ pathname: '/videos/[id]', params: { id: video.id } })}
                >
                  <ThemedText style={styles.videoTitle} numberOfLines={2}>
                    {video.title}
                  </ThemedText>
                </Pressable>
              ))}
            </ThemedView>
          )}

          {/* Recent Videos */}
          {recentVideos.length > 0 && (
            <ThemedView style={styles.recentSection}>
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                Recent Videos
              </ThemedText>
              {recentVideos.slice(0, 5).map((video) => (
                <Pressable
                  key={video.video_id}
                  style={({ pressed }) => [
                    styles.videoItem,
                    {
                      backgroundColor: colorScheme === 'dark' ? '#1e1e1e' : '#f5f5f5',
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                  onPress={() => handleVideoPress(video)}
                >
                  <ThemedText style={styles.videoTitle} numberOfLines={2}>
                    {video.title || video.video_id}
                  </ThemedText>
                  <ThemedText style={styles.videoMeta}>
                    {formatRelativeTime(video.lastAccessed)}
                  </ThemedText>
                </Pressable>
              ))}
            </ThemedView>
          )}
        </KeyboardAvoidingView>
      </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}

function extractVideoId(input: string): string | null {
  const videoIdPattern = /^[a-zA-Z0-9_-]{11}$/;
  if (videoIdPattern.test(input)) {
    return input;
  }

  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return input;
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 48,
  },
  title: {
    fontSize: 36,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingLeft: 16,
    paddingRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  pasteButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  recentSection: {
    marginTop: 40,
  },
  sectionTitle: {
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.7,
    marginBottom: 12,
  },
  videoItem: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  videoTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  videoMeta: {
    fontSize: 12,
    opacity: 0.5,
  },
});
