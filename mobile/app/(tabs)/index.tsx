import { useClerk, useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { useState, useCallback } from 'react';
import {
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRecentVideos, VideoCache } from '@/lib/store';

export default function HomeScreen() {
  const [videoUrl, setVideoUrl] = useState('');
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const recentVideos = useRecentVideos();
  const { user } = useUser();
  const { signOut } = useClerk();

  const handleSignOut = useCallback(async () => {
    await signOut();
  }, [signOut]);

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

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.content}
        >
          <ThemedView style={styles.header}>
            <ThemedView style={styles.userRow}>
              <ThemedText style={styles.userEmail} numberOfLines={1}>
                {user?.emailAddresses[0]?.emailAddress}
              </ThemedText>
              <TouchableOpacity onPress={handleSignOut}>
                <ThemedText style={[styles.signOutText, { color: Colors[colorScheme].tint }]}>
                  Sign out
                </ThemedText>
              </TouchableOpacity>
            </ThemedView>
            <ThemedText type="title" style={styles.title}>
              YouLearn
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              Learn from YouTube videos with AI
            </ThemedText>
          </ThemedView>

          <ThemedView style={styles.form}>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colorScheme === 'dark' ? '#1e1e1e' : '#f5f5f5',
                  color: Colors[colorScheme].text,
                  borderColor: colorScheme === 'dark' ? '#333' : '#ddd',
                },
              ]}
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
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  userEmail: {
    fontSize: 13,
    opacity: 0.6,
    maxWidth: 200,
  },
  signOutText: {
    fontSize: 13,
    fontWeight: '500',
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
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
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
