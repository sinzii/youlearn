import { useCallback } from 'react';
import { StyleSheet, FlatList, ListRenderItem, View, Pressable } from 'react-native';
import { Text, useTheme } from '@rneui/themed';

import { TranscriptSegment } from '@/lib/api';

interface TranscriptTabProps {
  segments: TranscriptSegment[];
  onSeekTo?: (seconds: number) => void;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export function TranscriptTab({ segments, onSeekTo }: TranscriptTabProps) {
  const { theme } = useTheme();

  const renderItem: ListRenderItem<TranscriptSegment> = useCallback(
    ({ item }) => (
      <View style={styles.segment}>
        <Pressable
          onPress={() => onSeekTo?.(item.start)}
          style={({ pressed }) => [
            styles.timestampButton,
            pressed && { backgroundColor: theme.colors.primary + '20' },
          ]}
        >
          <Text style={[styles.timestamp, { color: theme.colors.primary }]}>
            {formatTime(item.start)}
          </Text>
        </Pressable>
        <Text style={[styles.segmentText, { color: theme.colors.black }]}>{item.text}</Text>
      </View>
    ),
    [theme, onSeekTo]
  );

  const keyExtractor = useCallback(
    (item: TranscriptSegment, index: number) => `${item.start}-${index}`,
    []
  );

  if (segments.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: theme.colors.grey4 }]}>No transcript available</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={segments}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      style={styles.container}
      contentContainerStyle={styles.content}
      initialNumToRender={20}
      maxToRenderPerBatch={20}
      windowSize={10}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {},
  segment: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 12,
  },
  timestampButton: {
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 4,
    marginLeft: -4,
  },
  timestamp: {
    fontSize: 12,
    fontFamily: 'monospace',
    minWidth: 45,
    fontWeight: '500',
  },
  segmentText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});
