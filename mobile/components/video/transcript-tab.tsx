import { useCallback } from 'react';
import { FlatList, ListRenderItem } from 'react-native';

import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { TranscriptSegment } from '@/lib/api';

interface TranscriptTabProps {
  segments: TranscriptSegment[];
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export function TranscriptTab({ segments }: TranscriptTabProps) {
  const renderItem: ListRenderItem<TranscriptSegment> = useCallback(
    ({ item }) => (
      <HStack className="mb-3 gap-3">
        <Text className="text-xs font-mono text-typography-400 min-w-[45px]">
          {formatTime(item.start)}
        </Text>
        <Text className="flex-1 text-sm leading-5">{item.text}</Text>
      </HStack>
    ),
    []
  );

  const keyExtractor = useCallback(
    (item: TranscriptSegment, index: number) => `${item.start}-${index}`,
    []
  );

  if (segments.length === 0) {
    return (
      <VStack className="flex-1 justify-center items-center p-6">
        <Text className="text-typography-500">No transcript available</Text>
      </VStack>
    );
  }

  return (
    <FlatList
      data={segments}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      className="flex-1"
      contentContainerStyle={{ padding: 16 }}
      initialNumToRender={20}
      maxToRenderPerBatch={20}
      windowSize={10}
    />
  );
}
