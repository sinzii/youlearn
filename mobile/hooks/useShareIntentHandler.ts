import { useEffect } from 'react';
import { useShareIntent } from 'expo-share-intent';
import { useRouter } from 'expo-router';

import { extractVideoId } from '@/utils/youtube';

/**
 * Hook to handle shared YouTube URLs from other apps.
 * When a user shares a YouTube URL to the app, this hook extracts the video ID
 * and navigates to the video details screen.
 */
export function useShareIntentHandler() {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();
  const router = useRouter();

  useEffect(() => {
    if (hasShareIntent && shareIntent) {
      // Try to get URL from webUrl first, then fall back to text
      const sharedContent = shareIntent.webUrl || shareIntent.text;

      if (sharedContent) {
        const videoId = extractVideoId(sharedContent);

        if (videoId) {
          // Navigate to the video details screen
          router.push({ pathname: '/videos/[id]', params: { id: videoId } });
          // Reset the share intent so it doesn't trigger again
          resetShareIntent();
        }
      }
    }
  }, [hasShareIntent, shareIntent, router, resetShareIntent]);
}
