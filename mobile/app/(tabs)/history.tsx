import { useRouter } from 'expo-router';
import { StyleSheet, FlatList, View, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, ListItem, useTheme } from '@rneui/themed';

import { useRecentVideos, VideoCache } from '@/lib/store';
import { formatDuration } from '@/lib/datetime';

export default function HistoryScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const recentVideos = useRecentVideos();

  const handleVideoPress = (video: VideoCache) => {
    router.push({ pathname: '/videos/[id]', params: { id: video.video_id } });
  };

  const renderVideoItem = ({ item }: { item: VideoCache }) => (
    <ListItem
      onPress={() => handleVideoPress(item)}
      containerStyle={[
        styles.videoItem,
        { backgroundColor: theme.colors.grey0 },
      ]}
    >
      {item.thumbnail_url ? (
        <Image
          key="thumbnail"
          source={{ uri: item.thumbnail_url }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
      ) : (
        <View key="thumbnail" style={[styles.thumbnail, styles.thumbnailPlaceholder]} />
      )}
      <ListItem.Content key="content">
        <ListItem.Title
          numberOfLines={2}
          style={[styles.videoTitle, { color: theme.colors.black }]}
        >
          {item.title || item.video_id}
        </ListItem.Title>
        <ListItem.Subtitle style={[styles.videoMeta, { color: theme.colors.grey4 }]}>
          {item.author}
          {item.author && item.length > 0 && ' • '}
          {item.length > 0 && formatDuration(item.length)}
        </ListItem.Subtitle>
      </ListItem.Content>
    </ListItem>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={[styles.emptyText, { color: theme.colors.black }]}>No videos yet</Text>
      <Text style={[styles.emptySubtext, { color: theme.colors.grey4 }]}>
        Add a video to start learning
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.black }]}>History</Text>
        </View>

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
      </View>
    </SafeAreaView>
  );
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    lineHeight: 36,
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
  thumbnail: {
    width: 120,
    height: 68,
    borderRadius: 8,
    backgroundColor: '#333',
  },
  thumbnailPlaceholder: {
    backgroundColor: '#444',
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  videoMeta: {
    marginTop: 4,
    fontSize: 13,
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
  },
});
