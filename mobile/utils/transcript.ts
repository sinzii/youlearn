import { TranscriptSegment } from '@/lib/api';

/**
 * Convert transcript segments to plain text.
 */
export function segmentsToText(segments: TranscriptSegment[]): string {
  return segments.map((s) => s.text).join(' ');
}

/**
 * Timestamp reference extracted from LLM response text.
 */
export interface TimestampRef {
  start: number; // Start time in seconds
  end: number | null; // End time in seconds (null for single timestamp)
  original: string; // Original matched text, e.g., "[123-456]"
  index: number; // Index position in the original text
}

/**
 * Extract all timestamp references [start-end] from text.
 * Matches patterns like [123] or [123-456] where numbers are seconds.
 */
export function extractTimestampRefs(text: string): TimestampRef[] {
  // Pattern: [123] or [123-456] (seconds)
  const pattern = /\[(\d+)(?:-(\d+))?\]/g;
  const refs: TimestampRef[] = [];
  let match;

  while ((match = pattern.exec(text)) !== null) {
    refs.push({
      start: parseInt(match[1], 10),
      end: match[2] ? parseInt(match[2], 10) : null,
      original: match[0],
      index: match.index,
    });
  }
  return refs;
}

/**
 * Format seconds to display as M:SS or MM:SS.
 */
export function formatSecondsToTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Merge small transcript segments into complete sentences.
 * Segments are merged until a sentence-ending punctuation (. ! ?) is found.
 */
export function mergeSegmentsIntoSentences(
  segments: TranscriptSegment[]
): TranscriptSegment[] {
  if (!segments || segments.length === 0) return [];

  const merged: TranscriptSegment[] = [];
  let currentSegment: TranscriptSegment | null = null;

  // Sentence-ending punctuation pattern
  const sentenceEndPattern = /[.!?]$/;

  for (const segment of segments) {
    // Remove line breaks and extra whitespace
    const cleanedText = segment.text.replace(/[\r\n]+/g, ' ').trim();
    if (!cleanedText) continue;

    if (!currentSegment) {
      // Start a new merged segment
      currentSegment = {
        text: cleanedText,
        start: segment.start,
        duration: segment.duration,
      };
    } else {
      // Append to current segment
      currentSegment.text += ' ' + cleanedText;
      currentSegment.duration =
        segment.start + segment.duration - currentSegment.start;
    }

    // Check if current segment ends with sentence-ending punctuation
    if (sentenceEndPattern.test(cleanedText)) {
      merged.push(currentSegment);
      currentSegment = null;
    }
  }

  // Don't forget any remaining segment that didn't end with punctuation
  if (currentSegment) {
    merged.push(currentSegment);
  }

  return merged;
}
