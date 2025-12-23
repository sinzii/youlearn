/**
 * Native Intent Handler for expo-router
 *
 * This file intercepts deep links BEFORE expo-router tries to match them as routes.
 * It's specifically needed for expo-share-intent to prevent "Unmatched Route" errors.
 *
 * ## Share Intent Flow:
 * 1. User shares YouTube URL from Safari/YouTube app
 * 2. iOS Share Extension (Swift) stores URL in UserDefaults via App Group
 * 3. Extension redirects to: videoinsight://dataUrl=videoinsightShareKey#weburl
 * 4. THIS FILE intercepts that URL and returns "/" (home route)
 * 5. ShareIntentProvider (in _layout.tsx) processes the original URL in parallel
 * 6. useShareIntentHandler hook navigates to /videos/[id] with the extracted video ID
 *
 * Without this file, expo-router would try to match "dataUrl=videoinsightShareKey"
 * as a route path and show "Unmatched Route" error.
 *
 * @see https://docs.expo.dev/router/advanced/native-intent/
 * @see https://github.com/achorein/expo-share-intent
 */
export function redirectSystemPath({
  path,
  initial,
}: {
  path: string;
  initial: boolean;
}): string {
  try {
    // Intercept expo-share-intent URLs
    // The iOS Share Extension redirects with format: videoinsight://dataUrl=videoinsightShareKey#weburl
    // "videoinsightShareKey" is just a reference key - actual data is stored in UserDefaults
    if (path.includes('dataUrl=')) {
      // Return home route - ShareIntentProvider will handle the actual navigation
      // to /videos/[id] once it reads the shared content from UserDefaults
      return '/';
    }
    // For all other deep links, let expo-router handle them normally
    return path;
  } catch {
    // Fallback to home on any error to prevent crashes
    return '/';
  }
}
