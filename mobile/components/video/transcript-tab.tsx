import { useCallback } from 'react';
import { StyleSheet, ScrollView } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TranscriptSegment } from '@/lib/api';

interface TranscriptTabProps {
  segments: TranscriptSegment[];
}

export function TranscriptTab({ segments }: TranscriptTabProps) {
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  if (segments.length === 0) {
    return (
      <ThemedView style={styles.emptyContainer}>
        <ThemedText style={styles.emptyText}>No transcript available</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {segments.map((segment, index) => (
        <ThemedView key={index} style={styles.segment}>
          <ThemedText style={styles.timestamp}>{formatTime(segment.start)}</ThemedText>
          <ThemedText style={styles.segmentText}>{segment.text}</ThemedText>
        </ThemedView>
      ))}
    </ScrollView>
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
  emptyText: {
    opacity: 0.6,
  },
  segment: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 12,
  },
  timestamp: {
    fontSize: 12,
    fontFamily: 'monospace',
    opacity: 0.5,
    minWidth: 45,
  },
  segmentText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});
