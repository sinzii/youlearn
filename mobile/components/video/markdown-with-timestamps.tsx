import { useMemo } from 'react';
import Markdown from 'react-native-markdown-display';
import { useMarkdownStyles } from '@/hooks/useMarkdownStyles';
import { formatSecondsToTime } from '@/utils/transcript';

interface MarkdownWithTimestampsProps {
  content: string;
  onSeekTo: (seconds: number) => void;
  variant?: 'default' | 'compact';
}

/**
 * Pre-process content to convert [seconds] timestamps to formatted markdown links.
 * Replaces [123] or [123-456] with [M:SS](timestamp://123) or [M:SS-M:SS](timestamp://123-456)
 */
function processTimestamps(content: string): string {
  return content.replace(/\[(\d+)(?:-(\d+))?\]/g, (match, start, end) => {
    const startSec = parseInt(start, 10);
    const endSec = end ? parseInt(end, 10) : null;

    // Format as MM:SS for display
    const label = endSec
      ? `${formatSecondsToTime(startSec)}-${formatSecondsToTime(endSec)}`
      : formatSecondsToTime(startSec);

    // Create markdown link with timestamp:// protocol
    const url = endSec
      ? `timestamp://${startSec}-${endSec}`
      : `timestamp://${startSec}`;

    return `[${label}](${url})`;
  });
}

export function MarkdownWithTimestamps({
  content,
  onSeekTo,
  variant = 'compact',
}: MarkdownWithTimestampsProps) {
  const markdownStyles = useMarkdownStyles(variant);

  // Pre-process content to convert timestamps to clickable links
  const processedContent = useMemo(() => processTimestamps(content), [content]);

  // Handle link presses - intercept timestamp:// links
  const handleLinkPress = (url: string): boolean => {
    if (url.startsWith('timestamp://')) {
      // Extract the start seconds from the URL
      const timeStr = url.replace('timestamp://', '');
      const seconds = parseInt(timeStr.split('-')[0], 10);
      if (!isNaN(seconds)) {
        onSeekTo(seconds);
      }
      return false; // Prevent default link handling
    }
    return true; // Allow other links to open normally
  };

  return (
    <Markdown style={markdownStyles} onLinkPress={handleLinkPress}>
      {processedContent}
    </Markdown>
  );
}
