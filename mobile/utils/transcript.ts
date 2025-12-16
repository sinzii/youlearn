import { TranscriptSegment } from '@/lib/api';

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
