import { useRouter } from 'expo-router';
import { StyleSheet, FlatList, Pressable, View, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRecentVideos, VideoCache } from '@/lib/store';

export default function HistoryScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const recentVideos = useRecentVideos();

  const handleVideoPress = (video: VideoCache) => {
    router.push({ pathname: '/videos/[id]', params: { id: video.video_id } });
  };

  const backgroundColor = colorScheme === 'dark' ? '#151718' : '#fff';

  const renderVideoItem = ({ item }: { item: VideoCache }) => (
    <Pressable
      style={({ pressed }) => [
        styles.videoItem,
        {
          backgroundColor: colorScheme === 'dark' ? '#1e1e1e' : '#f5f5f5',
          opacity: pressed ? 0.7 : 1,
        },
      ]}
      onPress={() => handleVideoPress(item)}
    >
      <View style={styles.videoItemContent}>
        {item.thumbnail_url ? (
          <Image
            source={{ uri: item.thumbnail_url }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.thumbnail, styles.thumbnailPlaceholder]} />
        )}
        <View style={styles.videoInfo}>
          <ThemedText style={styles.videoTitle} numberOfLines={2}>
            {item.title || item.video_id}
          </ThemedText>
          {item.author && (
            <ThemedText style={styles.videoAuthor} numberOfLines={1}>
              {item.author}
            </ThemedText>
          )}
          <View style={styles.videoMetaRow}>
            {item.length_seconds > 0 && (
              <ThemedText style={styles.videoDuration}>
                {formatDuration(item.length_seconds)}
              </ThemedText>
            )}
            <ThemedText style={styles.videoMeta}>
              {formatRelativeTime(item.lastAccessed)}
            </ThemedText>
          </View>
        </View>
      </View>
    </Pressable>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <ThemedText style={styles.emptyText}>No videos yet</ThemedText>
      <ThemedText style={styles.emptySubtext}>
        Add a video to start learning
      </ThemedText>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]} edges={['top']}>
      <ThemedView style={styles.container}>
        <ThemedView style={styles.header}>
          <ThemedText type="title">History</ThemedText>
        </ThemedView>

        <FlatList
          data={recentVideos}
          renderItem={renderVideoItem}
          keyExtractor={(item) => item.video_id}
          contentContainerStyle={[
            styles.listContent,
            recentVideos.length === 0 && styles.emptyListContent,
          ]}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />
      </ThemedView>
    </SafeAreaView>
  );
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

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  emptyListContent: {
    flex: 1,
    justifyContent: 'center',
  },
  videoItem: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  videoItemContent: {
    flexDirection: 'row',
  },
  thumbnail: {
    width: 120,
    height: 68,
    borderRadius: 8,
    backgroundColor: '#333',
  },
  thumbnailPlaceholder: {
    backgroundColor: '#444',
  },
  videoInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  videoTitle: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
  },
  videoAuthor: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 2,
  },
  videoMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  videoDuration: {
    fontSize: 12,
    opacity: 0.5,
  },
  videoMeta: {
    fontSize: 12,
    opacity: 0.5,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.6,
  },
});
