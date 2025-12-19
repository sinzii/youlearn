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
  Modal,
  Image,
} from 'react-native';
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
  const [showProfile, setShowProfile] = useState(false);
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
          {/* Top Bar with Avatar */}
          <ThemedView style={styles.topBar}>
            <TouchableOpacity onPress={() => setShowProfile(true)}>
              <Image
                source={{ uri: user?.imageUrl }}
                style={styles.avatar}
              />
            </TouchableOpacity>
          </ThemedView>

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

      {/* Profile Modal */}
      <Modal
        visible={showProfile}
        transparent
        animationType="fade"
        onRequestClose={() => setShowProfile(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowProfile(false)}
        >
          <Pressable
            style={[
              styles.profileCard,
              { backgroundColor: colorScheme === 'dark' ? '#1e1e1e' : '#fff' },
            ]}
            onPress={() => {}}
          >
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowProfile(false)}
            >
              <ThemedText style={styles.closeButtonText}>×</ThemedText>
            </TouchableOpacity>
            <Image
              source={{ uri: user?.imageUrl }}
              style={styles.profileAvatar}
            />
            <ThemedText style={styles.profileName}>
              {user?.firstName} {user?.lastName}
            </ThemedText>
            <ThemedText style={styles.profileEmail}>
              {user?.emailAddresses[0]?.emailAddress}
            </ThemedText>
            <TouchableOpacity
              style={[styles.signOutButton, { backgroundColor: Colors[colorScheme].tint }]}
              onPress={() => {
                setShowProfile(false);
                handleSignOut();
              }}
            >
              <ThemedText style={styles.signOutButtonText}>Sign Out</ThemedText>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
        </Modal>
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingVertical: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 24,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCard: {
    width: 280,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    lineHeight: 28,
    opacity: 0.6,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    opacity: 0.6,
    marginBottom: 24,
  },
  signOutButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  signOutButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
