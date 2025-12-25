import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { useMarkdownStyles } from '@/hooks/useMarkdownStyles';
import { extractTimestampRefs } from '@/utils/transcript';
import { TimestampLink } from './timestamp-link';

interface MarkdownWithTimestampsProps {
  content: string;
  onSeekTo: (seconds: number) => void;
  variant?: 'default' | 'compact';
}

interface TextSegment {
  type: 'text' | 'timestamp';
  content: string;
  start?: number;
  end?: number | null;
}

/**
 * Parse content into segments of text and timestamp references.
 */
function parseContentWithTimestamps(content: string): TextSegment[] {
  const timestampRefs = extractTimestampRefs(content);

  if (timestampRefs.length === 0) {
    return [{ type: 'text', content }];
  }

  const segments: TextSegment[] = [];
  let lastIndex = 0;

  for (const ref of timestampRefs) {
    // Add text before this timestamp
    if (ref.index > lastIndex) {
      segments.push({
        type: 'text',
        content: content.slice(lastIndex, ref.index),
      });
    }

    // Add the timestamp
    segments.push({
      type: 'timestamp',
      content: ref.original,
      start: ref.start,
      end: ref.end,
    });

    lastIndex = ref.index + ref.original.length;
  }

  // Add remaining text after last timestamp
  if (lastIndex < content.length) {
    segments.push({
      type: 'text',
      content: content.slice(lastIndex),
    });
  }

  return segments;
}

export function MarkdownWithTimestamps({
  content,
  onSeekTo,
  variant = 'compact',
}: MarkdownWithTimestampsProps) {
  const markdownStyles = useMarkdownStyles(variant);
  const segments = useMemo(() => parseContentWithTimestamps(content), [content]);

  // If no timestamps, render as plain markdown
  const hasTimestamps = segments.some((s) => s.type === 'timestamp');
  if (!hasTimestamps) {
    return <Markdown style={markdownStyles}>{content}</Markdown>;
  }

  // Render with mixed content - this is a simplified approach
  // For more complex cases, we might need to handle markdown parsing differently
  return (
    <View style={styles.container}>
      {segments.map((segment, index) => {
        if (segment.type === 'timestamp') {
          return (
            <TimestampLink
              key={`ts-${index}`}
              start={segment.start!}
              end={segment.end ?? null}
              onPress={onSeekTo}
            />
          );
        }

        // For text segments, render as markdown
        // Trim trailing/leading whitespace for cleaner display
        const text = segment.content;
        if (!text.trim()) {
          return <Text key={`space-${index}`}> </Text>;
        }

        return (
          <Markdown key={`md-${index}`} style={markdownStyles}>
            {text}
          </Markdown>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
});
