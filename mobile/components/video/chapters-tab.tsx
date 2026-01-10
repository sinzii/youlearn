import { useCallback } from 'react';
import { StyleSheet, FlatList, ListRenderItem, View, TouchableOpacity } from 'react-native';
import { Text, useTheme, Skeleton } from '@rneui/themed';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';

import { Chapter } from '@/lib/api';

interface ChaptersTabProps {
  chapters: Chapter[];
  videoLength: number;
  loading: boolean;
  selectedIndex: number | null;
  onChapterPress: (startTime: number, index: number) => void;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins === 0) {
    return `${secs}s`;
  }
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
};

interface ChapterWithDuration extends Chapter {
  duration: number;
  index: number;
}

export function ChaptersTab({ chapters, videoLength, loading, selectedIndex, onChapterPress }: ChaptersTabProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  // Calculate duration for each chapter
  const chaptersWithDuration: ChapterWithDuration[] = chapters.map((chapter, index) => {
    const nextChapter = chapters[index + 1];
    const endTime = nextChapter ? nextChapter.start : videoLength;
    const duration = endTime - chapter.start;
    return { ...chapter, duration, index };
  });

  const renderItem: ListRenderItem<ChapterWithDuration> = useCallback(
    ({ item }) => {
      const isSelected = item.index === selectedIndex;
      return (
        <TouchableOpacity
          style={[
            styles.chapterCard,
            { backgroundColor: theme.colors.grey0 },
            isSelected && { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary, borderWidth: 1 },
          ]}
          onPress={() => onChapterPress(item.start, item.index)}
          activeOpacity={0.7}
        >
          <View style={styles.chapterHeader}>
            <Text style={[styles.title, { color: theme.colors.black }]} numberOfLines={2}>
              {item.title}
            </Text>
            <MaterialIcons
              name={isSelected ? 'play-circle-filled' : 'play-circle-outline'}
              size={24}
              color={isSelected ? theme.colors.primary : theme.colors.grey4}
            />
          </View>
          <View style={styles.timeRow}>
            <Text style={[styles.timestamp, { color: theme.colors.primary }]}>
              {formatTime(item.start)}
            </Text>
            <Text style={[styles.duration, { color: theme.colors.grey4 }]}>
              {formatDuration(item.duration)}
            </Text>
          </View>
        </TouchableOpacity>
      );
    },
    [theme, selectedIndex, onChapterPress]
  );

  const keyExtractor = useCallback(
    (item: ChapterWithDuration) => `${item.start}-${item.index}`,
    []
  );

  const skeletonProps = {
    animation: 'wave' as const,
    LinearGradientComponent: LinearGradient,
    skeletonStyle: { backgroundColor: theme.colors.grey2 },
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          {[1, 2, 3, 4].map((i) => (
            <View
              key={i}
              style={[styles.chapterCard, { backgroundColor: theme.colors.grey0 }]}
            >
              <Skeleton width="80%" height={18} {...skeletonProps} />
              <View style={styles.timeRow}>
                <Skeleton width={50} height={14} {...skeletonProps} />
                <Skeleton width={40} height={14} {...skeletonProps} />
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (chapters.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: theme.colors.grey4 }]}>
          {t('chapters.empty')}
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={chaptersWithDuration}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      style={styles.container}
      contentContainerStyle={styles.content}
      initialNumToRender={10}
      maxToRenderPerBatch={10}
      windowSize={5}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {},
  chapterCard: {
    padding: 16,
    borderRadius: 12,
  },
  chapterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  timestamp: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  duration: {
    fontSize: 13,
  },
});
