import { mergeSegmentsIntoSentences } from '../transcript';

describe('mergeSegmentsIntoSentences', () => {
  it('returns empty array for empty input', () => {
    expect(mergeSegmentsIntoSentences([])).toEqual([]);
  });

  it('returns empty array for null/undefined input', () => {
    expect(mergeSegmentsIntoSentences(null as any)).toEqual([]);
    expect(mergeSegmentsIntoSentences(undefined as any)).toEqual([]);
  });

  it('keeps single segment with period as-is', () => {
    const segments = [{ text: 'Hello world.', start: 0, duration: 2 }];
    const result = mergeSegmentsIntoSentences(segments);

    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('Hello world.');
    expect(result[0].start).toBe(0);
    expect(result[0].duration).toBe(2);
  });

  it('merges multiple segments until period is found', () => {
    const segments = [
      { text: 'Hello', start: 0, duration: 1 },
      { text: 'world', start: 1, duration: 1 },
      { text: 'today.', start: 2, duration: 1 },
    ];
    const result = mergeSegmentsIntoSentences(segments);

    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('Hello world today.');
    expect(result[0].start).toBe(0);
    expect(result[0].duration).toBe(3); // 2 + 1 - 0
  });

  it('creates multiple merged segments for multiple sentences', () => {
    const segments = [
      { text: 'First sentence.', start: 0, duration: 2 },
      { text: 'Second', start: 2, duration: 1 },
      { text: 'sentence.', start: 3, duration: 1 },
    ];
    const result = mergeSegmentsIntoSentences(segments);

    expect(result).toHaveLength(2);
    expect(result[0].text).toBe('First sentence.');
    expect(result[1].text).toBe('Second sentence.');
  });

  it('handles exclamation mark as sentence ending', () => {
    const segments = [
      { text: 'Wow', start: 0, duration: 1 },
      { text: 'amazing!', start: 1, duration: 1 },
    ];
    const result = mergeSegmentsIntoSentences(segments);

    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('Wow amazing!');
  });

  it('handles question mark as sentence ending', () => {
    const segments = [
      { text: 'How are', start: 0, duration: 1 },
      { text: 'you?', start: 1, duration: 1 },
    ];
    const result = mergeSegmentsIntoSentences(segments);

    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('How are you?');
  });

  it('removes line breaks from segment text', () => {
    const segments = [
      { text: 'Hello\n', start: 0, duration: 1 },
      { text: 'world.\n', start: 1, duration: 1 },
    ];
    const result = mergeSegmentsIntoSentences(segments);

    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('Hello world.');
  });

  it('removes carriage returns from segment text', () => {
    const segments = [
      { text: 'Hello\r\n', start: 0, duration: 1 },
      { text: 'world.\r\n', start: 1, duration: 1 },
    ];
    const result = mergeSegmentsIntoSentences(segments);

    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('Hello world.');
  });

  it('skips empty segments after cleaning', () => {
    const segments = [
      { text: 'Hello', start: 0, duration: 1 },
      { text: '\n\n', start: 1, duration: 0.5 },
      { text: 'world.', start: 1.5, duration: 1 },
    ];
    const result = mergeSegmentsIntoSentences(segments);

    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('Hello world.');
  });

  it('includes remaining segment without punctuation at the end', () => {
    const segments = [
      { text: 'First sentence.', start: 0, duration: 2 },
      { text: 'No ending punctuation', start: 2, duration: 2 },
    ];
    const result = mergeSegmentsIntoSentences(segments);

    expect(result).toHaveLength(2);
    expect(result[0].text).toBe('First sentence.');
    expect(result[1].text).toBe('No ending punctuation');
  });

  it('calculates duration correctly for merged segments', () => {
    const segments = [
      { text: 'Part one', start: 10, duration: 3 },
      { text: 'part two', start: 13, duration: 2 },
      { text: 'part three.', start: 15, duration: 4 },
    ];
    const result = mergeSegmentsIntoSentences(segments);

    expect(result).toHaveLength(1);
    expect(result[0].start).toBe(10);
    // Duration should be: (15 + 4) - 10 = 9
    expect(result[0].duration).toBe(9);
  });

  it('trims whitespace from segment text', () => {
    const segments = [
      { text: '  Hello  ', start: 0, duration: 1 },
      { text: '  world.  ', start: 1, duration: 1 },
    ];
    const result = mergeSegmentsIntoSentences(segments);

    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('Hello world.');
  });
});
