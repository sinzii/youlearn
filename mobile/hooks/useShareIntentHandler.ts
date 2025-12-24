import { useEffect } from 'react';
import { useShareIntent } from 'expo-share-intent';
import { useNavigationContainerRef } from 'expo-router';
import { CommonActions } from '@react-navigation/native';

import { extractVideoId } from '@/utils/youtube';

/**
 * Hook to handle shared YouTube URLs from other apps.
 * When a user shares a YouTube URL to the app, this hook extracts the video ID
 * and navigates to the video details screen with home in the back history.
 */
export function useShareIntentHandler() {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();
  const navigationRef = useNavigationContainerRef();

  useEffect(() => {
    if (hasShareIntent && shareIntent) {
      // Try to get URL from webUrl first, then fall back to text
      const sharedContent = shareIntent.webUrl || shareIntent.text;

      if (sharedContent) {
        const videoId = extractVideoId(sharedContent);

        if (videoId) {
          // Reset navigation state with home in history, video detail as current
          // This gives us: [Home, VideoDetail] with VideoDetail active
          // The native back button will work and go to home
          navigationRef.dispatch(
            CommonActions.reset({
              index: 1,
              routes: [
                { name: '(tabs)' },
                { name: 'videos/[id]', params: { id: videoId } },
              ],
            })
          );
          // Reset the share intent so it doesn't trigger again
          resetShareIntent();
        }
      }
    }
  }, [hasShareIntent, shareIntent, navigationRef, resetShareIntent]);
}
